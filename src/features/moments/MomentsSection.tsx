/**
 * "Momentos en video": tarjetas que se reproducen solas y en silencio cuando
 * están a la vista. Tocar una abre la vista de historias (con sonido).
 */
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { Clapperboard, Play } from 'lucide-react'
import { picks } from '../../data/photos'
import { SectionHeading } from '../../components/SectionHeading'
import { Button } from '../../components/Button'
import { Reveal } from '../../components/Reveal'
import { formatDuration, getMany, imageUrl, objectPosition, videos, videoUrl, type MediaItem } from '../../lib/media'
import { ROUTES, SECTIONS } from '../../lib/routes'
import { formatDayMonth } from '../../lib/time'
import { cx } from '../../lib/cx'
import styles from './MomentsSection.module.css'

export interface MomentsNavState {
  /** id del video con el que abre la vista de historias. */
  id?: string
}

function MomentCard({ item, onOpen }: { item: MediaItem; onOpen: () => void }) {
  const ref = useRef<HTMLVideoElement>(null)

  // Reproduce en silencio solo mientras está bien visible (ahorra batería y datos).
  useEffect(() => {
    const video = ref.current
    if (!video) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {})
        else video.pause()
      },
      { threshold: 0.65 },
    )
    io.observe(video)
    return () => io.disconnect()
  }, [])

  return (
    <button type="button" className={styles.card} onClick={onOpen} aria-label={`Ver video: ${item.caption}`}>
      <video
        ref={ref}
        className={styles.video}
        src={videoUrl(item) ?? undefined}
        poster={imageUrl(item, 640)}
        muted
        loop
        playsInline
        preload="none"
        disablePictureInPicture
        style={{ objectPosition: objectPosition(item), backgroundColor: item.color }}
        aria-hidden
        tabIndex={-1}
      />
      <span className={styles.shade} aria-hidden />
      <span className={styles.play} aria-hidden>
        <Play strokeWidth={1.5} />
      </span>
      <span className={styles.meta}>
        <span className={styles.title}>{item.caption}</span>
        <span className={styles.sub}>
          {item.date ? formatDayMonth(item.date) : 'Un momento'} · {formatDuration(item.video?.duration ?? 0)}
        </span>
      </span>
    </button>
  )
}

export function MomentsSection() {
  const navigate = useNavigate()
  const items = getMany(picks.moments).filter((m) => m.type === 'video' && !m.sensitive)
  if (items.length === 0) return null

  const open = (item: MediaItem) => {
    const state: MomentsNavState = { id: item.id }
    navigate(ROUTES.moments, { state })
  }

  return (
    <section id={SECTIONS.moments} className={cx('section', styles.section)}>
      <div className="container">
        <SectionHeading
          eyebrow="Con movimiento y sonido"
          title="Momentos"
          script="en video"
          subtitle="Porque hay risas que una foto no alcanza a guardar."
        />
      </div>

      <Reveal className={styles.rail} y={30} blur={false} amount={0.15}>
        {items.map((item) => (
          <MomentCard key={item.id} item={item} onOpen={() => open(item)} />
        ))}
      </Reveal>

      <div className={styles.cta}>
        <Button to={ROUTES.moments} variant="outline" icon={<Clapperboard aria-hidden />}>
          Ver los {videos.length} momentos
        </Button>
      </div>
    </section>
  )
}
