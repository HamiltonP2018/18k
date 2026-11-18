/**
 * Final: un corazón hecho con nuestras fotos que late suave, el "te amo" y
 * la firma. Cada foto del corazón se puede abrir en el visor.
 */
import { useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Heart, RotateCcw } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { config } from '../../data/config'
import { picks } from '../../data/photos'
import { Photo } from '../../components/Photo'
import { Button } from '../../components/Button'
import { Reveal } from '../../components/Reveal'
import { Ornament } from '../../components/Ornament'
import { MediaLightbox } from '../../components/MediaLightbox'
import { getMany } from '../../lib/media'
import { burstParticles, heartBurst } from '../../lib/confetti'
import { SECTIONS } from '../../lib/routes'
import { describeTogether, getElapsed, useNow } from '../../lib/time'
import { cx } from '../../lib/cx'
import styles from './FinaleSection.module.css'

/** Máscara del corazón (9 × 8). "#" = celda con foto. */
const MASK = [
  '.##...##.',
  '####.####',
  '#########',
  '#########',
  '.#######.',
  '..#####..',
  '...###...',
  '....#....',
]
const COLS = MASK[0].length
const CELLS = MASK.flatMap((row, y) => row.split('').flatMap((c, x) => (c === '#' ? [{ x, y }] : [])))
const CENTER = { x: (COLS - 1) / 2, y: 3 }

export function FinaleSection() {
  const reduced = useReducedMotion()
  const { replayIntro } = useApp()
  const now = useNow(60_000)
  const together = describeTogether(getElapsed(now))
  const items = useMemo(() => getMany(picks.mosaic).filter((m) => !m.sensitive && m.type === 'photo'), [])
  const [lightbox, setLightbox] = useState(-1)

  const tiles = CELLS.map((cell, i) => ({ ...cell, item: items.length ? items[i % items.length] : undefined, index: i % Math.max(1, items.length) }))

  const kiss = () => {
    heartBurst({ y: 0.55, count: 140 })
    burstParticles()
  }

  return (
    <section id={SECTIONS.finale} className={cx('section', styles.section)}>
      <div className={cx('container', styles.inner)}>
        <Reveal as="p" className="eyebrow" y={14} blur={false}>
          Para siempre
        </Reveal>

        <motion.div
          className={styles.heart}
          style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.35 }}
        >
          {tiles.map((t, i) => {
            const dist = Math.hypot(t.x - CENTER.x, t.y - CENTER.y)
            return (
              <motion.button
                key={i}
                type="button"
                className={styles.tile}
                style={{ gridColumn: t.x + 1, gridRow: t.y + 1 }}
                variants={{
                  hidden: reduced ? { opacity: 0 } : { opacity: 0, scale: 0.3, rotate: (i % 2 ? 1 : -1) * 14 },
                  show: {
                    opacity: 1,
                    scale: 1,
                    rotate: 0,
                    transition: { duration: 0.7, delay: dist * 0.09, ease: [0.34, 1.56, 0.64, 1] },
                  },
                }}
                onClick={() => setLightbox(t.index)}
                aria-label={t.item ? `Ver foto: ${t.item.caption}` : 'Foto'}
                tabIndex={i < items.length ? 0 : -1}
              >
                {t.item && <Photo item={t.item} sizes="90px" />}
              </motion.button>
            )
          })}
          <span className={styles.glow} aria-hidden />
        </motion.div>

        <Reveal className={styles.message} y={30} amount={0.4}>
          <h2 className={styles.loveYou}>
            <span className="text-gradient">Te amo</span>
          </h2>
          <Ornament />
          <p className={styles.text}>
            Gracias por estos {together}, por quedarte, por elegirme y por todo lo que todavía nos falta vivir.
            Esta historia apenas empieza, {config.herName}.
          </p>
          <p className={styles.signature}>{config.signature}</p>
        </Reveal>

        <Reveal className={styles.actions} y={20} blur={false} delay={0.1}>
          <Button variant="primary" size="lg" onClick={kiss} icon={<Heart aria-hidden />}>
            Enviar un beso
          </Button>
          <Button variant="ghost" onClick={replayIntro} icon={<RotateCcw aria-hidden />}>
            Ver la intro otra vez
          </Button>
        </Reveal>
      </div>

      <MediaLightbox items={items} index={lightbox} onClose={() => setLightbox(-1)} />
    </section>
  )
}
