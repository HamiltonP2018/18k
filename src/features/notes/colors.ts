/** Colores de papel de las notitas y de la tinta para dibujar. */
import type { NoteColor } from './protocol'

export const PAPER: Record<NoteColor, { bg: string; label: string }> = {
  cream: { bg: '#fbf3e6', label: 'Crema' },
  rose: { bg: '#ffdbe3', label: 'Rosa' },
  gold: { bg: '#fbe8b8', label: 'Dorado' },
  lilac: { bg: '#e7ddf8', label: 'Lila' },
  mint: { bg: '#d9f2e7', label: 'Menta' },
}

export const INKS = [
  { value: '#3a2230', label: 'Tinta' },
  { value: '#e8365d', label: 'Rosa' },
  { value: '#c81d3a', label: 'Rojo' },
  { value: '#d9902f', label: 'Dorado' },
  { value: '#7b56b8', label: 'Lila' },
  { value: '#2f8f7c', label: 'Verde' },
  { value: '#2f6fb3', label: 'Azul' },
] as const

/** Grosores (fracción del ancho del lienzo). */
export const BRUSHES = [
  { value: 0.009, label: 'Fino' },
  { value: 0.018, label: 'Medio' },
  { value: 0.036, label: 'Grueso' },
] as const
