/**
 * Vista "Carta": el sobre se abre al tocar el sello y la carta aparece en un
 * papel, palabra por palabra, párrafo tras párrafo. "Mostrar todo" la revela
 * completa de una vez. Al final, la firma y un beso de corazones.
 */
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { FastForward, Heart, Images } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { config } from '../../data/config'
import { letter, letterParagraphs } from '../../data/letter'
import { Page } from '../../components/Page'
import { BackButton } from '../../components/BackButton'
import { Button } from '../../components/Button'
import { heartBurst, heartRain } from '../../lib/confetti'
import { ROUTES } from '../../lib/routes'
import { EASE_OUT } from '../../lib/motion'
import { formatLongDate } from '../../lib/time'
import { cx } from '../../lib/cx'
import { Envelope } from './Envelope'
import styles from './LetterPage.module.css'

const WORD_STAGGER = 0.065
const PARAGRAPH_PAUSE = 0.5

type Stage = 'closed' | 'opening' | 'reading'

/** Párrafo que revela sus palabras en secuencia. */
function RevealParagraph({
  text,
  state,
  greeting,
  onDone,
}: {
  text: string
  state: 'waiting' | 'active' | 'done'
  greeting?: boolean
  onDone: () => void
}) {
  const ref = useRef<HTMLElement | null>(null)
  const setRef = (el: HTMLElement | null) => {
    ref.current = el
  }
  const words = text.split(/\s+/)

  // Mantiene a la vista el párrafo que se está escribiendo (sin pelear con el scroll del usuario).
  useEffect(() => {
    if (state !== 'active' || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    if (r.top > window.innerHeight * 0.72) ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [state])

  // Avisa cuando termina (duración calculada; más fiable que esperar cada palabra).
  useEffect(() => {
    if (state !== 'active') return
    const ms = (words.length * WORD_STAGGER + 0.6 + PARAGRAPH_PAUSE) * 1000
    const t = window.setTimeout(onDone, ms)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  const Tag = greeting ? 'h2' : 'p'
  return (
    <Tag ref={setRef} className={greeting ? styles.greeting : styles.paragraph}>
      {state === 'done' ? (
        text
      ) : (
        words.map((w, i) => (
          <motion.span
            key={i}
            className={styles.word}
            initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
            animate={state === 'active' ? { opacity: 1, y: 0, filter: 'blur(0px)' } : undefined}
            transition={{ duration: 0.6, delay: i * WORD_STAGGER, ease: EASE_OUT }}
          >
            {w}{' '}
          </motion.span>
        ))
      )}
    </Tag>
  )
}

export default function LetterPage() {
  const reduced = useReducedMotion()
  const { setImmersive } = useApp()
  const [stage, setStage] = useState<Stage>('closed')
  const [current, setCurrent] = useState(0)
  const total = letterParagraphs.length
  const finished = current >= total
  const celebrated = useRef(false)
  const [today] = useState(() => new Date())

  // Mientras se lee, se ocultan el dock y la música flotante.
  useEffect(() => {
    setImmersive(stage === 'reading')
    return () => setImmersive(false)
  }, [stage, setImmersive])

  useEffect(() => {
    if (!finished || celebrated.current || stage !== 'reading') return
    celebrated.current = true
    const t = window.setTimeout(() => heartBurst({ y: 0.7, count: 90, power: 0.8 }), 900)
    return () => window.clearTimeout(t)
  }, [finished, stage])

  const open = () => {
    if (stage !== 'closed') return
    setStage('opening')
    window.setTimeout(() => setStage('reading'), reduced ? 200 : 1900)
  }
  const showAll = () => setCurrent(total)

  return (
    <Page className={styles.page} label="La carta">
      <BackButton icon={stage === 'reading' ? 'close' : 'back'} label={stage === 'reading' ? 'Cerrar la carta' : 'Volver'} />

      <AnimatePresence mode="wait">
        {stage !== 'reading' ? (
          <motion.div
            key="envelope"
            className={styles.stage}
            exit={{ opacity: 0, scale: 1.12, y: -40, transition: { duration: 0.6, ease: EASE_OUT } }}
          >
            <motion.p
              className={cx('eyebrow', styles.eyebrow)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
            >
              Para {config.herName}
            </motion.p>
            <motion.button
              type="button"
              className={styles.envelopeBtn}
              onClick={open}
              aria-label="Abrir el sobre"
              initial={{ opacity: 0, y: 40, rotate: -4 }}
              animate={{ opacity: 1, y: 0, rotate: stage === 'opening' ? 0 : -1.5 }}
              transition={{ duration: 1, ease: EASE_OUT }}
              whileHover={stage === 'closed' ? { scale: 1.03, rotate: 0 } : undefined}
              whileTap={stage === 'closed' ? { scale: 0.97 } : undefined}
            >
              <Envelope open={stage === 'opening'} peek={letter.greeting.replace(/\s*❤️?$/, '')} />
            </motion.button>
            <motion.p
              className={styles.tapHint}
              initial={{ opacity: 0 }}
              animate={{ opacity: stage === 'closed' ? 1 : 0 }}
              transition={{ delay: stage === 'closed' ? 1 : 0, duration: 0.6 }}
            >
              Toca el sello para abrirla
            </motion.p>
          </motion.div>
        ) : (
          <motion.article
            key="paper"
            className={styles.paper}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 80, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1, ease: EASE_OUT }}
            aria-label="Carta"
          >
            <p className={styles.date}>{formatLongDate(today)}</p>

            {letterParagraphs.map((text, i) => (
              <RevealParagraph
                key={i}
                text={text}
                greeting={i === 0}
                state={reduced || i < current ? 'done' : i === current ? 'active' : 'waiting'}
                onDone={() => setCurrent((c) => Math.max(c, i + 1))}
              />
            ))}

            <motion.div
              className={styles.signature}
              initial={{ opacity: 0, y: 10 }}
              animate={finished || reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              transition={{ duration: 1.2, delay: 0.3, ease: EASE_OUT }}
            >
              <span className={styles.signLabel}>Con todo mi amor,</span>
              <span className={styles.signName}>{config.signature}</span>
              {config.fromName && <span className={styles.signLabel}>{config.fromName}</span>}
            </motion.div>

            <motion.div
              className={styles.actions}
              initial={{ opacity: 0 }}
              animate={{ opacity: finished || reduced ? 1 : 0 }}
              transition={{ duration: 0.8, delay: 1 }}
              style={{ pointerEvents: finished || reduced ? 'auto' : 'none' }}
            >
              <Button variant="primary" onClick={() => heartRain(3500)} icon={<Heart aria-hidden />}>
                Enviar un beso
              </Button>
              <Button to={ROUTES.gallery} variant="ghost" icon={<Images aria-hidden />}>
                Nuestros recuerdos
              </Button>
            </motion.div>
          </motion.article>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {stage === 'reading' && !finished && !reduced && (
          <motion.button
            type="button"
            className={styles.skip}
            onClick={showAll}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 2 } }}
            exit={{ opacity: 0, y: 20 }}
          >
            <FastForward aria-hidden strokeWidth={1.6} /> Mostrar todo
          </motion.button>
        )}
      </AnimatePresence>
    </Page>
  )
}
