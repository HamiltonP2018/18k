/**
 * Service worker de "Nuestra Historia".
 * ---------------------------------------------------------------------------
 * - La página abre aunque no haya internet (última versión guardada).
 * - JS/CSS (con hash), fuentes, íconos y fotos ya vistas: desde la caché.
 * - Audio y video NO se tocan: Safari los pide por rangos y cachearlos rompe
 *   la reproducción.
 * - Notificaciones push de las notitas (globito en el ícono + abrir la app).
 */
const CACHE = 'nh-v1'
const SCOPE = self.registration.scope
const INDEX = new URL('./', SCOPE).href

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll([INDEX, new URL('manifest.webmanifest', SCOPE).href, new URL('icons/icon-192.png', SCOPE).href]))
      .catch(() => undefined),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key)
      await self.clients.claim()
    })(),
  )
})

/** Navegación: red primero (para ver siempre lo último); sin red, la copia guardada. */
async function networkFirst(request) {
  const cache = await caches.open(CACHE)
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 6000)
    const res = await fetch(request, { signal: controller.signal })
    clearTimeout(timer)
    if (res.ok) await cache.put(INDEX, res.clone())
    return res
  } catch {
    return (await cache.match(INDEX)) || Response.error()
  }
}

/** Archivos que no cambian (hash en el nombre, fotos, fuentes): caché primero. */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE)
  const hit = await cache.match(request)
  if (hit) return hit
  const res = await fetch(request)
  if (res.ok && res.type === 'basic') cache.put(request, res.clone()).catch(() => undefined)
  return res
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET' || req.headers.has('range')) return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return // servidor de notitas, etc.

  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req))
    return
  }
  const path = url.pathname
  if (/\.(mp4|webm|mov|mp3|m4a|ogg|wav)$/i.test(path)) return
  if (path.endsWith('/sw.js')) return
  if (/\/(assets|media|icons)\//.test(path) || /\.(woff2?|webp|png|jpe?g|svg|ico)$/i.test(path)) {
    event.respondWith(cacheFirst(req))
  }
})

// ---------------------------------------------------------------------------
// Notificaciones push (notitas)
// ---------------------------------------------------------------------------
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  const title = data.title || 'Nueva notita 💌'
  event.waitUntil(
    (async () => {
      if (typeof data.badge === 'number' && self.navigator.setAppBadge) {
        try {
          await self.navigator.setAppBadge(data.badge)
        } catch {
          /* sin soporte de globito */
        }
      }
      await self.registration.showNotification(title, {
        body: data.body || '',
        icon: new URL('icons/icon-192.png', SCOPE).href,
        badge: new URL('icons/badge-96.png', SCOPE).href,
        tag: data.tag || 'notitas',
        renotify: true,
        data: { url: data.url || './#/notas' },
      })
    })(),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || './', SCOPE).href
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const win of windows) {
        if (!win.url.startsWith(SCOPE)) continue
        // La app abierta cambia de vista sola (sin recargar la página).
        win.postMessage({ type: 'open', url: target })
        if ('focus' in win) await win.focus()
        return
      }
      await self.clients.openWindow(target)
    })(),
  )
})
