/**
 * NotesRoom: el "cuarto" compartido de los dos (un único Durable Object).
 * - Guarda notitas, dibujos y suscripciones push en su SQLite.
 * - WebSockets con hibernación: mientras nadie escribe, no consume nada.
 * - Reenvía al instante cada notita, corazón, borrado y "está escribiendo…".
 * - Si la otra persona no tiene la página abierta, le manda una notificación push.
 * - Avisos del mesiversario (los dispara el cron del Worker: ver monthiversary.ts).
 */
import { DurableObject } from 'cloudflare:workers'
import {
  LIMITS,
  NOTE_COLORS,
  otherAuthor,
  type Activity,
  type Author,
  type ClientMessage,
  type NewNote,
  type Note,
  type NoteColor,
  type Presence,
  type PushPayload,
  type ServerMessage,
} from '../../src/features/notes/protocol'
import { config } from '../../src/data/config'
import { reminderMessage, reminderSettings } from '../../src/data/reminders'
import { sendWebPush, type PushOptions, type VapidKeys } from './webpush'
import { dueReminders, type ReminderSchedule } from './monthiversary'
import type { WorkerEnv } from './env'

/** Nombre del único cuarto (los dos comparten el mismo). */
export const ROOM_NAME = 'nosotros'

export const REMINDER_SCHEDULE: ReminderSchedule = { startDate: config.startDate, ...reminderSettings }

/** Cuánto espera el servicio push si el celular está apagado: el aviso de "mañana" caduca a medianoche. */
const REMINDER_TTL = { eve: 3 * 3600, day: 12 * 3600 } as const

interface Attachment {
  author: Author
  /** La página está visible en ese dispositivo. */
  visible: boolean
}

interface NoteRow extends Record<string, SqlStorageValue> {
  id: string
  author: string
  kind: string
  text: string
  color: string
  image_id: string | null
  image_w: number | null
  image_h: number | null
  hearted: number
  created_at: number
}

interface SubRow extends Record<string, SqlStorageValue> {
  endpoint: string
  author: string
  p256dh: string
  auth: string
}

const OPEN = 1
const DATA_URL = /^data:(image\/(?:png|webp|jpeg));base64,([A-Za-z0-9+/]+={0,2})$/

const isAuthor = (v: unknown): v is Author => v === 'her' || v === 'him'
const isColor = (v: unknown): v is NoteColor => typeof v === 'string' && (NOTE_COLORS as readonly string[]).includes(v)
const clampInt = (v: unknown, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.round(typeof v === 'number' && Number.isFinite(v) ? v : min)))

function toNote(r: NoteRow): Note {
  return {
    id: r.id,
    author: r.author as Author,
    kind: r.kind === 'drawing' ? 'drawing' : 'text',
    text: r.text,
    color: isColor(r.color) ? r.color : 'cream',
    image: r.image_id ? { id: r.image_id, w: r.image_w ?? 720, h: r.image_h ?? 720 } : null,
    hearted: r.hearted === 1,
    createdAt: r.created_at,
  }
}

