/**
 * Música de fondo.
 * ---------------------------------------------------------------------------
 * - `play()` debe llamarse dentro de un gesto del usuario (click/tap) la
 *   primera vez: los navegadores bloquean el audio automático.
 * - Fundidos de volumen suaves (en iOS el volumen es de solo lectura: ahí
 *   simplemente arranca/pausa).
 * - "Ducking" automático: cuando cualquier <video> de la página se reproduce
 *   con sonido, la música se baja y se pausa; al terminar, vuelve sola.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { config } from '../data/config'
import { mediaUrl } from '../lib/media'

export interface MusicContextValue {
  /** Intención del usuario: la música debería sonar. */
  playing: boolean
  /** true mientras un video con sonido tiene la música en pausa. */
  ducked: boolean
  /** Alterna reproducir/pausar (usar en un click). */
  toggle: () => void
  /** Reproduce con fundido de entrada (usar en un click). */
  play: (fadeMs?: number) => void
  /** Pausa con fundido de salida. */
  pause: (fadeMs?: number) => void
  title: string
}

const MusicContext = createContext<MusicContextValue | null>(null)

const MAX_VOLUME = config.song.volume

export function MusicProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fadeRef = useRef<number>(0)
  const wantRef = useRef(false)
  const duckedRef = useRef(false)
  const [playing, setPlaying] = useState(false)
  const [ducked, setDucked] = useState(false)

  const getAudio = useCallback((): HTMLAudioElement => {
    if (!audioRef.current) {
      const a = new Audio(mediaUrl(config.song.src))
      a.loop = true
      a.preload = 'auto'
      a.volume = 0
      audioRef.current = a
    }
    return audioRef.current
  }, [])

  /** Lleva el volumen hasta `target` en `ms` y ejecuta `done` al final. */
  const fadeTo = useCallback((target: number, ms: number, done?: () => void) => {
    const a = audioRef.current
    if (!a) return
    cancelAnimationFrame(fadeRef.current)
    const from = a.volume
    if (ms <= 0 || from === target) {
      try {
        a.volume = target
      } catch {
        /* iOS: volumen de solo lectura */
      }
      done?.()
      return
    }
    const t0 = performance.now()
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms)
      const eased = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2
      try {
        a.volume = from + (target - from) * eased
      } catch {
        /* iOS */
      }
      if (k < 1) fadeRef.current = requestAnimationFrame(step)
      else done?.()
    }
    fadeRef.current = requestAnimationFrame(step)
  }, [])

  const startAudio = useCallback(
    (fadeMs: number) => {
      const a = getAudio()
      const p = a.play()
      fadeTo(MAX_VOLUME, fadeMs)
      p?.catch(() => {
        // Bloqueado por el navegador (sin gesto del usuario).
        wantRef.current = false
        setPlaying(false)
      })
    },
    [getAudio, fadeTo],
  )

  const play = useCallback(
    (fadeMs = 2200) => {
      wantRef.current = true
      setPlaying(true)
      if (duckedRef.current) return // sonará cuando termine el video
      startAudio(fadeMs)
    },
    [startAudio],
  )

  const pause = useCallback(
    (fadeMs = 600) => {
      wantRef.current = false
      setPlaying(false)
      fadeTo(0, fadeMs, () => audioRef.current?.pause())
    },
    [fadeTo],
  )

  const toggle = useCallback(() => {
    if (wantRef.current) pause()
    else play(900)
  }, [play, pause])

  // ---- Ducking: escucha (en fase de captura) los eventos de todos los <video> ----
  useEffect(() => {
    const active = new Set<HTMLMediaElement>()

    const sync = () => {
      const shouldDuck = active.size > 0
      if (shouldDuck === duckedRef.current) return
      duckedRef.current = shouldDuck
      setDucked(shouldDuck)
      if (shouldDuck) {
        fadeTo(0, 350, () => audioRef.current?.pause())
      } else if (wantRef.current) {
        startAudio(1400)
      }
    }

    const isExternal = (t: EventTarget | null): t is HTMLMediaElement =>
      t instanceof HTMLMediaElement && t !== audioRef.current

    const onPlay = (e: Event) => {
      const el = e.target
      if (!isExternal(el)) return
      if (!el.muted && el.volume > 0) active.add(el)
      sync()
    }
    const onStop = (e: Event) => {
      const el = e.target
      if (!isExternal(el)) return
      active.delete(el)
      sync()
    }
    const onVolume = (e: Event) => {
      const el = e.target
      if (!isExternal(el)) return
      if (!el.paused && !el.muted && el.volume > 0) active.add(el)
      else active.delete(el)
      sync()
    }
    // Limpia videos que se desmontaron sin emitir "pause".
    const sweep = window.setInterval(() => {
      let changed = false
      for (const el of active) {
        if (!el.isConnected || el.paused) {
          active.delete(el)
          changed = true
        }
      }
      if (changed) sync()
    }, 1500)

    document.addEventListener('play', onPlay, true)
    document.addEventListener('pause', onStop, true)
    document.addEventListener('ended', onStop, true)
    document.addEventListener('emptied', onStop, true)
    document.addEventListener('volumechange', onVolume, true)
    return () => {
      window.clearInterval(sweep)
      document.removeEventListener('play', onPlay, true)
      document.removeEventListener('pause', onStop, true)
      document.removeEventListener('ended', onStop, true)
      document.removeEventListener('emptied', onStop, true)
      document.removeEventListener('volumechange', onVolume, true)
    }
  }, [fadeTo, startAudio])

  useEffect(
    () => () => {
      cancelAnimationFrame(fadeRef.current)
      audioRef.current?.pause()
    },
    [],
  )

  const value = useMemo<MusicContextValue>(
    () => ({ playing, ducked, toggle, play, pause, title: config.song.title }),
    [playing, ducked, toggle, play, pause],
  )

  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMusic(): MusicContextValue {
  const ctx = useContext(MusicContext)
  if (!ctx) throw new Error('useMusic debe usarse dentro de <MusicProvider>')
  return ctx
}
