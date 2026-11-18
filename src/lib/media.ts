/**
 * Acceso tipado a las fotos y videos.
 * ---------------------------------------------------------------------------
 * Combina el manifiesto generado por `npm run media`
 * (`src/data/media.generated.json`, NO editar a mano) con la curaduría
 * escrita a mano en `src/data/photos.ts` (leyendas, álbumes, puntos focales…).
 */
import manifest from '../data/media.generated.json'
import { albums, photoMeta, videoMeta, type AlbumId } from '../data/photos'

export interface Variant {
  /** Ancho real en px. */
  w: number
  /** Alto real en px. */
  h: number
  /** Ruta relativa a `public/` (p. ej. "media/p/orig-01-1280.webp"). */
  file: string
}

interface RawBase {
  id: string
  batch: string
  original: string
  date: string | null
  time: string | null
  dateSource: string
  width: number
  height: number
  aspect: number
  /** Giro aplicado por el pipeline (media-src/overrides.json). */
  rotate?: number
  color: string
  lqip: string
}
interface RawPhoto extends RawBase {
  type: 'photo'
  variants: Variant[]
}
interface RawVideo extends RawBase {
  type: 'video'
  src: string
  duration: number
  hasAudio: boolean
  poster: Variant[]
}
type RawItem = RawPhoto | RawVideo

export interface VideoInfo {
  /** Ruta relativa a `public/` del MP4. */
  src: string
  /** Duración en segundos. */
  duration: number
  hasAudio: boolean
}

/** Un elemento multimedia ya resuelto y listo para pintar. */
export interface MediaItem {
  id: string
  type: 'photo' | 'video'
  width: number
  height: number
  /** ancho / alto */
  aspect: number
  /** Color dominante (fondo mientras carga). */
  color: string
  /** Placeholder borroso diminuto (data URI). */
  lqip: string
  /** Fecha local "YYYY-MM-DD" o null si se desconoce. */
  date: string | null
  /** Hora local "HH:mm" o null. */
  time: string | null
  /** Variantes de imagen ordenadas de menor a mayor (en videos: el póster). */
  variants: Variant[]
  /** Leyenda romántica (en videos, el título). */
  caption: string
  /** Texto alternativo accesible. */
  alt: string
  /** Punto focal [x%, y%] para recortes con object-fit: cover. */
  focal: [number, number]
  album: AlbumId | null
  /** Fotos reveladoras: solo en la galería, nunca en portada/intro/mosaico. */
  sensitive: boolean
  /** Oculto en toda la página. */
  hidden: boolean
  /** Datos del video (null en fotos). */
  video: VideoInfo | null
}

const DEFAULT_FOCAL: [number, number] = [50, 40]

function resolve(raw: RawItem): MediaItem {
  if (raw.type === 'video') {
    const meta = videoMeta[raw.id] ?? {}
    return {
      id: raw.id,
      type: 'video',
      width: raw.width,
      height: raw.height,
      aspect: raw.aspect,
      color: raw.color,
      lqip: raw.lqip,
      date: raw.date,
      time: raw.time,
      variants: raw.poster,
      caption: meta.title ?? 'Un momento juntos',
      alt: meta.alt ?? meta.title ?? 'Video de la pareja',
      focal: meta.focal ?? DEFAULT_FOCAL,
      album: null,
      sensitive: meta.sensitive ?? false,
      hidden: meta.hidden ?? false,
      video: { src: raw.src, duration: raw.duration, hasAudio: raw.hasAudio },
    }
  }
  const meta = photoMeta[raw.id] ?? {}
  return {
    id: raw.id,
    type: 'photo',
    width: raw.width,
    height: raw.height,
    aspect: raw.aspect,
    color: raw.color,
    lqip: raw.lqip,
    date: raw.date,
    time: raw.time,
    variants: raw.variants,
    caption: meta.caption ?? '',
    alt: meta.alt ?? meta.caption ?? 'Foto de nuestra historia',
    focal: meta.focal ?? DEFAULT_FOCAL,
    album: meta.album ?? null,
    sensitive: meta.sensitive ?? false,
    hidden: meta.hidden ?? false,
    video: null,
  }
}

/** Todos los elementos (incluye ocultos), en el orden del manifiesto. */
export const allMedia: MediaItem[] = (manifest.items as RawItem[]).map(resolve)

const byId = new Map(allMedia.map((m) => [m.id, m]))

/** Fotos visibles. */
export const photos: MediaItem[] = allMedia.filter((m) => m.type === 'photo' && !m.hidden)
/** Videos visibles. */
export const videos: MediaItem[] = allMedia.filter((m) => m.type === 'video' && !m.hidden)

/** Busca un elemento por id (undefined si no existe). */
export function getMedia(id: string): MediaItem | undefined {
  return byId.get(id)
}

/** Resuelve una lista de ids, descartando los que no existen o están ocultos. */
export function getMany(ids: readonly string[]): MediaItem[] {
  const out: MediaItem[] = []
  for (const id of ids) {
    const m = byId.get(id)
    if (m && !m.hidden) out.push(m)
    else if (import.meta.env.DEV && !m) console.warn(`[media] id desconocido: ${id}`)
  }
  return out
}

/** Fotos visibles de un álbum (en orden cronológico del manifiesto). */
export function getAlbum(albumId: AlbumId): MediaItem[] {
  return photos.filter((p) => p.album === albumId)
}

export { albums }
export type { AlbumId }

// ---------------------------------------------------------------------------
// URLs
// ---------------------------------------------------------------------------
/** Convierte una ruta de `public/` en URL respetando el `base` de Vite. */
export function mediaUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`
}

/** Atributo `srcset` con todas las variantes ("url 640w, url 1280w, …"). */
export function srcSet(item: MediaItem): string {
  return item.variants.map((v) => `${mediaUrl(v.file)} ${v.w}w`).join(', ')
}

/** La variante más pequeña cuyo lado largo es >= `edge` (o la mayor disponible). */
export function pickVariant(item: MediaItem, edge = 1280): Variant {
  const sorted = [...item.variants].sort((a, b) => Math.max(a.w, a.h) - Math.max(b.w, b.h))
  return sorted.find((v) => Math.max(v.w, v.h) >= edge) ?? sorted[sorted.length - 1]
}

/** URL de imagen apropiada para un lado largo dado. */
export function imageUrl(item: MediaItem, edge = 1280): string {
  return mediaUrl(pickVariant(item, edge).file)
}

/** URL del MP4 de un video (null si es foto). */
export function videoUrl(item: MediaItem): string | null {
  return item.video ? mediaUrl(item.video.src) : null
}

/** "x% y%" para `object-position`. */
export function objectPosition(item: MediaItem): string {
  return `${item.focal[0]}% ${item.focal[1]}%`
}

/** 75.4 → "1:15" */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Precarga imágenes (p. ej. la portada mientras se escribe la contraseña). */
export function preloadImages(items: MediaItem[], edge = 1280): void {
  for (const item of items) {
    const img = new Image()
    img.decoding = 'async'
    img.src = imageUrl(item, edge)
  }
}
