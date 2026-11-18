/**
 * Botón flotante de música (arriba a la derecha) con ecualizador animado.
 */
import { AnimatePresence, motion } from 'motion/react'
import { Music2, Pause } from 'lucide-react'
import { useMusic } from '../context/MusicContext'
import { useApp } from '../context/AppContext'
import { cx } from '../lib/cx'
import styles from './MusicToggle.module.css'

export function MusicToggle() {
  const { playing, ducked, toggle, title } = useMusic()
  const { immersive } = useApp()

  return (
    <AnimatePresence>
      {!immersive && (
        <motion.button
          key="music"
          type="button"
          className={cx(styles.btn, playing && styles.playing, ducked && styles.ducked)}
          onClick={toggle}
          aria-label={playing ? `Pausar ${title}` : `Reproducir ${title}`}
          aria-pressed={playing}
          title={title}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.35 }}
        >
          <span className={styles.ring} aria-hidden />
          {playing ? (
            <span className={styles.bars} aria-hidden>
              <i />
              <i />
              <i />
              <i />
            </span>
          ) : (
            <Music2 className={styles.icon} aria-hidden />
          )}
          <Pause className={styles.hoverIcon} aria-hidden />
        </motion.button>
      )}
    </AnimatePresence>
  )
}
