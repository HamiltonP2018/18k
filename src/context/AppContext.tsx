/**
 * Estado global de la experiencia: candado, intro y modo inmersivo.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { local, STORAGE_KEYS } from '../lib/storage'

export interface AppContextValue {
  /**
   * true cuando ya se ingresó la contraseña correcta. Se recuerda en este
   * dispositivo: al volver a abrir la página entra directo a la historia.
   */
  unlocked: boolean
  unlock: () => void
  /** Vuelve a cerrar con candado y repite toda la experiencia. */
  lock: () => void
  /** true cuando la intro cinematográfica ya terminó o se saltó (también se recuerda). */
  introDone: boolean
  finishIntro: () => void
  /** Vuelve a reproducir la intro. */
  replayIntro: () => void
  /**
   * Modo inmersivo: oculta el dock y el botón de música (lo activan vistas a
   * pantalla completa como las historias en video o la carta).
   */
  immersive: boolean
  setImmersive: (value: boolean) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(() => local.get(STORAGE_KEYS.unlocked) === '1')
  const [introDone, setIntroDone] = useState(() => local.get(STORAGE_KEYS.introDone) === '1')
  const [immersive, setImmersive] = useState(false)

  const unlock = useCallback(() => {
    local.set(STORAGE_KEYS.unlocked, '1')
    setUnlocked(true)
  }, [])

  const lock = useCallback(() => {
    local.remove(STORAGE_KEYS.unlocked)
    local.remove(STORAGE_KEYS.introDone)
    setIntroDone(false)
    setUnlocked(false)
    window.scrollTo(0, 0)
  }, [])

  const finishIntro = useCallback(() => {
    local.set(STORAGE_KEYS.introDone, '1')
    setIntroDone(true)
  }, [])

  const replayIntro = useCallback(() => {
    local.remove(STORAGE_KEYS.introDone)
    setIntroDone(false)
    window.scrollTo(0, 0)
  }, [])

  const value = useMemo<AppContextValue>(
    () => ({ unlocked, unlock, lock, introDone, finishIntro, replayIntro, immersive, setImmersive }),
    [unlocked, unlock, lock, introDone, finishIntro, replayIntro, immersive],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>')
  return ctx
}
