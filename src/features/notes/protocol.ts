/**
 * Protocolo de las notitas compartidas.
 * ---------------------------------------------------------------------------
 * Lo usan los dos lados: la página (src/features/notes) y el servidor
 * (notes-worker/). Sin dependencias del navegador ni de Cloudflare.
 *
 * Conexión: WebSocket a `<VITE_NOTES_URL>/ws?key=…&author=her|him`.
 * Los dibujos se suben como data URL y se sirven en `/img/<id>?key=…`.
 * El texto literal "ping" recibe "pong" (latido para mantener viva la conexión).
 */

/** Quién escribe: ella o él. Cada dispositivo elige una vez. */
export type Author = 'her' | 'him'

export type NoteKind = 'text' | 'drawing'

/** Colores de papel disponibles para las notitas. */
export const NOTE_COLORS = ['cream', 'rose', 'gold', 'lilac', 'mint'] as const
export type NoteColor = (typeof NOTE_COLORS)[number]

export const LIMITS = {
  /** Caracteres máximos de una notita de texto. */
  text: 600,
  /** Tamaño máximo del data URL de un dibujo (caracteres). */
  imageDataUrl: 700_000,
  /** Cuántas notitas se envían al conectarse. */
  history: 300,
  /** Caracteres máximos del título de la notificación. */
  pushTitle: 80,
} as const

/** Actividad en vivo de la otra persona ("está escribiendo…"). */
export type Activity = 'typing' | 'drawing' | null

export interface Presence {
  her: boolean
  him: boolean
}

export interface NoteImage {
  id: string
  w: number
  h: number
}

export interface Note {
  id: string
  author: Author
  kind: NoteKind
  /** Texto (en dibujos, una dedicatoria opcional). */
  text: string
  color: NoteColor
  image: NoteImage | null
  /** La otra persona le dio corazón. */
  hearted: boolean
  /** ms desde epoch. */
  createdAt: number
}

export interface NewNote {
  /** id temporal del cliente para reconciliar la respuesta. */
  tempId: string
  kind: NoteKind
  text?: string
  color: NoteColor
  /** Dibujo como data URL (image/webp, image/png o image/jpeg). */
  image?: { data: string; w: number; h: number }
}

/** Suscripción push tal como la entrega `PushSubscription.toJSON()`. */
export interface PushSub {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export type ClientMessage =
  | { t: 'add'; note: NewNote; pushTitle?: string }
  | { t: 'del'; id: string }
  | { t: 'heart'; id: string; on: boolean }
  | { t: 'act'; a: Activity }
  /** La página está visible (si lo está, no se manda notificación push). */
  | { t: 'vis'; v: boolean }
  /** Ya vi las notitas de la otra persona hasta este instante (ms). */
  | { t: 'seen'; at: number }
  | { t: 'sub'; sub: PushSub }
  | { t: 'unsub'; endpoint: string }

export type ServerMessage =
  | {
      t: 'hello'
      you: Author
      notes: Note[]
      presence: Presence
      /** Clave pública VAPID para suscribirse a notificaciones (null si no está configurado). */
      vapidKey: string | null
      /** Hasta cuándo vio este autor las notitas de la otra persona. */
      seen: number
    }
  | { t: 'added'; note: Note; tempId?: string }
  | { t: 'deleted'; id: string }
  | { t: 'hearted'; id: string; on: boolean }
  | { t: 'presence'; presence: Presence }
  | { t: 'act'; author: Author; a: Activity }
  | { t: 'subbed'; endpoint: string }
  | { t: 'error'; message: string; tempId?: string }

/** Contenido de la notificación push (cifrado de extremo a extremo). */
export interface PushPayload {
  title: string
  body: string
  /** Notitas sin leer (para el globito del ícono). */
  badge: number
  /** Ruta relativa que se abre al tocar la notificación. */
  url: string
  tag: string
}

export const otherAuthor = (a: Author): Author => (a === 'her' ? 'him' : 'her')
