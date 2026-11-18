/**
 * "Razones por las que te amo": un mazo de cartas. Se desliza a un lado (o
 * se toca) para ver la siguiente. Al terminar: "…y mil razones más".
 */
import { useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion, type PanInfo, type Variants } from 'motion/react'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { reasons } from '../../data/reasons'
import { SectionHeading } from '../../components/SectionHeading'
import { Reveal } from '../../components/Reveal'
import { Photo } from '../../components/Photo'
import { HeartIcon } from '../../components/Ornament'
import { heartBurst } from '../../lib/confetti'
import { SECTIONS } from '../../lib/routes'
import { cx } from '../../lib/cx'
import styles from './ReasonsSection.module.css'

const TOTAL = reasons.length

/** La carta sale volando hacia el lado `custom` (-1 izquierda, 1 derecha). */
const CARD: Variants = {
  enter: { opacity: 0, scale: 0.92, y: 18 },
  center: { opacity: 1, scale: 1, y: 0, x: 0, rotate: 0 },
  exit: (side: number) => ({ x: side * 420, rotate: side * 16, opacity: 0, transition: { duration: 0.45 } }),
}
const FADE: Variants = { enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } }

export function ReasonsSection() {
  const reduced = useReducedMotion()
  // `index === TOTAL` es la carta final. `side`: hacia dónde sale la carta (-1 izq., 1 der.).
  const [[index, side], setState] = useState<[number, number]>([0, -1])
  const [celebrated, setCelebrated] = useState(false)
  const draggedAt = useRef(0)
  const isEnd = index === TOTAL
  const reason = reasons[index]

  const go = (delta: number, exitSide = delta > 0 ? -1 : 1) => {
    const next = Math.min(TOTAL, Math.max(0, index + delta))
    if (next === index) return
    setState([next, exitSide])
    if (next === TOTAL && !celebrated) {
      setCelebrated(true)
      heartBurst({ y: 0.6, count: 90, power: 0.9 })
    }
  }
  const restart = () => setState([0, 1])

  // Deslizar hacia cualquier lado pasa a la siguiente (la carta sale por ese lado).
  const onDragEnd = (_: unknown, info: PanInfo) => {
    draggedAt.current = performance.now()
    const swipe = Math.abs(info.offset.x) > 90 || Math.abs(info.velocity.x) > 500
    if (swipe) go(1, info.offset.x < 0 ? -1 : 1)
  }
  const onCardClick = () => {
    if (isEnd || performance.now() - draggedAt.current < 250) return
    go(1)
  }

  return (
    <section id={SECTIONS.reasons} className={cx('section', styles.section)}>
      <div className="container">
        <SectionHeading
          eyebrow={`${TOTAL} de muchísimas`}
          title="Razones por las que"
          script="te amo"
          subtitle="Desliza las cartas, una por una."
        />

        <Reveal className={styles.deckWrap} y={40} amount={0.3}>
          <div className={styles.deck}>
            {/* Cartas de atrás (decorativas) */}
            {!isEnd && index < TOTAL - 1 && <span className={cx(styles.card, styles.back, styles.back2)} aria-hidden />}
            {!isEnd && <span className={cx(styles.card, styles.back, styles.back1)} aria-hidden />}

            <AnimatePresence initial={false} custom={side} mode="popLayout">
              <motion.div
                key={index}
                className={cx(styles.card, styles.front, isEnd && styles.final)}
                custom={side}
                variants={reduced ? FADE : CARD}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                drag={reduced ? false : 'x'}
                dragSnapToOrigin
                dragElastic={0.7}
                onDragEnd={onDragEnd}
                whileDrag={{ rotate: 0, scale: 1.02 }}
                onClick={onCardClick}
                role="group"
                aria-roledescription="carta"
                aria-label={isEnd ? 'Final' : `Razón ${index + 1} de ${TOTAL}`}
              >
                {isEnd ? (
                  <>
                    <HeartIcon className={styles.bigHeart} />
                    <p className={styles.finalText}>…y mil razones más que no caben aquí.</p>
                    <p className={styles.finalSub}>Pero todas se resumen en una: eres tú.</p>
                    <button
                      type="button"
                      className={styles.restart}
                      onClick={(e) => {
                        e.stopPropagation()
                        restart()
                      }}
                    >
                      <RotateCcw aria-hidden strokeWidth={1.6} /> Volver a empezar
                    </button>
                  </>
                ) : (
                  <>
                    <span className={styles.number}>
                      Nº {String(index + 1).padStart(2, '0')}
                    </span>
                    {reason.photo && (
                      <span className={styles.photo}>
                        <Photo id={reason.photo} sizes="120px" />
                      </span>
                    )}
                    <p className={styles.text}>{reason.text}</p>
                    <HeartIcon className={styles.cornerHeart} />
                    {index === 0 && <span className={styles.tip}>Desliza o toca</span>}
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className={styles.controls}>
            <button type="button" className={styles.arrow} onClick={() => go(-1)} disabled={index === 0} aria-label="Razón anterior">
              <ChevronLeft aria-hidden strokeWidth={1.5} />
            </button>
            <div className={styles.progress} aria-hidden>
              <span className={styles.progressText}>
                {Math.min(index + 1, TOTAL)} / {TOTAL}
              </span>
              <span className={styles.progressTrack}>
                <motion.span
                  className={styles.progressFill}
                  animate={{ scaleX: Math.min(1, (index + 1) / TOTAL) }}
                  transition={{ duration: 0.5 }}
                />
              </span>
            </div>
            <button type="button" className={styles.arrow} onClick={() => go(1)} disabled={isEnd} aria-label="Razón siguiente">
              <ChevronRight aria-hidden strokeWidth={1.5} />
            </button>
          </div>
          <p className="sr-only" aria-live="polite">
            {isEnd ? 'Y mil razones más que no caben aquí.' : reason.text}
          </p>
        </Reveal>
      </div>
    </section>
  )
}
