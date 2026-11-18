/**
 * "Mis promesas": tomadas de las palabras de la carta. Tarjetas de vidrio con
 * número romano e ícono; aparecen escalonadas.
 */
import { motion, useReducedMotion } from 'motion/react'
import { Ear, HandHeart, HeartHandshake, House, Infinity as InfinityIcon, Route, Sparkles, type LucideIcon } from 'lucide-react'
import { promises, type PromiseIcon } from '../../data/promises'
import { SectionHeading } from '../../components/SectionHeading'
import { SECTIONS } from '../../lib/routes'
import { EASE_OUT } from '../../lib/motion'
import { cx } from '../../lib/cx'
import styles from './PromisesSection.module.css'

const ICONS: Record<PromiseIcon, LucideIcon> = {
  'heart-handshake': HeartHandshake,
  ear: Ear,
  'hand-heart': HandHeart,
  home: House,
  sparkles: Sparkles,
  route: Route,
  infinity: InfinityIcon,
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

export function PromisesSection() {
  const reduced = useReducedMotion()
  return (
    <section id={SECTIONS.promises} className={cx('section', styles.section)}>
      <div className="container">
        <SectionHeading
          eyebrow="Lo que te prometo"
          title="Mis promesas"
          script="para ti"
          subtitle="No quiero una relación perfecta: quiero una en la que los dos nos sintamos seguros, queridos y acompañados."
        />

        <ul className={styles.grid}>
          {promises.map((p, i) => {
            const Icon = ICONS[p.icon] ?? Sparkles
            const last = i === promises.length - 1
            return (
              <motion.li
                key={p.title}
                className={cx(styles.card, 'glass', last && styles.featured)}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 34 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.8, delay: (i % 3) * 0.08, ease: EASE_OUT }}
              >
                <span className={styles.roman} aria-hidden>
                  {ROMAN[i] ?? i + 1}
                </span>
                <span className={styles.iconWrap} aria-hidden>
                  <Icon className={styles.icon} strokeWidth={1.4} />
                </span>
                <h3 className={styles.title}>{p.title}</h3>
                <p className={styles.text}>{p.text}</p>
              </motion.li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
