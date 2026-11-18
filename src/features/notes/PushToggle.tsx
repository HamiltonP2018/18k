/**
 * "Avísame cuando me dejes una notita": activa/desactiva las notificaciones
 * push en este dispositivo. En iPhone pide instalar la app primero.
 */
import { useEffect, useState } from 'react'
import { Bell, BellOff, BellRing, Loader2 } from 'lucide-react'
import { Button } from '../../components/Button'
import { useNotes } from './NotesContext'
import { authorInSentence } from './config'
import { otherAuthor, type PushSub } from './protocol'
import { currentSubscription, permission, pushSupport, subscribePush, unsubscribePush } from './push'
import styles from './PushToggle.module.css'

type State = 'checking' | 'off' | 'on' | 'working' | 'denied'

export function PushToggle() {
  const { vapidKey, me, status, sendSubscription, sendUnsubscribe } = useNotes()
  const support = pushSupport()
  const [state, setState] = useState<State>('checking')
  const [error, setError] = useState<string | null>(null)
  const other = authorInSentence(otherAuthor(me))

  useEffect(() => {
    if (support !== 'ok') return
    let alive = true
    void currentSubscription()
      .then((sub) => {
        if (!alive) return
        if (permission() === 'denied') setState('denied')
        else setState(sub && permission() === 'granted' ? 'on' : 'off')
      })
      .catch(() => alive && setState('off'))
    return () => {
      alive = false
    }
  }, [support])

  if (support === 'unsupported') return null

  if (support === 'needs-install') {
    return (
      <div className={styles.row}>
        <Bell className={styles.icon} aria-hidden strokeWidth={1.6} />
        <div className={styles.copy}>
          <p className={styles.title}>Avisos de notitas nuevas</p>
          <p className={styles.text}>En iPhone, primero instala la app (abajo) y ábrela desde su ícono. Ahí podrás activarlos.</p>
        </div>
      </div>
    )
  }

  if (!vapidKey) return null // el servidor no tiene avisos configurados

  const enable = async () => {
    setError(null)
    setState('working')
    try {
      const sub = await subscribePush(vapidKey) // primero el permiso, dentro del toque
      await sendSubscription(sub.toJSON() as PushSub)
      setState('on')
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg === 'denied') setState('denied')
      else {
        setState('off')
        if (msg !== 'dismissed') setError('No se pudieron activar. Inténtalo otra vez.')
      }
    }
  }

  const disable = async () => {
    setError(null)
    setState('working')
    try {
      const endpoint = await unsubscribePush()
      if (endpoint) sendUnsubscribe(endpoint)
    } finally {
      setState('off')
    }
  }

  return (
    <div className={styles.row}>
      {state === 'on' ? (
        <BellRing className={styles.icon} aria-hidden strokeWidth={1.6} />
      ) : state === 'denied' ? (
        <BellOff className={styles.icon} aria-hidden strokeWidth={1.6} />
      ) : (
        <Bell className={styles.icon} aria-hidden strokeWidth={1.6} />
      )}
      <div className={styles.copy}>
        <p className={styles.title}>{state === 'on' ? 'Avisos activados' : 'Avísame de notitas nuevas'}</p>
        <p className={styles.text}>
          {state === 'denied'
            ? 'Los avisos están bloqueados. Actívalos en los ajustes del navegador (o de la app) para esta página.'
            : state === 'on'
              ? `Te llegará una notificación cuando ${other} te deje algo, y un aviso en cada mesiversario.`
              : `Recibe una notificación cuando ${other} te deje una notita o un dibujito, y un aviso en cada mesiversario.`}
        </p>
        {error && <p className={styles.error}>{error}</p>}
      </div>
      {state !== 'denied' && state !== 'checking' && (
        <Button
          size="sm"
          variant={state === 'on' ? 'ghost' : 'primary'}
          onClick={() => void (state === 'on' ? disable() : enable())}
          disabled={state === 'working' || status !== 'online'}
          icon={state === 'working' ? <Loader2 className={styles.spin} aria-hidden /> : undefined}
        >
          {state === 'on' ? 'Desactivar' : 'Activar'}
        </Button>
      )}
    </div>
  )
}
