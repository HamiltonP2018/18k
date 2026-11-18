/**
 * Candado: teclado numérico; la contraseña es nuestra fecha (DD MM AA).
 * - Funciona con toques y con el teclado físico (números, Retroceso, Esc).
 * - Error: los puntos tiemblan y se ponen rojos; tras dos intentos aparece la pista.
 * - Acierto: explosión de corazones, empieza la música (dentro del gesto del
 *   usuario, como exigen los navegadores) y se abre la historia.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useAnimationControls, useReducedMotion } from 'motion/react'
import { Delete, Heart, LockKeyhole, LockKeyholeOpen } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useMusic } from '../../context/MusicContext'
import { config } from '../../data/config'
import { picks } from '../../data/photos'
import { Photo } from '../../components/Photo'
import { getMany, preloadImages } from '../../lib/media'
import { burstParticles, heartBurst } from '../../lib/confetti'
import { EASE_OUT } from '../../lib/motion'
import { cx } from '../../lib/cx'
import styles from './LockScreen.module.css'

const LENGTH = config.passcode.length
type Status = 'idle' | 'error' | 'success'
type Key = { kind: 'digit'; value: string } | { kind: 'hint' } | { kind: 'delete' }

const KEYS: Key[] = [
  ...'123456789'.split('').map((value) => ({ kind: 'digit', value }) as Key),
  { kind: 'hint' },
  { kind: 'digit', value: '0' },
  { kind: 'delete' },
]

function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* no disponible */
  }
}

export function LockScreen() {
  const { unlock } = useApp()
  const { play } = useMusic()
  const reduced = useReducedMotion()
  const shake = useAnimationControls()
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [showHelp, setShowHelp] = useState(false)
  const codeRef = useRef('')
  const statusRef = useRef<Status>('idle')
  const failsRef = useRef(0)
  const timers = useRef<number[]>([])

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])

  // Precarga la portada y la intro mientras se escribe la contraseña.
  useEffect(() => {
    preloadImages(getMany([...picks.heroPortrait, ...picks.intro.slice(0, 2)]), 1280)
  }, [])

  const setBoth = (next: string) => {
    codeRef.current = next
    setCode(next)
  }
  const setStatusBoth = (next: Status) => {
    statusRef.current = next
    setStatus(next)
  }

  const submit = useCallback(
    (value: string) => {
      if (value === config.passcode) {
        setStatusBoth('success')
        play(2600) // dentro del gesto del usuario
        vibrate([24, 40, 60])
        heartBurst({ y: 0.42, count: 130 })
        burstParticles()
        later(unlock, reduced ? 500 : 1500)
        return
      }
      setStatusBoth('error')
      failsRef.current += 1
      if (failsRef.current >= 2) setShowHelp(true)
      vibrate(160)
      void shake.start({ x: [0, -16, 13, -10, 7, -3, 0], transition: { duration: 0.5, ease: 'easeOut' } })
      later(() => {
        setBoth('')
        setStatusBoth('idle')
      }, 800)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [play, unlock, reduced, shake],
  )

  const pressDigit = useCallback(
    (d: string) => {
      if (statusRef.current !== 'idle' || codeRef.current.length >= LENGTH) return
      const next = codeRef.current + d
      setBoth(next)
      if (next.length === LENGTH) submit(next)
    },
    [submit],
  )

  const pressDelete = useCallback(() => {
    if (statusRef.current !== 'idle') return
    setBoth(codeRef.current.slice(0, -1))
  }, [])

  // Teclado físico
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (/^\d$/.test(e.key)) {
        e.preventDefault()
        pressDigit(e.key)
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        pressDelete()
      } else if (e.key === 'Escape') {
        if (statusRef.current === 'idle') setBoth('')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pressDigit, pressDelete])

  const onKey = (key: Key) => {
    if (key.kind === 'digit') pressDigit(key.value)
    else if (key.kind === 'delete') pressDelete()
    else setShowHelp((v) => !v)
  }

  const success = status === 'success'
  const error = status === 'error'

  return (
    <motion.div
      className={cx(styles.screen, success && styles.isSuccess)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="lock-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.8 } }}
      exit={
        reduced
          ? { opacity: 0, transition: { duration: 0.4 } }
          : { opacity: 0, scale: 1.08, filter: 'blur(12px)', transition: { duration: 0.9, ease: EASE_OUT } }
      }
    >
      <div className={styles.bg} aria-hidden>
        <Photo id={picks.heroPortrait[0]} priority sizes="100vw" alt="" />
      </div>
      <div className={styles.bgShade} aria-hidden />

      <motion.div
        className={styles.panel}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.15, ease: EASE_OUT }}
      >
        <motion.div
          className={styles.lockIcon}
          animate={success ? { scale: [1, 1.25, 1], rotate: [0, -8, 0] } : { scale: 1 }}
          transition={{ duration: 0.7 }}
          aria-hidden
        >
          {success ? <LockKeyholeOpen strokeWidth={1.4} /> : <LockKeyhole strokeWidth={1.4} />}
        </motion.div>

        <p className={cx('eyebrow', styles.eyebrow)}>Para {config.herName}</p>
        <h1 id="lock-title" className={styles.title}>
          <span className="text-gold">{config.siteTitle}</span>
        </h1>
        <p className={styles.hint}>{config.passcodeHint}</p>

        <motion.div className={styles.dots} animate={shake} aria-hidden>
          {Array.from({ length: LENGTH }, (_, i) => (
            <span key={i} className={styles.slot}>
              <span
                className={cx(
                  styles.dot,
                  i < code.length && styles.filled,
                  error && styles.dotError,
                  success && styles.dotSuccess,
                )}
                style={success ? { transitionDelay: `${i * 60}ms` } : undefined}
              />
              {i % 2 === 1 && i < LENGTH - 1 && <span className={styles.sep}>·</span>}
            </span>
          ))}
        </motion.div>
        <p className="sr-only" aria-live="polite">
          {success ? 'Correcto' : error ? 'Fecha incorrecta, intenta de nuevo' : `${code.length} de ${LENGTH} dígitos`}
        </p>

        <p className={cx(styles.help, showHelp && styles.helpVisible)} aria-live="polite">
          {showHelp ? config.passcodeHelp : ' '}
        </p>

        <div className={styles.keypad}>
          {KEYS.map((key, i) => {
            const label = key.kind === 'digit' ? key.value : key.kind === 'delete' ? 'Borrar' : 'Ver pista'
            return (
              <motion.button
                key={i}
                type="button"
                className={cx(styles.key, key.kind !== 'digit' && styles.keyAlt)}
                onClick={() => onKey(key)}
                aria-label={label}
                whileTap={{ scale: 0.88 }}
                disabled={success}
              >
                {key.kind === 'digit' && <span className={styles.digit}>{key.value}</span>}
                {key.kind === 'delete' && <Delete strokeWidth={1.5} aria-hidden />}
                {key.kind === 'hint' && <Heart strokeWidth={1.5} aria-hidden />}
              </motion.button>
            )
          })}
        </div>
      </motion.div>
    </motion.div>
  )
}
