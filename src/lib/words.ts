/**
 * Números en palabras ("seis meses").
 * Sin dependencias: lo usan la página y el servidor de las notitas
 * (para los avisos del mesiversario).
 */

const nf = new Intl.NumberFormat('es-CO')
/** 1234567 → "1.234.567" */
export function formatNumber(n: number): string {
  return nf.format(n)
}

const WORDS = [
  'cero', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez',
  'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte',
  'veintiún', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve', 'treinta',
]

/** 6 → "seis", 1 → "un" (para "un mes"); >30 → dígitos. */
export function numberWord(n: number): string {
  return Number.isInteger(n) && n >= 0 && n < WORDS.length ? WORDS[n] : formatNumber(n)
}

/** 6 → "seis meses", 12 → "un año", 14 → "un año y dos meses". */
export function monthsInWords(months: number): string {
  const years = Math.floor(months / 12)
  const rest = months % 12
  const parts: string[] = []
  if (years > 0) parts.push(`${numberWord(years)} ${years === 1 ? 'año' : 'años'}`)
  if (rest > 0 || years === 0) parts.push(`${numberWord(rest)} ${rest === 1 ? 'mes' : 'meses'}`)
  return parts.join(' y ')
}
