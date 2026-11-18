/**
 * Una notita: papel de color con cinta, texto manuscrito o dibujo, autor y
 * hace cuánto. Corazón para las de la otra persona; borrar para las propias.
 */
import { memo, useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Heart, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { authorLabel, imageSrc } from './config'
import { PAPER } from './colors'
import type { LocalNote } from './NotesContext'
import type { Author } from './protocol'
import { cx } from '../../lib/cx'
import styles from './NoteCard.module.css'

/** Giro pequeño y estable a partir del id (cada notita queda "pegada" distinta). */
function tilt(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return ((Math.abs(h) % 50) - 25) / 10
}

/** Hace cuánto, en corto (cabe en tarjetas angostas): "ahora", "hace 5 min", "hace 2 h", "12 nov". */
function timeAgo(ms: number): string {
  const s = Math.max(0, (Date.now() - ms) / 1000)
  if (s < 45) return 'ahora mismo'
  if (s < 3600) return `hace ${Math.max(1, Math.round(s / 60))} min`
  if (s < 86_400) return `hace ${Math.round(s / 3600)} h`
  if (s < 7 * 86_400) return `hace ${Math.round(s / 86_400)} d`
  return format(ms, 'd MMM', { locale: es })
}

export interface NoteCardProps {
  note: LocalNote
  me: Author
  onHeart?: (on: boolean) => void
  onDelete?: () => void
  /** Versión pequeña (adelanto en el inicio). */
  compact?: boolean
}

export const NoteCard = memo(function NoteCard({ note, me, onHeart, onDelete, compact }: NoteCardProps) {
  const reduced = useReducedMotion()
  const mine = note.author === me
  const [confirm, setConfirm] = useState(false)
  const [, tick] = useState(0)

  // Refresca "hace X minutos".
  useEffect(() => {
    const t = window.setInterval(() => tick((n) => n + 1), 60_000)
    return () => window.clearInterval(t)
  }, [])

  useEffect(() => {
    if (!confirm) return
    const t = window.setTimeout(() => setConfirm(false), 3500)
    return () => window.clearTimeout(t)
  }, [confirm])

  const src = note.localImage ?? (note.image?.id ? imageSrc(note.image.id) : null)
  const rotate = tilt(note.id.startsWith('tmp-') ? note.createdAt.toString() : note.id)

  return (
    <motion.article
      layout={!reduced}
      className={cx(styles.note, compact && styles.compact, mine ? styles.mine : styles.theirs, note.pending && styles.pending)}
      style={{ '--paper': PAPER[note.color].bg, '--tilt': `${rotate}deg` } as React.CSSProperties}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: -24, scale: 0.9, rotate: rotate * 3 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.85, y: 10, transition: { duration: 0.25 } }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      onDoubleClick={!mine && onHeart ? () => onHeart(!note.hearted) : undefined}
      aria-label={`Notita de ${mine ? 'ti' : authorLabel(note.author)}`}
    >
      <span className={styles.tape} aria-hidden />

      {note.kind === 'drawing' && src && (
        <img
          className={styles.drawing}
          src={src}
          alt={note.text ? `Dibujo: ${note.text}` : 'Dibujo'}
          width={note.image?.w}
          height={note.image?.h}
          loading="lazy"
          draggable={false}
        />
      )}
      {note.text && <p className={cx(styles.text, note.kind === 'drawing' && styles.caption)}>{note.text}</p>}

      <footer className={styles.footer}>
        <span className={styles.meta}>
          <span className={styles.author}>{mine ? 'Tú' : authorLabel(note.author)}</span>
          <time dateTime={new Date(note.createdAt).toISOString()}>{note.pending ? 'enviando…' : timeAgo(note.createdAt)}</time>
        </span>

        {!compact && !note.pending && (
          <span className={styles.actions}>
            {mine ? (
              <>
                {note.hearted && <Heart className={styles.heartBadge} aria-label="Le encantó" fill="currentColor" />}
                {onDelete && (
                  <button
                    type="button"
                    className={cx(styles.iconBtn, confirm && styles.confirm)}
                    onClick={() => (confirm ? onDelete() : setConfirm(true))}
                    aria-label={confirm ? 'Confirmar: borrar notita' : 'Borrar notita'}
                  >
                    <Trash2 aria-hidden strokeWidth={1.8} />
                    {confirm && <span>¿Borrar?</span>}
                  </button>
                )}
              </>
            ) : (
              onHeart && (
                <motion.button
                  type="button"
                  className={cx(styles.iconBtn, styles.heartBtn, note.hearted && styles.hearted)}
                  onClick={() => onHeart(!note.hearted)}
                  aria-pressed={note.hearted}
                  aria-label={note.hearted ? 'Quitar corazón' : 'Darle corazón'}
                  whileTap={{ scale: 1.35 }}
                >
                  <Heart aria-hidden strokeWidth={1.8} fill={note.hearted ? 'currentColor' : 'none'} />
                </motion.button>
              )
            )}
          </span>
        )}
        {compact && note.hearted && <Heart className={styles.heartBadge} aria-label="Con corazón" fill="currentColor" />}
      </footer>
    </motion.article>
  )
})
