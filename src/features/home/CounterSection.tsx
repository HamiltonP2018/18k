/**
 * "Nuestro tiempo juntos": contador en vivo (meses, días, horas, minutos,
 * segundos) con dígitos que ruedan, totales acumulados y la cuenta regresiva
 * al próximo mesiversario y al primer año.
 */
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { CalendarHeart, HeartPulse, Hourglass, Sparkles } from 'lucide-react'
import { SectionHeading } from '../../components/SectionHeading'
import { Reveal } from '../../components/Reveal'
import { SECTIONS } from '../../lib/routes'
import {
  formatDayMonth,
  formatLongDate,
  formatNumber,
  getAnniversary,
  getElapsed,
  getMonthiversary,
  getTotals,
  numberWord,
  useNow,
} from '../../lib/time'
import { cx } from '../../lib/cx'
import styles from './CounterSection.module.css'

/** Número cuyos dígitos ruedan al cambiar. */
function Rolling({ value, pad = 2 }: { value: number; pad?: number }) {
  const reduced = useReducedMotion()
  const digits = String(value).padStart(pad, '0').split('')
  return (
    <span className={styles.rolling} aria-hidden>
      {digits.map((d, i) => (
        <span key={digits.length - i} className={styles.digitBox}>
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={d}
              className={styles.digit}
              initial={reduced ? { opacity: 0 } : { y: '-70%', opacity: 0, filter: 'blur(4px)' }}
              animate={{ y: '0%', opacity: 1, filter: 'blur(0px)' }}
              exit={reduced ? { opacity: 0 } : { y: '70%', opacity: 0, filter: 'blur(4px)' }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              {d}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  )
}

export function CounterSection() {
  const now = useNow(1000)
  const e = getElapsed(now)
  const totals = getTotals(now)
  const mv = getMonthiversary(now)
  const an = getAnniversary(now)

  const units = [
    ...(e.years > 0 ? [{ value: e.years, label: e.years === 1 ? 'año' : 'años' }] : []),
    { value: e.months, label: e.months === 1 ? 'mes' : 'meses' },
    { value: e.days, label: e.days === 1 ? 'día' : 'días' },
    { value: e.hours, label: 'horas' },
    { value: e.minutes, label: 'minutos' },
    { value: e.seconds, label: 'segundos' },
  ]
  const spoken = units.map((u) => `${u.value} ${u.label}`).join(', ')
  const pct = Math.round(an.progress * 1000) / 10
  const nextLabel = mv.isToday
    ? `Hoy cumplimos ${numberWord(mv.months)} meses`
    : mv.daysUntilNext === 1
      ? 'Es mañana'
      : `Faltan ${mv.daysUntilNext} días`

  return (
    <section id={SECTIONS.counter} className={cx('section', styles.section)}>
      <div className="container">
        <SectionHeading eyebrow="Desde el 18 de mayo" title="Nuestro tiempo" script="juntos" />

        <Reveal className={styles.clock} amount={0.3}>
          <p className="sr-only" aria-live="off">
            Llevamos {spoken}.
          </p>
          {units.map((u, i) => (
            <div key={u.label} className={cx(styles.unit, i >= units.length - 3 && styles.unitSmall)}>
              <Rolling value={u.value} />
              <span className={styles.unitLabel}>{u.label}</span>
            </div>
          ))}
        </Reveal>

        <div className={styles.cards}>
          <Reveal className={cx(styles.card, 'glass')} delay={0.05} blur={false}>
            <CalendarHeart className={styles.cardIcon} aria-hidden strokeWidth={1.4} />
            <p className={styles.cardLabel}>Próximo mesiversario</p>
            <p className={styles.cardValue}>{formatDayMonth(mv.isToday ? mv.last : mv.next)}</p>
            <p className={styles.cardNote}>{nextLabel}</p>
          </Reveal>

          <Reveal className={cx(styles.card, 'glass')} delay={0.12} blur={false}>
            <Hourglass className={styles.cardIcon} aria-hidden strokeWidth={1.4} />
            <p className={styles.cardLabel}>Días juntos</p>
            <p className={styles.cardValue}>{formatNumber(totals.days)}</p>
            <p className={styles.cardNote}>
              {formatNumber(totals.weeks)} semanas · {formatNumber(totals.hours)} horas
            </p>
          </Reveal>

          <Reveal className={cx(styles.card, 'glass')} delay={0.19} blur={false}>
            <HeartPulse className={cx(styles.cardIcon, styles.pulse)} aria-hidden strokeWidth={1.4} />
            <p className={styles.cardLabel}>Latidos pensando en ti</p>
            <p className={cx(styles.cardValue, styles.tabular)}>{formatNumber(totals.heartbeats)}</p>
            <p className={styles.cardNote}>y contando, a 75 por minuto</p>
          </Reveal>
        </div>

        <Reveal className={cx(styles.journey, 'glass')} blur={false} amount={0.4}>
          <div className={styles.journeyHead}>
            <Sparkles className={styles.journeyIcon} aria-hidden strokeWidth={1.4} />
            <div>
              <p className={styles.cardLabel}>
                Camino a {an.years === 0 ? 'nuestro primer año' : `nuestros ${numberWord(an.nextNumber)} años`}
              </p>
              <p className={styles.journeyDate}>{formatLongDate(an.next)}</p>
            </div>
            <p className={styles.journeyPct}>{formatNumber(pct)}%</p>
          </div>
          <div
            className={styles.track}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-label="Progreso hacia el próximo aniversario"
          >
            <motion.span
              className={styles.bar}
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: an.progress }}
              viewport={{ once: true }}
              transition={{ duration: 2, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <p className={styles.cardNote}>
            Faltan {formatNumber(an.daysUntil)} días… y quiero vivir cada uno contigo.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
