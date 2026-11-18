/**
 * "Nuestra historia": capítulos en una línea de tiempo que se dibuja al
 * hacer scroll. Celular: línea a la izquierda. Pantallas anchas: línea al
 * centro, texto y fotos alternando lados. Tocar una foto abre el visor.
 */
import { useRef, useState } from 'react'
import { motion, useReducedMotion, useScroll, useSpring } from 'motion/react'
import { Quote } from 'lucide-react'
import { chapters, type Chapter } from '../../data/timeline'
import { SectionHeading } from '../../components/SectionHeading'
import { Photo } from '../../components/Photo'
import { Reveal } from '../../components/Reveal'
import { MediaLightbox } from '../../components/MediaLightbox'
import { HeartIcon } from '../../components/Ornament'
import { getMany, type MediaItem } from '../../lib/media'
import { SECTIONS } from '../../lib/routes'
import { cx } from '../../lib/cx'
import styles from './TimelineSection.module.css'

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

function ChapterPhotos({ items, onOpen }: { items: MediaItem[]; onOpen: (i: number) => void }) {
  if (items.length === 0) return null
  const [main, ...rest] = items
  return (
    <div className={cx(styles.photos, rest.length === 0 && styles.photosSingle)}>
      <button type="button" className={styles.mainPhoto} onClick={() => onOpen(0)} aria-label={`Ver foto: ${main.caption}`}>
        <Photo item={main} sizes="(min-width: 900px) 34vw, 80vw" />
        {main.caption && <span className={styles.photoCaption}>{main.caption}</span>}
      </button>
      {rest.length > 0 && (
        <div className={styles.thumbs}>
          {rest.slice(0, 3).map((item, i) => (
            <button
              key={item.id}
              type="button"
              className={styles.thumb}
              onClick={() => onOpen(i + 1)}
              aria-label={`Ver foto: ${item.caption}`}
              style={{ rotate: `${(i - 1) * 3}deg` }}
            >
              <Photo item={item} sizes="(min-width: 900px) 12vw, 26vw" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ChapterRow({ chapter, index, onOpen }: { chapter: Chapter; index: number; onOpen: (items: MediaItem[], i: number) => void }) {
  const items = getMany(chapter.photos).filter((m) => !m.sensitive)
  const flip = index % 2 === 1
  const last = index === chapters.length - 1
  return (
    <li className={cx(styles.row, flip && styles.flip, last && styles.last)}>
      <span className={styles.node} aria-hidden>
        <HeartIcon className={styles.nodeHeart} />
      </span>

      <Reveal className={styles.text} x={flip ? 30 : -30} y={10} amount={0.3}>
        <p className={cx('eyebrow', styles.when)}>
          <span className={styles.roman}>{ROMAN[index] ?? index + 1}</span>
          {chapter.date ? <time dateTime={chapter.date}>{chapter.when}</time> : chapter.when}
        </p>
        <h3 className={styles.title}>{chapter.title}</h3>
        <p className={styles.body}>{chapter.text}</p>
        {chapter.quote && (
          <blockquote className={styles.quote}>
            <Quote className={styles.quoteIcon} aria-hidden strokeWidth={1.4} />
            <p>{chapter.quote}</p>
          </blockquote>
        )}
      </Reveal>

      <Reveal className={styles.media} y={40} scale={0.96} amount={0.2} delay={0.1}>
        <ChapterPhotos items={items} onOpen={(i) => onOpen(items, i)} />
      </Reveal>
    </li>
  )
}

export function TimelineSection() {
  const listRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: listRef, offset: ['start 75%', 'end 55%'] })
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.6 })
  const [lightbox, setLightbox] = useState<{ items: MediaItem[]; index: number } | null>(null)

  return (
    <section id={SECTIONS.timeline} className={cx('section', styles.section)}>
      <div className="container">
        <SectionHeading
          eyebrow="Capítulo a capítulo"
          title="Nuestra historia"
          script="hasta hoy"
          subtitle="Desde el día que empezó todo hasta este momento."
        />

        <div ref={listRef} className={styles.timeline}>
          <span className={styles.line} aria-hidden>
            <motion.span className={styles.lineFill} style={{ scaleY: reduced ? 1 : progress }} />
          </span>
          <ol className={styles.list}>
            {chapters.map((chapter, i) => (
              <ChapterRow key={chapter.id} chapter={chapter} index={i} onOpen={(items, index) => setLightbox({ items, index })} />
            ))}
          </ol>
        </div>
      </div>

      <MediaLightbox items={lightbox?.items ?? []} index={lightbox?.index ?? -1} onClose={() => setLightbox(null)} />
    </section>
  )
}
