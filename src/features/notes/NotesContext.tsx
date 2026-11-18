/**
 * Estado de las notitas compartidas + conexión en tiempo real (WebSocket).
 * ---------------------------------------------------------------------------
 * - Se conecta al entrar a la historia y se reconecta solo (con espera
 *   creciente) si se cae la red o el celular bloquea la pantalla.
 * - Lo que envías aparece al instante (optimista) y se confirma con el servidor.
 * - Avisa al servidor si la página está visible: así no manda una
 *   notificación push a quien ya está mirando.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { local, STORAGE_KEYS } from '../../lib/storage'
import { authorLabel, notesEnabled, wsUrl } from './config'
import { clearBadge, currentSubscription, permission } from './push'
import {
  otherAuthor,
  type Activity,
  type Author,
  type ClientMessage,
  type NewNote,
  type Note,
  type Presence,
  type PushSub,
  type ServerMessage,
} from './protocol'

export type ConnStatus = 'disabled' | 'connecting' | 'online' | 'offline'

export interface LocalNote extends Note {
  /** Enviada pero aún sin confirmar. */
  pending?: boolean
  /** Dibujo local (data URL) para mostrarlo sin esperar la descarga. */
  localImage?: string
}

export type NoteInput = Omit<NewNote, 'tempId'>

export interface NotesContextValue {
  enabled: boolean
  status: ConnStatus
  /** Quién escribe en este dispositivo. */
  me: Author
  setMe: (a: Author) => void
  notes: LocalNote[]
  presence: Presence
  /** Lo que está haciendo la otra persona ahora mismo. */
  otherActivity: Activity
  vapidKey: string | null
  /** Notitas de la otra persona que aún no viste. */
  unread: number
  send: (input: NoteInput) => Promise<void>
  remove: (id: string) => void
  heart: (id: string, on: boolean) => void
  setActivity: (a: Activity) => void
  markSeen: () => void
  sendSubscription: (sub: PushSub) => Promise<void>
  sendUnsubscribe: (endpoint: string) => void
}

const noop = () => undefined
const DISABLED: NotesContextValue = {
  enabled: false,
  status: 'disabled',
  me: 'her',
  setMe: noop,
  notes: [],
  presence: { her: false, him: false },
  otherActivity: null,
  vapidKey: null,
  unread: 0,
  send: () => Promise.reject(new Error('Las notitas no están configuradas')),
  remove: noop,
  heart: noop,
  setActivity: noop,
  markSeen: noop,
  sendSubscription: () => Promise.reject(new Error('Las notitas no están configuradas')),
  sendUnsubscribe: noop,
}

const NotesContext = createContext<NotesContextValue>(DISABLED)

const BACKOFF = [1000, 2000, 4000, 8000, 15_000, 30_000]
const SEND_TIMEOUT = 20_000
const ACTIVITY_TTL = 8000

const byNewest = (a: Note, b: Note) => b.createdAt - a.createdAt

interface Waiter {
  resolve: () => void
  reject: (err: Error) => void
  timer: number
}

function pushTitle(me: Author, kind: Note['kind']): string {
  const who = authorLabel(me)
  return kind === 'drawing' ? `✏️ ${who} te hizo un dibujito` : `💌 ${who} te dejó una notita`
}

export function NotesProvider({ children }: { children: ReactNode }) {
  if (!notesEnabled) return <>{children}</>
  return <LiveNotesProvider>{children}</LiveNotesProvider>
}

