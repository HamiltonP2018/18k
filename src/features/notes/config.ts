/**
 * Configuración de las notitas compartidas.
 * Se activan solo si el build tiene VITE_NOTES_URL y VITE_NOTES_KEY
 * (ver notes-worker/README.md). Sin ellas, la página funciona igual y
 * simplemente no muestra la sección.
 */
import { config } from '../../data/config'
import type { Author } from './protocol'

export const NOTES_URL = (import.meta.env.VITE_NOTES_URL ?? '').trim().replace(/\/+$/, '')
export const NOTES_KEY = (import.meta.env.VITE_NOTES_KEY ?? '').trim()
export const notesEnabled = Boolean(NOTES_URL && NOTES_KEY)

export const wsUrl = (author: Author) =>
  `${NOTES_URL.replace(/^http/, 'ws')}/ws?key=${encodeURIComponent(NOTES_KEY)}&author=${author}`

export const imageSrc = (id: string) => `${NOTES_URL}/img/${encodeURIComponent(id)}?key=${encodeURIComponent(NOTES_KEY)}`

/** Nombre visible de cada autor (la página nunca muestra el nombre de él). */
export const authorLabel = (a: Author): string => (a === 'her' ? config.herName : config.notes.hisLabel)

/** Igual que authorLabel, pero para usar a mitad de frase ("cuando tu amor te deje…"). */
export const authorInSentence = (a: Author): string => {
  const label = authorLabel(a)
  return /^(Tu|Mi|Su) /.test(label) ? label.charAt(0).toLowerCase() + label.slice(1) : label
}
