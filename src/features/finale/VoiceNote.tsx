/**
 * Mensaje de voz de él (al final de la página), como una nota de voz.
 * Es un <audio> real dentro de la página: así la música de fondo se pausa
 * sola mientras suena y vuelve al terminar (ver MusicContext → ducking).
 */
import { useRef, useState, type CSSProperties } from 'react'
import { Pause, Play } from 'lucide-react'
import { config } from '../../data/config'
import { mediaUrl } from '../../lib/media'
import { heartBurst } from '../../lib/confetti'
import { cx } from '../../lib/cx'
import styles from './VoiceNote.module.css'

const BARS = 30
/** Alturas fijas (0–1) que dibujan la "onda" de la nota de voz. */
const SHAPE = Array.from({ length: BARS }, (_, i) => 0.3 + 0.7 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.55)))

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export function VoiceNote() {
  const { voiceNote } = config
  const audio = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)

  if (!voiceNote.src) return null

  const toggle = () => {
    const a = audio.current
    if (!a) return
    if (a.paused) a.play().catch(() => setPlaying(false))
    else a.pause()
  }

  const onEnded = () => {
    setPlaying(false)
    setTime(0)
    if (audio.current) audio.current.currentTime = 0
    heartBurst({ y: 0.6, count: 70, power: 0.8 })
  }

  const readDuration = () => {
    const d = audio.current?.duration ?? 0
    if (Number.isFinite(d) && d > 0) setDuration(d)
  }

  const progress = duration > 0 ? Math.min(1, time / duration) : 0
  const shown = playing || time > 0 ? time : duration

  return (
    <div className={cx(styles.card, playing && styles.playing)}>
      <button
        type="button"
        className={styles.play}
        onClick={toggle}
        aria-label={playing ? 'Pausar el mensaje de voz' : 'Escuchar el mensaje de voz'}
      >
        {playing ? <Pause aria-hidden fill="currentColor" strokeWidth={0} /> : <Play aria-hidden fill="currentColor" strokeWidth={0} />}
      </button>

      <div className={styles.body}>
        <p className={styles.title}>{voiceNote.title}</p>
        <div className={styles.wave} aria-hidden>
          {SHAPE.map((h, i) => (
            <span key={i} className={cx(styles.bar, (i + 0.5) / BARS <= progress && styles.done)} style={{ '--h': h, '--i': i } as CSSProperties} />
          ))}
        </div>
        <p className={styles.meta}>
          <span>{voiceNote.caption}</span>
          {shown > 0 && <span className={styles.time}>{clock(shown)}</span>}
        </p>
      </div>

      <audio
        ref={audio}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={onEnded}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={readDuration}
        onDurationChange={readDuration}
      >
        <source src={mediaUrl(voiceNote.src)} type="audio/mp4" />
        {voiceNote.fallback && <source src={mediaUrl(voiceNote.fallback)} type="audio/ogg; codecs=opus" />}
      </audio>
    </div>
  )
}