function LiveNotesProvider({ children }: { children: ReactNode }) {
  const [me, setMeState] = useState<Author>(() => (local.get(STORAGE_KEYS.author) === 'him' ? 'him' : 'her'))
  const [status, setStatus] = useState<ConnStatus>('connecting')
  const [notes, setNotes] = useState<LocalNote[]>([])
  const [presence, setPresence] = useState<Presence>({ her: false, him: false })
  const [activity, setActivityState] = useState<{ a: Activity; at: number }>({ a: null, at: 0 })
  const [vapidKey, setVapidKey] = useState<string | null>(null)
  const [seenAt, setSeenAt] = useState<number>(() => Number(local.get(STORAGE_KEYS.notesSeen)) || 0)

  const wsRef = useRef<WebSocket | null>(null)
  const pending = useRef(new Map<string, Waiter>())
  const subWaiters = useRef(new Map<string, Waiter>())
  const lastAct = useRef<{ a: Activity; at: number }>({ a: null, at: 0 })

  const sendRaw = useCallback((msg: ClientMessage): boolean => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return false
    ws.send(JSON.stringify(msg))
    return true
  }, [])

  // ---- Conexión ------------------------------------------------------------
  useEffect(() => {
    let disposed = false
    let attempt = 0
    let retryTimer = 0

    const failAll = (map: Map<string, Waiter>, message: string) => {
      for (const [, w] of map) {
        window.clearTimeout(w.timer)
        w.reject(new Error(message))
      }
      map.clear()
    }

    const handle = (m: ServerMessage) => {
      switch (m.t) {
        case 'hello':
          setNotes(m.notes.slice().sort(byNewest))
          setPresence(m.presence)
          setVapidKey(m.vapidKey)
          setSeenAt((prev) => Math.max(prev, m.seen))
          setStatus('online')
          break
        case 'added': {
          const waiter = m.tempId ? pending.current.get(m.tempId) : undefined
          setNotes((prev) => {
            const optimistic = m.tempId ? prev.find((n) => n.id === m.tempId) : undefined
            const rest = prev.filter((n) => n.id !== m.note.id && n.id !== m.tempId)
            const note: LocalNote = optimistic?.localImage ? { ...m.note, localImage: optimistic.localImage } : m.note
            return [note, ...rest].sort(byNewest)
          })
          if (m.note.author !== me) setActivityState({ a: null, at: 0 })
          if (waiter && m.tempId) {
            window.clearTimeout(waiter.timer)
            pending.current.delete(m.tempId)
            waiter.resolve()
          }
          break
        }
        case 'deleted':
          setNotes((prev) => prev.filter((n) => n.id !== m.id))
          break
        case 'hearted':
          setNotes((prev) => prev.map((n) => (n.id === m.id ? { ...n, hearted: m.on } : n)))
          break
        case 'presence':
          setPresence(m.presence)
          if (!m.presence[otherAuthor(me)]) setActivityState({ a: null, at: 0 })
          break
        case 'act':
          if (m.author !== me) setActivityState({ a: m.a, at: Date.now() })
          break
        case 'subbed': {
          const w = subWaiters.current.get(m.endpoint)
          if (w) {
            window.clearTimeout(w.timer)
            subWaiters.current.delete(m.endpoint)
            w.resolve()
          }
          break
        }
        case 'error': {
          if (m.tempId) {
            const w = pending.current.get(m.tempId)
            setNotes((prev) => prev.filter((n) => n.id !== m.tempId))
            if (w) {
              window.clearTimeout(w.timer)
              pending.current.delete(m.tempId)
              w.reject(new Error(m.message))
            }
          } else if (/push/i.test(m.message)) {
            failAll(subWaiters.current, m.message)
          }
          break
        }
      }
    }

    const sendVisibility = () => {
      const ws = wsRef.current
      if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ t: 'vis', v: document.visibilityState === 'visible' }))
    }

    const scheduleRetry = () => {
      if (disposed) return
      const delay = BACKOFF[Math.min(attempt, BACKOFF.length - 1)]
      attempt++
      retryTimer = window.setTimeout(connect, delay)
    }

    function connect() {
      if (disposed) return
      window.clearTimeout(retryTimer)
      setStatus((s) => (s === 'online' ? 'connecting' : s))
      let ws: WebSocket
      try {
        ws = new WebSocket(wsUrl(me))
      } catch {
        setStatus('offline')
        scheduleRetry()
        return
      }
      wsRef.current = ws
      ws.onopen = () => {
        attempt = 0
        sendVisibility()
      }
      ws.onmessage = (e: MessageEvent) => {
        if (e.data === 'pong' || typeof e.data !== 'string') return
        try {
          handle(JSON.parse(e.data) as ServerMessage)
        } catch {
          /* mensaje inválido */
        }
      }
      ws.onclose = () => {
        if (wsRef.current === ws) wsRef.current = null
        if (disposed) return
        setStatus('offline')
        setPresence({ her: false, him: false })
        failAll(pending.current, 'Se perdió la conexión. Inténtalo de nuevo.')
        failAll(subWaiters.current, 'Se perdió la conexión.')
        scheduleRetry()
      }
    }

    const reconnectNow = () => {
      if (disposed) return
      const ws = wsRef.current
      if (!ws || ws.readyState === WebSocket.CLOSING || ws.readyState === WebSocket.CLOSED) {
        attempt = 0
        connect()
      }
    }
    const onVisibility = () => {
      sendVisibility()
      if (document.visibilityState === 'visible') reconnectNow()
    }
    // Latido: mantiene viva la conexión en redes móviles que cortan lo inactivo.
    const ping = window.setInterval(() => {
      const ws = wsRef.current
      if (ws?.readyState === WebSocket.OPEN && document.visibilityState === 'visible') ws.send('ping')
    }, 25_000)

    connect()
    window.addEventListener('online', reconnectNow)
    document.addEventListener('visibilitychange', onVisibility)
    const pendingMap = pending.current
    const subMap = subWaiters.current
    return () => {
      disposed = true
      window.clearTimeout(retryTimer)
      window.clearInterval(ping)
      window.removeEventListener('online', reconnectNow)
      document.removeEventListener('visibilitychange', onVisibility)
      failAll(pendingMap, 'Conexión cerrada')
      failAll(subMap, 'Conexión cerrada')
      wsRef.current?.close(1000)
      wsRef.current = null
    }
  }, [me])

  // "Está escribiendo…" se apaga solo si la otra persona deja de avisar.
  useEffect(() => {
    if (!activity.a) return
    const t = window.setTimeout(() => setActivityState({ a: null, at: 0 }), ACTIVITY_TTL)
    return () => window.clearTimeout(t)
  }, [activity])

  // ---- Acciones ------------------------------------------------------------
  const setMe = useCallback((a: Author) => {
    local.set(STORAGE_KEYS.author, a)
    local.remove(STORAGE_KEYS.notesSeen)
    setSeenAt(0)
    setNotes([])
    setMeState(a)
  }, [])

  const send = useCallback(
    (input: NoteInput) =>
      new Promise<void>((resolve, reject) => {
        const tempId = `tmp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
        const ok = sendRaw({ t: 'add', note: { ...input, tempId }, pushTitle: pushTitle(me, input.kind) })
        if (!ok) {
          reject(new Error('Sin conexión. Revisa tu internet e inténtalo de nuevo.'))
          return
        }
        const optimistic: LocalNote = {
          id: tempId,
          author: me,
          kind: input.kind,
          text: input.text?.trim() ?? '',
          color: input.color,
          image: input.image ? { id: '', w: input.image.w, h: input.image.h } : null,
          hearted: false,
          createdAt: Date.now(),
          pending: true,
          localImage: input.image?.data,
        }
        setNotes((prev) => [optimistic, ...prev])
        const timer = window.setTimeout(() => {
          pending.current.delete(tempId)
          setNotes((prev) => prev.filter((n) => n.id !== tempId))
          reject(new Error('No se pudo enviar. Inténtalo de nuevo.'))
        }, SEND_TIMEOUT)
        pending.current.set(tempId, { resolve, reject, timer })
      }),
    [me, sendRaw],
  )

  const remove = useCallback((id: string) => void sendRaw({ t: 'del', id }), [sendRaw])

  const heart = useCallback(
    (id: string, on: boolean) => {
      if (sendRaw({ t: 'heart', id, on })) setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, hearted: on } : n)))
    },
    [sendRaw],
  )

  const setActivity = useCallback(
    (a: Activity) => {
      const now = Date.now()
      const last = lastAct.current
      if (a === last.a && (a === null || now - last.at < 3000)) return
      if (sendRaw({ t: 'act', a })) lastAct.current = { a, at: now }
    },
    [sendRaw],
  )

  const markSeen = useCallback(() => {
    clearBadge()
    const latest = notes.reduce((mx, n) => (n.author !== me && !n.pending ? Math.max(mx, n.createdAt) : mx), 0)
    if (latest <= seenAt) return
    setSeenAt(latest)
    local.set(STORAGE_KEYS.notesSeen, String(latest))
    sendRaw({ t: 'seen', at: latest })
  }, [notes, me, seenAt, sendRaw])

  const sendSubscription = useCallback(
    (sub: PushSub) =>
      new Promise<void>((resolve, reject) => {
        if (!sendRaw({ t: 'sub', sub })) {
          reject(new Error('Sin conexión'))
          return
        }
        const timer = window.setTimeout(() => {
          subWaiters.current.delete(sub.endpoint)
          reject(new Error('El servidor no respondió'))
        }, 10_000)
        subWaiters.current.set(sub.endpoint, { resolve, reject, timer })
      }),
    [sendRaw],
  )

  const sendUnsubscribe = useCallback((endpoint: string) => void sendRaw({ t: 'unsub', endpoint }), [sendRaw])

  // Al conectarse, reenvía la suscripción push de este dispositivo (si la hay):
  // mantiene al servidor al día aunque haya descartado una vencida o cambie el autor.
  useEffect(() => {
    if (status !== 'online') return
    let alive = true
    void (async () => {
      try {
        if (permission() !== 'granted') return
        const sub = await currentSubscription()
        if (alive && sub) await sendSubscription(sub.toJSON() as PushSub)
      } catch {
        /* sin push en este dispositivo */
      }
    })()
    return () => {
      alive = false
    }
  }, [status, me, sendSubscription])

  const unread = useMemo(
    () => notes.filter((n) => n.author !== me && !n.pending && n.createdAt > seenAt).length,
    [notes, me, seenAt],
  )

  const value = useMemo<NotesContextValue>(
    () => ({
      enabled: true,
      status,
      me,
      setMe,
      notes,
      presence,
      otherActivity: activity.a,
      vapidKey,
      unread,
      send,
      remove,
      heart,
      setActivity,
      markSeen,
      sendSubscription,
      sendUnsubscribe,
    }),
    [status, me, setMe, notes, presence, activity.a, vapidKey, unread, send, remove, heart, setActivity, markSeen, sendSubscription, sendUnsubscribe],
  )

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotes(): NotesContextValue {
  return useContext(NotesContext)
}
