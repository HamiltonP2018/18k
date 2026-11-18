/**
 * ¿Toca mandar un aviso del mesiversario? Lógica pura (sin Cloudflare).
 * ---------------------------------------------------------------------------
 * El cron del Worker corre cada hora. Un aviso "toca" si en la zona horaria
 * configurada:
 *   - 'day': hoy es mesiversario y ya es la hora `dayHour`;
 *   - 'eve': mañana es mesiversario y ya es la hora `eveHour`.
 * Si el cron se salta una hora, el aviso todavía sale hasta GRACE_HOURS
 * después (nunca pasada la medianoche). Que no salga dos veces lo controla
 * el cuarto con `key`.
 *
 * Mesiversario n = la fecha de inicio + n meses; si ese día no existe en el
 * mes (inicio un 31), es el último día del mes, igual que en la página.
 */
import type { ReminderKind } from '../../src/data/reminders'

export interface ReminderSchedule {
  /** Inicio: "2026-05-18" (o "2026-05-18T00:00:00"). */
  startDate: string
  timeZone: string
  /** Hora (0–23) del aviso del día antes. */
  eveHour: number
  /** Hora (0–23) del aviso del mismo día. */
  dayHour: number
}

export interface DueReminder {
  kind: ReminderKind
  /** Meses que se cumplen ese día (mañana, si es 'eve'). */
  months: number
  /** Único por aviso: "7:eve", "7:day". */
  key: string
}

export const GRACE_HOURS = 3

export interface Ymd {
  y: number
  /** 1–12 */
  m: number
  d: number
}

/** m de 1 a 12. */
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate()

export function parseStart(iso: string): Ymd {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) throw new Error(`Fecha de inicio inválida: "${iso}"`)
  return { y, m, d }
}

/** Fecha y hora locales de un instante en `timeZone`. */
export function localParts(ms: number, timeZone: string): Ymd & { hour: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(new Date(ms))
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value)
  return { y: get('year'), m: get('month'), d: get('day'), hour: get('hour') % 24 }
}

export function addDays(date: Ymd, n: number): Ymd {
  const t = new Date(Date.UTC(date.y, date.m - 1, date.d + n))
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }
}

/** Fecha del mesiversario número `n`. */
export function monthiversaryDate(start: Ymd, n: number): Ymd {
  const index = start.m - 1 + n
  const y = start.y + Math.floor(index / 12)
  const m = (index % 12) + 1
  return { y, m, d: Math.min(start.d, daysInMonth(y, m)) }
}

/** Meses que se cumplen en `date` (1 o más), o null si ese día no es mesiversario. */
export function monthiversaryOn(date: Ymd, start: Ymd): number | null {
  const months = (date.y - start.y) * 12 + (date.m - start.m)
  if (months < 1) return null
  return monthiversaryDate(start, months).d === date.d ? months : null
}

/** Avisos que tocan en el instante `nowMs` (casi siempre ninguno). */
export function dueReminders(nowMs: number, schedule: ReminderSchedule): DueReminder[] {
  const start = parseStart(schedule.startDate)
  const now = localParts(nowMs, schedule.timeZone)
  const today: Ymd = { y: now.y, m: now.m, d: now.d }
  const inWindow = (hour: number) => now.hour >= hour && now.hour < hour + GRACE_HOURS

  const due: DueReminder[] = []
  if (inWindow(schedule.dayHour)) {
    const months = monthiversaryOn(today, start)
    if (months) due.push({ kind: 'day', months, key: `${months}:day` })
  }
  if (inWindow(schedule.eveHour)) {
    const months = monthiversaryOn(addDays(today, 1), start)
    if (months) due.push({ kind: 'eve', months, key: `${months}:eve` })
  }
  return due
}
