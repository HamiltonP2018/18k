/**
 * Notificaciones push del navegador (para avisar de notitas nuevas).
 * - Android/Chrome: funcionan desde el navegador o instalada.
 * - iPhone (iOS 16.4+): SOLO con la página instalada en la pantalla de inicio.
 */
import { isIOS, isStandalone } from '../../lib/pwa'

export type PushSupport = 'ok' | 'needs-install' | 'unsupported'

export function pushSupport(): PushSupport {
  if (isIOS() && !isStandalone()) return 'needs-install'
  if (!import.meta.env.PROD) return 'unsupported' // el service worker solo existe en producción
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported'
  return 'ok'
}

export function permission(): NotificationPermission {
  return 'Notification' in window ? Notification.permission : 'denied'
}

function keyToBytes(b64url: string): Uint8Array<ArrayBuffer> {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64url.length + 3) % 4)
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function sameServerKey(sub: PushSubscription, vapidKey: string): boolean {
  const k = sub.options?.applicationServerKey
  if (!k) return false
  const a = new Uint8Array(k)
  const b = keyToBytes(vapidKey)
  return a.length === b.length && a.every((v, i) => v === b[i])
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  return (await navigator.serviceWorker.getRegistration()) ?? null
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await registration()
  return reg ? reg.pushManager.getSubscription() : null
}

/**
 * Pide permiso y se suscribe. Debe llamarse directamente desde un toque
 * (iOS lo exige): el permiso se pide antes de cualquier otra espera.
 */
export async function subscribePush(vapidKey: string): Promise<PushSubscription> {
  const result = await Notification.requestPermission()
  if (result !== 'granted') throw new Error(result === 'denied' ? 'denied' : 'dismissed')
  const reg = (await registration()) ?? (await navigator.serviceWorker.ready)
  const existing = await reg.pushManager.getSubscription()
  if (existing) {
    if (sameServerKey(existing, vapidKey)) return existing
    await existing.unsubscribe()
  }
  return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(vapidKey) })
}

export async function unsubscribePush(): Promise<string | null> {
  const sub = await currentSubscription()
  if (!sub) return null
  const endpoint = sub.endpoint
  await sub.unsubscribe()
  return endpoint
}

/** Quita el globito del ícono de la app. */
export function clearBadge(): void {
  try {
    void (navigator as Navigator & { clearAppBadge?: () => Promise<void> }).clearAppBadge?.()
  } catch {
    /* sin soporte */
  }
}