function decodeBase64(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export class NotesRoom extends DurableObject<WorkerEnv> {
  private sql: SqlStorage

  constructor(ctx: DurableObjectState, env: WorkerEnv) {
    super(ctx, env)
    this.sql = ctx.storage.sql
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        author TEXT NOT NULL,
        kind TEXT NOT NULL,
        text TEXT NOT NULL DEFAULT '',
        color TEXT NOT NULL DEFAULT 'cream',
        image_id TEXT,
        image_w INTEGER,
        image_h INTEGER,
        hearted INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS notes_created ON notes (created_at);
      CREATE TABLE IF NOT EXISTS images (id TEXT PRIMARY KEY, mime TEXT NOT NULL, data BLOB NOT NULL);
      CREATE TABLE IF NOT EXISTS subs (
        endpoint TEXT PRIMARY KEY,
        author TEXT NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS seen (author TEXT PRIMARY KEY, at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS reminders (key TEXT PRIMARY KEY, sent_at INTEGER NOT NULL);
    `)
    // Latido: responde "pong" sin despertar al objeto.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'))
  }

  // ---------------------------------------------------------------------------
  // HTTP (el Worker ya validó la clave y el origen)
  // ---------------------------------------------------------------------------
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/ws') {
      const author = url.searchParams.get('author')
      if (!isAuthor(author)) return new Response('author inválido', { status: 400 })
      const pair = new WebSocketPair()
      const [client, server] = [pair[0], pair[1]]
      this.ctx.acceptWebSocket(server, [author])
      server.serializeAttachment({ author, visible: true } satisfies Attachment)
      this.send(server, {
        t: 'hello',
        you: author,
        notes: this.recentNotes(),
        presence: this.presence(),
        vapidKey: this.vapid()?.publicKey ?? null,
        seen: this.seenAt(author),
      })
      this.broadcast({ t: 'presence', presence: this.presence() }, server)
      return new Response(null, { status: 101, webSocket: client })
    }

    const img = /^\/img\/([\w-]+)$/.exec(url.pathname)
    if (img) {
      const row = this.sql.exec<{ mime: string; data: ArrayBuffer }>('SELECT mime, data FROM images WHERE id = ?', img[1]).toArray()[0]
      if (!row) return new Response('No existe', { status: 404 })
      return new Response(row.data, {
        headers: {
          'Content-Type': row.mime,
          // El id es aleatorio e inmutable: se puede guardar para siempre (solo en el dispositivo).
          'Cache-Control': 'private, max-age=31536000, immutable',
          'X-Content-Type-Options': 'nosniff',
        },
      })
    }

    return new Response('No encontrado', { status: 404 })
  }

  // ---------------------------------------------------------------------------
  // WebSocket
  // ---------------------------------------------------------------------------
  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    const me = ws.deserializeAttachment() as Attachment | null
    if (!me || typeof raw !== 'string') return
    let msg: ClientMessage
    try {
      msg = JSON.parse(raw) as ClientMessage
    } catch {
      return
    }

    switch (msg.t) {
      case 'add':
        await this.addNote(ws, me.author, msg.note, msg.pushTitle)
        break
      case 'del':
        this.deleteNote(me.author, msg.id)
        break
      case 'heart':
        this.heartNote(me.author, msg.id, msg.on === true)
        break
      case 'act': {
        const a: Activity = msg.a === 'typing' || msg.a === 'drawing' ? msg.a : null
        this.broadcast({ t: 'act', author: me.author, a }, ws)
        break
      }
      case 'vis':
        ws.serializeAttachment({ ...me, visible: msg.v === true } satisfies Attachment)
        break
      case 'seen':
        if (typeof msg.at === 'number' && Number.isFinite(msg.at)) {
          this.sql.exec(
            'INSERT INTO seen (author, at) VALUES (?, ?) ON CONFLICT(author) DO UPDATE SET at = MAX(at, excluded.at)',
            me.author,
            Math.min(Date.now(), Math.round(msg.at)),
          )
        }
        break
      case 'sub':
        this.subscribe(ws, me.author, msg.sub)
        break
      case 'unsub':
        if (typeof msg.endpoint === 'string') this.sql.exec('DELETE FROM subs WHERE endpoint = ?', msg.endpoint)
        break
    }
  }

  async webSocketClose(ws: WebSocket, code: number): Promise<void> {
    try {
      ws.close(code >= 1000 && code < 1004 ? code : 1000, 'adiós')
    } catch {
      /* ya estaba cerrado */
    }
    this.broadcast({ t: 'presence', presence: this.presence(ws) }, ws)
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    this.broadcast({ t: 'presence', presence: this.presence(ws) }, ws)
  }

  // ---------------------------------------------------------------------------
  // Acciones
  // ---------------------------------------------------------------------------
  private async addNote(ws: WebSocket, author: Author, input: NewNote | undefined, pushTitle: unknown) {
    const tempId = typeof input?.tempId === 'string' ? input.tempId.slice(0, 64) : undefined
    const fail = (message: string) => this.send(ws, { t: 'error', message, tempId })
    if (!input || (input.kind !== 'text' && input.kind !== 'drawing')) return fail('Notita inválida')

    const text = typeof input.text === 'string' ? input.text.trim().slice(0, LIMITS.text) : ''
    const color: NoteColor = isColor(input.color) ? input.color : 'cream'
    let image: { id: string; w: number; h: number } | null = null

    if (input.kind === 'text' && !text) return fail('La notita está vacía')
    if (input.kind === 'drawing') {
      const data = input.image?.data
      if (typeof data !== 'string' || data.length > LIMITS.imageDataUrl) return fail('El dibujo es demasiado grande')
      const m = DATA_URL.exec(data)
      if (!m) return fail('Formato de dibujo no válido')
      const bytes = decodeBase64(m[2])
      image = { id: crypto.randomUUID(), w: clampInt(input.image?.w, 16, 4096), h: clampInt(input.image?.h, 16, 4096) }
      this.sql.exec('INSERT INTO images (id, mime, data) VALUES (?, ?, ?)', image.id, m[1], bytes.buffer)
    }

    const note: Note = {
      id: crypto.randomUUID(),
      author,
      kind: input.kind,
      text,
      color,
      image,
      hearted: false,
      createdAt: Date.now(),
    }
    this.sql.exec(
      'INSERT INTO notes (id, author, kind, text, color, image_id, image_w, image_h, hearted, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)',
      note.id,
      note.author,
      note.kind,
      note.text,
      note.color,
      image?.id ?? null,
      image?.w ?? null,
      image?.h ?? null,
      note.createdAt,
    )

    this.send(ws, { t: 'added', note, tempId })
    this.broadcast({ t: 'added', note }, ws)

    const title =
      typeof pushTitle === 'string' && pushTitle.trim() ? pushTitle.trim().slice(0, LIMITS.pushTitle) : 'Nueva notita 💌'
    const body = note.kind === 'drawing' ? text || 'Toca para verlo 💕' : text
    await this.notify(otherAuthor(author), title, body.length > 140 ? `${body.slice(0, 139)}…` : body)
  }

  private deleteNote(author: Author, id: unknown) {
    if (typeof id !== 'string') return
    const row = this.sql.exec<NoteRow>('SELECT * FROM notes WHERE id = ?', id).toArray()[0]
    if (!row || row.author !== author) return // solo se borran las propias
    if (row.image_id) this.sql.exec('DELETE FROM images WHERE id = ?', row.image_id)
    this.sql.exec('DELETE FROM notes WHERE id = ?', id)
    this.broadcast({ t: 'deleted', id })
  }

  private heartNote(author: Author, id: unknown, on: boolean) {
    if (typeof id !== 'string') return
    const row = this.sql.exec<NoteRow>('SELECT * FROM notes WHERE id = ?', id).toArray()[0]
    if (!row || row.author === author) return // el corazón lo da la otra persona
    this.sql.exec('UPDATE notes SET hearted = ? WHERE id = ?', on ? 1 : 0, id)
    this.broadcast({ t: 'hearted', id, on })
  }

  private subscribe(ws: WebSocket, author: Author, sub: unknown) {
    const s = sub as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null
    const endpoint = typeof s?.endpoint === 'string' ? s.endpoint : ''
    const p256dh = typeof s?.keys?.p256dh === 'string' ? s.keys.p256dh : ''
    const auth = typeof s?.keys?.auth === 'string' ? s.keys.auth : ''
    let ok = false
    try {
      const u = new URL(endpoint)
      ok = u.protocol === 'https:' || (this.env.ALLOW_INSECURE_PUSH === '1' && u.protocol === 'http:')
    } catch {
      ok = false
    }
    if (!ok || !p256dh || !auth || endpoint.length > 2048) {
      this.send(ws, { t: 'error', message: 'Suscripción push inválida' })
      return
    }
    this.sql.exec(
      `INSERT INTO subs (endpoint, author, p256dh, auth, created_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(endpoint) DO UPDATE SET author = excluded.author, p256dh = excluded.p256dh, auth = excluded.auth`,
      endpoint,
      author,
      p256dh,
      auth,
      Date.now(),
    )
    this.send(ws, { t: 'subbed', endpoint })
  }

  /** Notificación push para `to`, salvo que tenga la página abierta y visible. */
  private async notify(to: Author, title: string, body: string) {
    if (!this.vapid()) return
    const watching = this.ctx.getWebSockets(to).some((ws) => {
      const a = ws.deserializeAttachment() as Attachment | null
      return ws.readyState === OPEN && a?.visible
    })
    if (watching) return

    const unread = this.sql
      .exec<{ n: number }>('SELECT COUNT(*) AS n FROM notes WHERE author = ? AND created_at > ?', otherAuthor(to), this.seenAt(to))
      .one().n
    await this.pushTo(to, { title, body, badge: unread, url: './#/notas', tag: 'notitas' }, { topic: 'notitas', urgency: 'high' })
  }

  /**
   * Avisos del mesiversario (el día antes y el mismo día) para los dos.
   * La llama el cron del Worker cada hora; cada aviso sale una sola vez.
   * Devuelve cuántas notificaciones aceptó el servicio push.
   */
  async sendReminders(nowMs: number): Promise<number> {
    if (!this.vapid()) return 0
    let sent = 0
    for (const due of dueReminders(nowMs, REMINDER_SCHEDULE)) {
      if (this.sql.exec('SELECT 1 FROM reminders WHERE key = ?', due.key).toArray().length) continue
      this.sql.exec('INSERT INTO reminders (key, sent_at) VALUES (?, ?)', due.key, Date.now())
      for (const to of ['her', 'him'] as const) {
        const { title, body, url } = reminderMessage(due.kind, to, due.months)
        // Sin `badge`: el globito del ícono es solo para notitas sin leer.
        sent += await this.pushTo(to, { title, body, url, tag: 'mesiversario' }, { topic: 'mesiversario', urgency: 'high', ttl: REMINDER_TTL[due.kind] })
      }
    }
    return sent
  }

  /** Manda `payload` a todos los dispositivos de `to` y borra las suscripciones vencidas. Devuelve cuántos lo aceptaron. */
  private async pushTo(to: Author, payload: PushPayload, opts: PushOptions): Promise<number> {
    const vapid = this.vapid()
    if (!vapid) return 0
    const subs = this.sql.exec<SubRow>('SELECT endpoint, author, p256dh, auth FROM subs WHERE author = ?', to).toArray()
    const json = JSON.stringify(payload)
    const ok = await Promise.all(
      subs.map(async (s) => {
        try {
          const res = await sendWebPush(s, json, vapid, opts)
          if (res.status === 404 || res.status === 410) {
            this.sql.exec('DELETE FROM subs WHERE endpoint = ?', s.endpoint) // suscripción vencida
          } else if (!res.ok) {
            console.warn('push', res.status, (await res.text()).slice(0, 200))
          }
          return res.ok
        } catch (err) {
          console.warn('push error', err)
          return false
        }
      }),
    )
    return ok.filter(Boolean).length
  }

  // ---------------------------------------------------------------------------
  // Utilidades
  // ---------------------------------------------------------------------------
  private vapid(): VapidKeys | null {
    const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = this.env
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return null
    const fallback = (this.env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).find((s) => s.startsWith('https://'))
    return { publicKey: VAPID_PUBLIC_KEY, privateKey: VAPID_PRIVATE_KEY, subject: this.env.VAPID_SUBJECT || fallback || 'mailto:notitas@localhost.invalid' }
  }

  private recentNotes(): Note[] {
    return this.sql
      .exec<NoteRow>('SELECT * FROM notes ORDER BY created_at DESC LIMIT ?', LIMITS.history)
      .toArray()
      .map(toNote)
  }

  private seenAt(author: Author): number {
    return this.sql.exec<{ at: number }>('SELECT at FROM seen WHERE author = ?', author).toArray()[0]?.at ?? 0
  }

  private presence(exclude?: WebSocket): Presence {
    const p: Presence = { her: false, him: false }
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === exclude || ws.readyState !== OPEN) continue
      const a = ws.deserializeAttachment() as Attachment | null
      if (a) p[a.author] = true
    }
    return p
  }

  private send(ws: WebSocket, msg: ServerMessage) {
    try {
      ws.send(JSON.stringify(msg))
    } catch {
      /* conexión cerrándose */
    }
  }

  private broadcast(msg: ServerMessage, except?: WebSocket) {
    const data = JSON.stringify(msg)
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === except || ws.readyState !== OPEN) continue
      try {
        ws.send(data)
      } catch {
        /* conexión cerrándose */
      }
    }
  }
}
