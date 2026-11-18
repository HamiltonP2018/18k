/**
 * Intro cinematográfica (después del candado): escenas con foto a pantalla
 * completa (efecto Ken Burns), frases que aparecen una a una y barras de
 * progreso como en las historias.
 * - Tocar avanza a la siguiente escena; "Saltar" (o Esc) va directo al inicio.
 * - La última escena usa la misma foto de la portada: el paso es continuo.
 */
import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useApp } from '../../context/AppContext'
import { introScenes } from '../../data/intro'
import { Photo } from '../../components/Photo'
import { getMany, preloadImages } from '../../lib/media'
import { EASE_OUT } from '../../lib/motion'
import { cx } from '../../lib/cx'
import styles from './IntroSequence.module.css'

const DEFAULT_MS = 4300
const LINE_DELAY = 0.95

export function IntroSequence() {
  const { finishIntro } = useApp()
  const reduced = useReducedMotion()
  const [index, setIndex] = useState(0)
  const total = introScenes.length
  const scene = introScenes[index]
  const duration = scene.duration ?? DEFAULT_MS + Math.max(0, scene.lines.length - 1) * 500

  const next = useCallback(() => {
    if (index < total - 1) setIndex(index + 1)
    else finishIntro()
  }, [index, total, finishIntro])

  // Avance automático
  useEffect(() => {
    const t = window.setTimeout(next, duration)
    return () => window.clearTimeout(t)
  }, [next, duration])

  // Precarga la foto de la siguiente escena
  useEffect(() => {
    const upcoming = introScenes[index + 1]
    if (upcoming) preloadImages(getMany([upcoming.photo]), 1920)
  }, [index])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finishIntro()
      else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, finishIntro])

  const isScript = scene.style === 'script'

  return (
    <motion.div
      className={styles.intro}
      role="region"
      aria-roledescription="intro"
      aria-label="Intro"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 1 } }}
      exit={{ opacity: 0, transition: { duration: 1.1, ease: EASE_OUT } }}
      onClick={next}
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={index}
          className={styles.scene}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.3, ease: 'easeInOut' }}
        >
          <motion.div
            className={styles.photo}
            initial={reduced ? false : { scale: 1.16, x: index % 2 ? '-2%' : '2%' }}
            animate={reduced ? undefined : { scale: 1.02, x: '0%' }}
            transition={{ duration: duration / 1000 + 1.6, ease: 'linear' }}
          >
            <Photo id={scene.photo} priority sizes="100vw" alt="" />
          </motion.div>
          <div className={styles.scrim} />

          <div className={cx(styles.text, isScript && styles.textFinal)}>
            {scene.lines.map((line, k) => (
              <motion.p
                key={k}
                className={isScript && k === 0 ? styles.script : styles.line}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 22, filter: 'blur(10px)' }}
                animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 1.2, delay: 0.55 + k * LINE_DELAY, ease: EASE_OUT }}
              >
                {line}
              </motion.p>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className={styles.letterbox} aria-hidden>
        <span />
        <span />
      </div>

      <div className={styles.bars} aria-hidden>
        {introScenes.map((_, i) => (
          <span key={i} className={styles.bar}>
            {i < index && <span className={styles.fill} style={{ transform: 'scaleX(1)' }} />}
            {i === index && (
              <motion.span
                key={`fill-${index}`}
                className={styles.fill}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: duration / 1000, ease: 'linear' }}
              />
            )}
          </span>
        ))}
      </div>

      <button
        type="button"
        className={styles.skip}
        onClick={(e) => {
          e.stopPropagation()
          finishIntro()
        }}
      >
        Saltar intro
      </button>
      <p className="sr-only" aria-live="polite">
        {scene.lines.join(' ')}
      </p>
    </motion.div>
  )
}
