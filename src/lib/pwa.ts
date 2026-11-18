/**
 * App instalable (PWA).
 * ---------------------------------------------------------------------------
 * - Registra el service worker (solo en producción).
 * - Guarda el evento "beforeinstallprompt" (Android/Chrome) para mostrar
 *   nuestro propio botón "Instalar".
 * - Al tocar una notificación con la app abierta, el service worker manda un
 *   mensaje y aquí se cambia de vista sin recargar.
 */
import { useSyncExternalStore } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null
let justInstalled = false
let version = 0
const listeners = new Set<() => void>()
const emit = () => {
  version++
  listeners.forEach((l) => l())
}

export function isStandalone(): boolean {
  try {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    )
  } catch {
    return false
  }
}

export function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function isAndroid(): boolean {
  return /android/i.test(navigator.userAgent)
}

/** Navegadores dentro de otras apps (Instagram, Facebook, TikTok…): no permiten instalar. */
export function isInAppBrowser(): boolean {
  return /FBAN|FBAV|Instagram|Line\/|Snapchat|TikTok|musical_ly|; wv\)/i.test(navigator.userAgent)
}

/** Llamar una vez al arrancar (antes de que React monte). */
export function initPwa(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // sin la barrita automática: usamos nuestro botón
    deferred = e as BeforeInstallPromptEvent
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    justInstalled = true
    emit()
  })
  try {
    window.matchMedia('(display-mode: standalone)').addEventListener('change', emit)
  } catch {
    /* navegador antiguo */
  }

  if (!('serviceWorker' in navigator)) return
  navigator.serviceWorker.addEventListener('message', (e: MessageEvent) => {
    const data = e.data as { type?: string; url?: string } | null
    if (data?.type !== 'open' || !data.url) return
    const hash = new URL(data.url).hash
    if (hash && window.location.hash !== hash) window.location.hash = hash
  })
  if (import.meta.env.PROD) {
    const register = () => {
      navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => undefined)
    }
    if (document.readyState === 'complete') register()
    else window.addEventListener('load', register, { once: true })
  }
}

/**
 * - installed: ya se abre como app
 * - prompt:    Android/Chrome: se puede instalar con un toque
 * - ios:       iPhone/iPad: instrucciones de "Agregar a inicio"
 * - manual:    Android sin el evento (p. ej. abierta desde WhatsApp): instrucciones
 * - none:      computador u otro caso (no se muestra nada)
 */
export type InstallMode = 'installed' | 'prompt' | 'ios' | 'manual' | 'none'

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useInstall() {
  useSyncExternalStore(subscribe, () => version)
  const mode: InstallMode =
    isStandalone() || justInstalled ? 'installed' : deferred ? 'prompt' : isIOS() ? 'ios' : isAndroid() ? 'manual' : 'none'

  const prompt = async (): Promise<boolean> => {
    const e = deferred
    if (!e) return false
    await e.prompt()
    const { outcome } = await e.userChoice
    deferred = null
    if (outcome === 'accepted') justInstalled = true
    emit()
    return outcome === 'accepted'
  }

  return { mode, prompt, inApp: isInAppBrowser() }
}
