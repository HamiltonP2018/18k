/**
 * Vista "Momentos" (#/momentos): los videos como historias a pantalla completa.
 * - Avanza solo al terminar cada video; tocar a la derecha/izquierda = siguiente/anterior.
 * - Mantener presionado pausa. Teclado: ← → espacio (pausa), M (sonido), Esc (cerrar).
 * - Con sonido por defecto (la música de fondo se baja sola); si el navegador
 *   no lo permite, arranca en silencio con un botón para activarlo.
 * - Abajo, una tira con todos los videos para saltar a cualquiera.
 */
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useLocation } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { Page } from '../../components/Page'
import { BackButton } from '../../components/BackButton'
import { useGoBack } from '../../hooks/useGoBack'
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll'
import { formatDuration, imageUrl, videos, videoUrl } from '../../lib/media'
import { formatDayMonth } from '../../lib/time'
import { cx } from '../../lib/cx'
import type { MomentsNavState } from './MomentsSection'
import styles from './MomentsPage.module.css'

const HOLD_MS = 220

export default function MomentsPage() {
  const { setImmersive } = useApp()
  const goBack = useGoBack()
  const location = useLocation()
  const startId = (location.state as MomentsNavState | null)?.id
  const list = videos
  const [index, setIndex] = useState(() => Math.max(0, list.findIndex((v) => v.id === startId)))
  const [muted, setMuted] = useState(false)
  const [paused, setPaused] = useState(false)
  const [needsTap, setNeedsTap] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const fillRef = useRef<HTMLSpanElement>(null)
  const railRef = useRef<HTMLDivElement>(null)
  const hold = useRef<{ t: number; timer: number; held: boolean } | null>(null)

  useLockBodyScroll()
  useEffect(() => {
    setImmersive(true)
    return () => setImmersive(false)
  }, [setImmersive])

  const item = list[index]
  const go = useCallback(
    (delta: number) => setIndex((i) => (list.length ? (i + delta + list.length) % list.length : 0)),
    [list.length],
  )

  // Arranca cada video (con sonido si el navegador lo permite).
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = 0
    v.muted = muted
    setPaused(false)
    const p = v.play()
    p?.catch(() => {
      v.muted = true
      setMuted(true)
      setNeedsTap(true)
      v.play().catch(() => setPaused(true))
    })
    railRef.current?.querySelector<HTMLElement>(`[data-i="${index}"]`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  // Barra de progreso fluida (rAF, sin re-renderizar).
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const v = videoRef.current
      if (v && fillRef.current && v.duration) fillRef.current.style.transform = `scaleX(${v.currentTime / v.duration})`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [index])

  const togglePause = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      void v.play().catch(() => {})
      setPaused(false)
    } else {
      v.pause()
      setPaused(true)
    }
  }, [])

  const toggleMute = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
    setNeedsTap(false)
    if (v.paused) void v.play().catch(() => {})
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === ' ') {
        e.preventDefault()
        togglePause()
      } else if (e.key.toLowerCase() === 'm') toggleMute()
      else if (e.key === 'Escape') goBack()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, togglePause, toggleMute, goBack])

  // Tocar = navegar; mantener = pausar.
  const onPointerDown = () => {
    const timer = window.setTimeout(() => {
      if (!hold.current) return
      hold.current.held = true
      videoRef.current?.pause()
    }, HOLD_MS)
    hold.current = { t: performance.now(), timer, held: false }
  }
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const h = hold.current
    hold.current = null
    if (!h) return
    window.clearTimeout(h.timer)
    if (h.held) {
      if (!paused) void videoRef.current?.play().catch(() => {})
      return
    }
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    go(x < 0.3 ? -1 : 1)
  }
  const onPointerCancel = () => {
    const h = hold.current
    hold.current = null
    if (h) window.clearTimeout(h.timer)
    if (h?.held && !paused) void videoRef.current?.play().catch(() => {})
  }

  if (!item) {
    return (
      <Page className={styles.empty}>
        <BackButton />
        <p>Aún no hay videos.</p>
      </Page>
    )
  }

  return (
    <Page className={styles.page} label="Momentos en video">
      {/* Fondo: póster difuminado */}
      <AnimatePresence initial={false}>
        <motion.img
          key={item.id}
          className={styles.bg}
          src={imageUrl(item, 640)}
          alt=""
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        />
      </AnimatePresence>

      <div className={styles.viewer}>
        <div className={styles.bars} aria-hidden>
          {list.map((v, i) => (
            <span key={v.id} className={styles.bar}>
              <span
                ref={i === index ? fillRef : undefined}
                className={styles.fill}
                style={{ transform: `scaleX(${i < index ? 1 : 0})` }}
              />
            </span>
          ))}
        </div>

        <header className={styles.header}>
          <div className={styles.meta}>
            <p className={styles.title}>{item.caption}</p>
            <p className={styles.sub}>
              {item.date ? formatDayMonth(item.date) : 'Un momento'} · {formatDuration(item.video?.duration ?? 0)} ·{' '}
              {index + 1}/{list.length}
            </p>
          </div>
          <button type="button" className={styles.iconBtn} onClick={togglePause} aria-label={paused ? 'Reproducir' : 'Pausar'}>
            {paused ? <Play aria-hidden strokeWidth={1.6} /> : <Pause aria-hidden strokeWidth={1.6} />}
          </button>
          <button
            type="button"
            className={cx(styles.iconBtn, needsTap && styles.attention)}
            onClick={toggleMute}
            aria-label={muted ? 'Activar sonido' : 'Silenciar'}
          >
            {muted ? <VolumeX aria-hidden strokeWidth={1.6} /> : <Volume2 aria-hidden strokeWidth={1.6} />}
          </button>
        </header>

        <div
          className={styles.stage}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onContextMenu={(e) => e.preventDefault()}
        >
          <video
            key={item.id}
            ref={videoRef}
            className={styles.video}
            src={videoUrl(item) ?? undefined}
            poster={imageUrl(item, 1280)}
            playsInline
            preload="auto"
            disablePictureInPicture
            onEnded={() => go(1)}
            aria-label={item.alt}
          />
          <AnimatePresence>
            {paused && (
              <motion.span
                className={styles.pausedBadge}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                aria-hidden
              >
                <Play strokeWidth={1.4} />
              </motion.span>
            )}
          </AnimatePresence>
          {needsTap && (
            <button type="button" className={styles.soundHint} onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()} onClick={toggleMute}>
              <VolumeX aria-hidden strokeWidth={1.6} /> Toca para activar el sonido
            </button>
          )}
        </div>

        <div ref={railRef} className={styles.rail} role="tablist" aria-label="Todos los momentos">
          {list.map((v, i) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              data-i={i}
              aria-selected={i === index}
              className={cx(styles.thumb, i === index && styles.thumbActive)}
              onClick={() => setIndex(i)}
              aria-label={v.caption}
            >
              <img src={imageUrl(v, 640)} alt="" loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      </div>

      <BackButton icon="close" label="Cerrar momentos" />
    </Page>
  )
}
