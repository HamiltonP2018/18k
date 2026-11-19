/** Colores de papel de las notitas (las tintas del lienzo están en draw/palette.ts). */
import type { NoteColor } from './protocol'

export const PAPER: Record<NoteColor, { bg: string; label: string }> = {
  cream: { bg: '#fbf3e6', label: 'Crema' },
  rose: { bg: '#ffdbe3', label: 'Rosa' },
  gold: { bg: '#fbe8b8', label: 'Dorado' },
  lilac: { bg: '#e7ddf8', label: 'Lila' },
  mint: { bg: '#d9f2e7', label: 'Menta' },
}
