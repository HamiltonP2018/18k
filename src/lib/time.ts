/**
 * Utilidades de fechas: contador, mesiversarios y aniversario.
 */
import { useEffect, useState } from 'react'
import {
  addMonths,
  addYears,
  differenceInCalendarDays,
  differenceInMonths,
  differenceInYears,
  format,
  intervalToDuration,
  isSameDay,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { config } from '../data/config'
import { formatNumber, numberWord } from './words'

/** Fecha (local) en que empezó todo. */
export const START_DATE = new Date(config.startDate)

/**
 * Devuelve la fecha actual y se actualiza cada `intervalMs`
 * (alineado al segundo para que el contador no "salte").
 */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let timer = 0
    const schedule = () => {
      timer = window.setTimeout(
        () => {
          setNow(new Date())
          schedule()
        },
        intervalMs - (Date.now() % intervalMs) + 5,
      )
    }
    schedule()
    return () => window.clearTimeout(timer)
  }, [intervalMs])
  return now
}

export interface Elapsed {
  years: number
  months: number
  days: number
  hours: number
  minutes: number
  seconds: number
}

/** Tiempo transcurrido desglosado (años, meses, días, horas, minutos, segundos). */
export function getElapsed(now: Date = new Date(), start: Date = START_DATE): Elapsed {
  if (now.getTime() <= start.getTime()) return { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 }
  const d = intervalToDuration({ start, end: now })
  return {
    years: d.years ?? 0,
    months: d.months ?? 0,
    days: d.days ?? 0,
    hours: d.hours ?? 0,
    minutes: d.minutes ?? 0,
    seconds: d.seconds ?? 0,
  }
}

export interface Totals {
  days: number
  weeks: number
  hours: number
  minutes: number
  seconds: number
  /** Latidos aproximados (75 por minuto). */
  heartbeats: number
}

/** Totales acumulados desde el inicio. */
export function getTotals(now: Date = new Date(), start: Date = START_DATE): Totals {
  const ms = Math.max(0, now.getTime() - start.getTime())
  const seconds = Math.floor(ms / 1000)
  const days = Math.max(0, differenceInCalendarDays(now, start))
  return {
    days,
    weeks: Math.floor(days / 7),
    hours: Math.floor(seconds / 3600),
    minutes: Math.floor(seconds / 60),
    seconds,
    heartbeats: Math.round((seconds / 60) * 75),
  }
}

export interface Monthiversary {
  /** Meses completos juntos. */
  months: number
  /** true si hoy se cumple un mes más (y ya pasó al menos uno). */
  isToday: boolean
  /** Fecha del último mesiversario (o el inicio). */
  last: Date
  /** Fecha del próximo mesiversario. */
  next: Date
  /** Número del próximo mesiversario (p. ej. 7). */
  nextNumber: number
  /** Días que faltan para el próximo. */
  daysUntilNext: number
}

export function getMonthiversary(now: Date = new Date(), start: Date = START_DATE): Monthiversary {
  const months = Math.max(0, differenceInMonths(now, start))
  const last = addMonths(start, months)
  const next = addMonths(start, months + 1)
  return {
    months,
    isToday: months > 0 && isSameDay(now, last),
    last,
    next,
    nextNumber: months + 1,
    daysUntilNext: differenceInCalendarDays(next, now),
  }
}

export interface Anniversary {
  /** Años completos juntos. */
  years: number
  isToday: boolean
  next: Date
  nextNumber: number
  daysUntil: number
  /** Progreso (0–1) hacia el próximo aniversario. */
  progress: number
}

export function getAnniversary(now: Date = new Date(), start: Date = START_DATE): Anniversary {
  const years = Math.max(0, differenceInYears(now, start))
  const prev = addYears(start, years)
  const next = addYears(start, years + 1)
  const span = next.getTime() - prev.getTime()
  return {
    years,
    isToday: years > 0 && isSameDay(now, prev),
    next,
    nextNumber: years + 1,
    daysUntil: differenceInCalendarDays(next, now),
    progress: Math.min(1, Math.max(0, (now.getTime() - prev.getTime()) / span)),
  }
}

/** "2026-11-14" (o "2026-11-14T10:00:00") → Date local sin desfase de zona horaria. */
export function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

const asDate = (d: Date | string) => (typeof d === 'string' ? parseLocalDate(d) : d)

/** "18 de mayo de 2026" */
export function formatLongDate(d: Date | string): string {
  return format(asDate(d), "d 'de' MMMM 'de' yyyy", { locale: es })
}

/** "18 de mayo" */
export function formatDayMonth(d: Date | string): string {
  return format(asDate(d), "d 'de' MMMM", { locale: es })
}

/** "18 · 05 · 2026" */
export function formatDotted(d: Date | string): string {
  return format(asDate(d), 'dd · MM · yyyy')
}

/** "sábado" */
export function formatWeekday(d: Date | string): string {
  return format(asDate(d), 'EEEE', { locale: es })
}

export { formatNumber, numberWord }

/** plural(1, 'día', 'días') → "1 día" */
export function plural(n: number, one: string, many: string): string {
  return `${formatNumber(n)} ${n === 1 ? one : many}`
}

/** Primera letra en mayúscula: "seis meses" → "Seis meses". */
export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Describe el tiempo juntos en palabras:
 *   "seis meses", "un año y dos meses", "quince días", "un día".
 */
export function describeTogether(e: Elapsed): string {
  const parts: string[] = []
  if (e.years > 0) parts.push(`${numberWord(e.years)} ${e.years === 1 ? 'año' : 'años'}`)
  if (e.months > 0) parts.push(`${numberWord(e.months)} ${e.months === 1 ? 'mes' : 'meses'}`)
  if (parts.length === 0) {
    const days = Math.max(1, e.days)
    return `${numberWord(days)} ${days === 1 ? 'día' : 'días'}`
  }
  return parts.join(' y ')
}
