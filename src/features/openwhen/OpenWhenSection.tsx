/**
 * "Ábrela cuando…": sobres sellados con cartas para momentos concretos.
 * Al abrir uno, la carta aparece en papel (con foto) y el sobre queda marcado
 * como abierto en este dispositivo (se puede releer cuando quiera).
 */
import { useState } from 'react'
import { CalendarHeart, CloudRain, Heart, HeartCrack, Moon, Sparkles, type LucideIcon } from 'lucide-react'
import { config } from '../../data/config'
import { openWhenLetters, type OpenWhenIcon, type OpenWhenLetter } from '../../data/openWhen'
import { SectionHeading } from '../../components/SectionHeading'
import { Reveal } from '../../components/Reveal'
import { Sheet } from '../../components/Sheet'
import { Photo } from '../../components/Photo'
import { heartBurst } from '../../lib/confetti'
import { local, STORAGE_KEYS } from '../../lib/storage'
import { SECTIONS } from '../../lib/routes'
import { cx } from '../../lib/cx'
import styles from './OpenWhenSection.module.css'

const ICONS: Record<OpenWhenIcon, LucideIcon> = {
  heart: Heart,
  'cloud-rain': CloudRain,
  moon: Moon,
  'heart-crack': HeartCrack,
  'calendar-heart': CalendarHeart,
  sparkles: Sparkles,
}

const readOpened = () => new Set((local.get(STORAGE_KEYS.openWhen) ?? '').split(',').filter(Boolean))

export function OpenWhenSection() {
  const [opened, setOpened] = useState<Set<string>>(readOpened)
  const [active, setActive] = useState<OpenWhenLetter | null>(null)
  const [open, setOpen] = useState(false)

  if (!openWhenLetters.length) return null

  const openLetter = (letter: OpenWhenLetter) => {
    setActive(letter)
    setOpen(true)
    if (!opened.has(letter.id)) {
      const next = new Set(opened).add(letter.id)
      setOpened(next)
      local.set(STORAGE_KEYS.openWhen, [...next].join(','))
      window.setTimeout(() => heartBurst({ y: 0.55, count: 60, power: 0.7 }), 350)
    }
  }

  return (
    <section id={SECTIONS.openWhen} className={cx('section', styles.section)}>
      <div className="container">
        <SectionHeading
          eyebrow="Cartas para después"
          title="Ábrela"
          script="cuando…"
          subtitle="Pequeñas cartas para los días en que la distancia pese. Guárdalas para el momento justo."
        />

        <ul className={styles.grid}>
          {openWhenLetters.map((letter, i) => {
            const Icon = ICONS[letter.icon] ?? Heart
            const isOpen = opened.has(letter.id)
            return (
              <Reveal as="li" key={letter.id} delay={(i % 3) * 0.08} y={26} blur={false} amount={0.2}>
                <button
                  type="button"
                  className={cx(styles.envelope, isOpen && styles.opened)}
                  onClick={() => openLetter(letter)}
                  aria-label={`Ábrela cuando ${letter.when}${isOpen ? ' (ya abierta)' : ''}`}
                >
                  <span className={styles.top} aria-hidden>
                    <span className={styles.flap} />
                    <span className={styles.seal}>
                      <Icon strokeWidth={1.7} />
                    </span>
                  </span>
                  <span className={styles.label}>
                    <span className={styles.pre}>Ábrela cuando…</span>
                    <span className={styles.when}>{letter.when}</span>
                  </span>
                  {isOpen && <span className={styles.tag}>Abierta</span>}
                </button>
              </Reveal>
            )
          })}
        </ul>
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title={active ? `Ábrela cuando ${active.when}` : 'Carta'} hideTitle variant="paper" className={styles.sheet}>
        {active && (
          <article className={styles.letter}>
            <p className={styles.letterPre}>Ábrela cuando…</p>
            <p className={styles.letterWhen}>{active.when}</p>
            {active.photo && (
              <div className={styles.photo}>
                <Photo id={active.photo} sizes="(max-width: 600px) 90vw, 480px" />
              </div>
            )}
            {active.body.split(/\n{2,}/).map((p, i) => (
              <p key={i} className={styles.para}>
                {p}
              </p>
            ))}
            <p className={styles.sign}>
              <span>Con todo mi amor,</span>
              <span className={styles.signName}>{config.signature}</span>
            </p>
          </article>
        )}
      </Sheet>
    </section>
  )
}
