/** Colores del lienzo y conversiones (hex ↔ rgb ↔ hsv). */

/**
 * Paleta en columnas por tono, de claro a oscuro (8 columnas).
 * Primera fila: grises; última: tonos de piel y cafés.
 */
export const PALETTE: readonly (readonly string[])[] = [
  ['#ffffff', '#ebe5e8', '#c9bfc4', '#9d9297', '#6f6469', '#4a3f45', '#3a2230', '#111111'],
  ['#ffc2c7', '#ffd0b0', '#fff1a8', '#c9f2c7', '#bff0ea', '#c4dcff', '#e2cffa', '#ffd6ea'],
  ['#ff8a95', '#ffa86b', '#ffe066', '#8fdc8a', '#7fdcd0', '#8ab8ff', '#c4a0f0', '#ffa6cf'],
  ['#f0465a', '#ff7a2f', '#ffc51f', '#4cbb5f', '#2fb9aa', '#4a86f0', '#9a6be0', '#f56aa8'],
  ['#c81d3a', '#d95a14', '#e09e00', '#2b8a45', '#1a8a80', '#2a5bc0', '#7046b8', '#d63a82'],
  ['#8a1028', '#9a3c0b', '#a87000', '#175c2e', '#0f5c56', '#183a80', '#4a2a80', '#962057'],
  ['#ffe3cf', '#f6c9a6', '#e3a57c', '#c98659', '#a0653c', '#7a4a2b', '#55321d', '#3a2216'],
]

/** Recientes iniciales (antes de que use otros). */
export const DEFAULT_RECENTS = ['#3a2230', '#f0465a', '#f56aa8', '#ffc51f', '#4cbb5f', '#4a86f0', '#9a6be0', '#ffffff']

export const RECENTS_MAX = 12

export type RGB = [number, number, number]

export function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1, 7), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function rgbToHex([r, g, b]: RGB): string {
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

/** Mezcla `hex` con blanco (`t` = 0 nada, 1 blanco). */
export function tint(hex: string, t: number): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex([Math.round(r + (255 - r) * t), Math.round(g + (255 - g) * t), Math.round(b + (255 - b) * t)])
}

/** h 0–360, s y v 0–1. */
export function hsvToHex(h: number, s: number, v: number): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6
    return Math.round((v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255)
  }
  return rgbToHex([f(5), f(3), f(1)])
}

export function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const [r, g, b] = hexToRgb(hex).map((c) => c / 255)
  const max = Math.max(r, g, b)
  const d = max - Math.min(r, g, b)
  let h = 0
  if (d) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return { h, s: max ? d / max : 0, v: max }
}

/** ¿El color es claro? (para elegir borde o ícono que contraste). */
export function isLight(hex: string): boolean {
  const [r, g, b] = hexToRgb(hex)
  return r * 0.299 + g * 0.587 + b * 0.114 > 186
}
