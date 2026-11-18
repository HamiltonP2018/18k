/**
 * "Recuerdos": carrusel 3D (evolución del original). Gira solo despacio,
 * se arrastra con el dedo o el mouse, se detiene en la foto de frente y al
 * tocarla la abre en el visor. Flechas y teclado (← →) también funcionan.
 */
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from 'motion/react'
import { ChevronLeft, ChevronRight, Images } from 'lucide-react'
import { picks } from '../../data/photos'
import { SectionHeading } from '../../components/SectionHeading'
import { Photo } from '../../components/Photo'
import { Button } from '../../components/Button'
import { Reveal } from '../../components/Reveal'
import { MediaLightbox } from '../../components/MediaLightbox'
import { getMany, photos, type MediaItem } from '../../lib/media'
import { ROUTES, SECTIONS } from '../../lib/routes'
import { cx } from '../../lib/cx'
import styles from './CarouselSection.module.css'

const AUTO_DEG_PER_SEC = 7
const DRAG_DEG_PER_PX = 0.28

const mod = (n: number, m: number) => ((n % m) + m) % m

function useCellWidth(): number {
  const get = () => Math.round(Math.min(250, Math.max(150, window.innerWidth * 0.42)))
  const [w, setW] = useState(get)
  useEffect(() => {
    const onResize = () => setW(get())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return w
}

function Cell({
  item,
  index,
  step,
  radius,
  rotation,
  onSelect,
}: {
  item: MediaItem
  index: number
  step: number
  radius: number
  rotation: MotionValue<number>
  onSelect: (index: number) => void
}) {
  // Qué tan de frente está la celda (1 = de frente, 0 = de espaldas).
  const facing = useTransform(rotation, (r) => {
    const a = mod(index * step + r, 360)
    const d = Math.min(a, 360 - a)
    return 1 - d / 180
  })
  const opacity = useTransform(facing, [0, 0.5, 1], [0.3, 0.6, 1])
  // Sombra encima (solo opacidad: mucho más liviano que animar `filter`).
  const shade = useTransform(facing, (f) => 0.7 * (1 - f))

  return (
    <motion.button
      type="button"
      className={styles.cell}
      style={{ transform: `rotateY(${index * step}deg) translateZ(${radius}px)`, opacity }}
      onClick={() => onSelect(index)}
      aria-label={item.caption || `Recuerdo ${index + 1}`}
      tabIndex={-1}
    >
      <Photo item={item} sizes="250px" />
      <motion.span className={styles.shade} style={{ opacity: shade }} aria-hidden />
    </motion.button>
  )
}

export function CarouselSection() {
  const items = useMemo(() => getMany(picks.carousel).filter((m) => !m.sensitive && m.type === 'photo'), [])
  const n = items.length
  const step = 360 / Math.max(1, n)
  const cellW = useCellWidth()
  const radius = Math.round(cellW / 2 / Math.tan(Math.PI / Math.max(3, n))) + 28
  const reduced = useReducedMotion()

  const sceneRef = useRef<HTMLDivElement>(null)
  const inView = useInView(sceneRef, { amount: 0.3 })
  const rotation = useMotionValue(0)
  const ringTransform = useTransform(rotation, (r) => `translateZ(${-radius}px) rotateY(${r}deg)`)
  const [active, setActive] = useState(0)
  const [lightbox, setLightbox] = useState(-1)

  const drag = useRef<{ x: number; start: number; moved: number; id: number } | null>(null)
  const pausedUntil = useRef(0)
  const anim = useRef<ReturnType<typeof animate> | null>(null)

  useMotionValueEvent(rotation, 'change', (r) => {
    const i = mod(Math.round(-r / step), n)
    setActive((prev) => (prev === i ? prev : i))
  })

  // Giro automático lento (solo visible, sin interacción reciente y sin "reducir movimiento").
  useEffect(() => {
    if (!inView || reduced || n < 2) return
    let raf = 0
    let last = performance.now()
    const tick = (t: number) => {
      const dt = (t - last) / 1000
      last = t
      if (!drag.current && !anim.current && t > pausedUntil.current && lightbox < 0) {
        rotation.set(rotation.get() - AUTO_DEG_PER_SEC * dt)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, reduced, n, rotation, lightbox])

  const pause = (ms = 4500) => {
    pausedUntil.current = performance.now() + ms
  }

  const goTo = (target: number) => {
    anim.current?.stop()
    pause()
    anim.current = animate(rotation, target, {
      type: 'spring',
      stiffness: 70,
      damping: 16,
      onComplete: () => {
        anim.current = null
      },
    })
  }

  /** Lleva la celda `i` al frente por el camino más corto. */
  const bringToFront = (i: number) => {
    const r = rotation.get()
    const current = -r / step
    const delta = ((i - current + n / 2) % n + n) % n - n / 2
    goTo(-(current + delta) * step)
  }
  const snap = (velocityDeg = 0) => {
    const projected = rotation.get() + velocityDeg * 0.25
    goTo(Math.round(projected / step) * step)
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    anim.current?.stop()
    anim.current = null
    drag.current = { x: e.clientX, start: rotation.get(), moved: 0, id: e.pointerId }
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const dx = e.clientX - d.x
    d.moved = Math.max(d.moved, Math.abs(dx))
    if (d.moved > 6 && !e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.setPointerCapture(e.pointerId)
    rotation.set(d.start + dx * DRAG_DEG_PER_PX)
  }
  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    drag.current = null
    if (d.moved > 6) snap(rotation.getVelocity())
  }

  const onSelect = (i: number) => {
    if (i === active) setLightbox(i)
    else bringToFront(i)
  }

  const current = items[active]

  return (
    <section id={SECTIONS.carousel} className={cx('section', styles.section)}>
      <div className="container">
        <SectionHeading
          eyebrow="Algunos de mis favoritos"
          title="Recuerdos"
          script="que guardo"
          subtitle="Desliza para girar y toca la foto de frente para verla completa."
        />
      </div>

      <Reveal className={styles.stage} y={40} amount={0.2}>
        <div
          ref={sceneRef}
          className={styles.scene}
          style={{ height: Math.round(cellW * 1.42) + 40 }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') bringToFront(mod(active - 1, n))
            else if (e.key === 'ArrowRight') bringToFront(mod(active + 1, n))
            else if (e.key === 'Enter') setLightbox(active)
          }}
          tabIndex={0}
          role="group"
          aria-roledescription="carrusel"
          aria-label={`Recuerdos. Foto ${active + 1} de ${n}: ${current?.caption ?? ''}`}
        >
          <motion.div className={styles.ring} style={{ transform: ringTransform, width: cellW, height: Math.round(cellW * 1.42) }}>
            {items.map((item, i) => (
              <Cell key={item.id} item={item} index={i} step={step} radius={radius} rotation={rotation} onSelect={onSelect} />
            ))}
          </motion.div>
        </div>
        <div className={styles.floor} aria-hidden />
      </Reveal>

      <div className={cx('container', styles.controls)}>
        <button type="button" className={styles.arrow} onClick={() => bringToFront(mod(active - 1, n))} aria-label="Foto anterior">
          <ChevronLeft aria-hidden strokeWidth={1.5} />
        </button>
        <div className={styles.caption} aria-hidden>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={current?.id}
              className={styles.captionText}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              {current?.caption}
            </motion.p>
          </AnimatePresence>
          <p className={styles.counter}>
            {String(active + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}
          </p>
        </div>
        <button type="button" className={styles.arrow} onClick={() => bringToFront(mod(active + 1, n))} aria-label="Foto siguiente">
          <ChevronRight aria-hidden strokeWidth={1.5} />
        </button>
      </div>

      <div className={styles.cta}>
        <Button to={ROUTES.gallery} variant="outline" icon={<Images aria-hidden />}>
          Ver los {photos.length} recuerdos
        </Button>
      </div>

      <MediaLightbox items={items} index={lightbox} onClose={() => setLightbox(-1)} onIndexChange={bringToFront} />
    </section>
  )
}
