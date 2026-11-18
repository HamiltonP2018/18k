/**
 * Portada: su nombre, cuánto tiempo llevamos y la foto de los dos.
 * - Celular: foto a pantalla completa con el texto abajo.
 * - Pantallas anchas: la foto enmarcada en un arco sobre un fondo difuminado.
 * - Se adapta al día: "Hoy cumplimos seis meses", "Mañana cumplimos…".
 */
import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import { config } from '../../data/config'
import { picks } from '../../data/photos'
import { Photo } from '../../components/Photo'
import { HeartIcon } from '../../components/Ornament'
import { SECTIONS, scrollToSection } from '../../lib/routes'
import {
  capitalize,
  describeTogether,
  formatDotted,
  getElapsed,
  getMonthiversary,
  numberWord,
  START_DATE,
  useNow,
} from '../../lib/time'
import { EASE_OUT } from '../../lib/motion'
import { cx } from '../../lib/cx'
import styles from './HeroSection.module.css'

function useHeadline(now: Date) {
  const elapsed = getElapsed(now)
  const mv = getMonthiversary(now)
  const together = describeTogether(elapsed)
  const lead = mv.isToday ? `Hoy cumplimos ${together}` : `${capitalize(together)} a tu lado`
  let badge: string | null = null
  if (mv.isToday) badge = elapsed.years > 0 && elapsed.months === 0 ? 'Feliz aniversario' : 'Feliz mesiversario'
  else if (mv.daysUntilNext === 1) badge = `Mañana cumplimos ${numberWord(mv.nextNumber)} meses`
  else if (mv.daysUntilNext <= 7) badge = `Faltan ${mv.daysUntilNext} días para nuestros ${numberWord(mv.nextNumber)} meses`
  return { lead, badge }
}

export function HeroSection() {
  const now = useNow(60_000)
  const { lead, badge } = useHeadline(now)
  const reduced = useReducedMotion()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const photoScale = useTransform(scrollYProgress, [0, 1], [1, reduced ? 1 : 1.12])
  const photoY = useTransform(scrollYProgress, [0, 1], ['0%', reduced ? '0%' : '10%'])
  const contentY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -80])
  const contentOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0])

  const photoId = picks.heroPortrait[0]
  const wideId = picks.heroLandscape[0] ?? photoId

  const appear = (delay: number) => ({
    initial: reduced ? { opacity: 0 } : { opacity: 0, y: 26, filter: 'blur(10px)' },
    animate: reduced ? { opacity: 1 } : { opacity: 1, y: 0, filter: 'blur(0px)', transitionEnd: { filter: 'none' } },
    transition: { duration: 1.2, delay, ease: EASE_OUT },
  })

  return (
    <section id={SECTIONS.hero} ref={ref} className={styles.hero} aria-label="Portada">
      {/* Fondo: la foto completa (celular) / difuminada (pantallas anchas) */}
      <motion.div
        className={styles.bg}
        style={{ scale: photoScale, y: photoY }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.6 }}
      >
        <Photo id={photoId} priority sizes="100vw" className={styles.bgPhoto} />
      </motion.div>
      <div className={styles.scrim} aria-hidden />

      <div className={cx('container', styles.layout)}>
        <motion.div className={styles.content} style={{ y: contentY, opacity: contentOpacity }}>
          {badge && (
            <motion.p className={styles.badge} {...appear(0.2)}>
              <HeartIcon className={styles.badgeHeart} />
              {badge}
            </motion.p>
          )}
          <motion.p className={cx('eyebrow', styles.eyebrow)} {...appear(0.35)}>
            Nuestra historia
          </motion.p>
          <motion.h1 className={styles.name} {...appear(0.5)}>
            <span className="text-gradient">{config.herName}</span>
          </motion.h1>
          <motion.p className={styles.lead} {...appear(0.75)}>
            {lead}
          </motion.p>
          <motion.p className={styles.date} {...appear(0.95)}>
            <span>{formatDotted(START_DATE)}</span>
            <span className={styles.dateLine} aria-hidden />
            <span>hoy</span>
          </motion.p>
        </motion.div>

        {/* Foto enmarcada (solo pantallas anchas) */}
        <motion.figure
          className={styles.frame}
          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1.4, delay: 0.3, ease: EASE_OUT }}
        >
          <Photo id={wideId} sizes="(min-width: 900px) 40vw, 1px" className={styles.framePhoto} />
          <span className={styles.frameGlow} aria-hidden />
        </motion.figure>
      </div>

      <motion.div className={styles.cueWrap} style={{ opacity: contentOpacity }}>
        <motion.button
          type="button"
          className={styles.cue}
          onClick={() => scrollToSection(SECTIONS.counter)}
          aria-label="Bajar a nuestra historia"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 1 }}
        >
          <span className={styles.cueLabel}>Desliza</span>
          <ChevronDown className={styles.cueIcon} aria-hidden strokeWidth={1.5} />
        </motion.button>
      </motion.div>
    </section>
  )
}
