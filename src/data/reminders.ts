/**
 * Avisos del mesiversario (notificaciones al celular).
 * ---------------------------------------------------------------------------
 * Los manda el servidor de las notitas (notes-worker) a quien tenga activados
 * los avisos: el día antes y el mismo día de cada mesiversario. Ella recibe
 * los mensajes de abajo; él, un recordatorio.
 *
 * ⚠️ Estos textos viven en el servidor: después de cambiarlos hay que volver
 * a publicarlo (cd notes-worker && npm run deploy). Subirlos a GitHub no basta.
 */
import type { Author } from '../features/notes/protocol'
import { config } from './config'
import { monthsInWords } from '../lib/words'

export const reminderSettings = {
  /** Zona horaria de las horas de abajo. */
  timeZone: 'America/Bogota',
  /** Hora (0–23) del aviso del día antes. */
  eveHour: 20,
  /** Hora (0–23) del aviso del mismo día. */
  dayHour: 8,
} as const

/** 'eve' = el día antes · 'day' = el mismo día. */
export type ReminderKind = 'eve' | 'day'

export interface ReminderMessage {
  title: string
  body: string
  /** Vista que se abre al tocar la notificación. */
  url: string
}

type Template = (time: string) => { title: string; body: string }

/**
 * Para ella. Cada mes se usa uno distinto (van rotando).
 * `time` es "seis meses", "un año", "un año y dos meses"…
 */
const forHer: Record<ReminderKind, Template[]> = {
  eve: [
    (time) => ({
      title: `Mañana cumplimos ${time} 💕`,
      body: '¿Ya te diste cuenta, mocosa? Mañana es nuestro día. Te amo, cielito lindo. — H',
    }),
    (time) => ({
      title: 'Mañana es nuestro día, mi amorcito 💕',
      body: `Mañana cumplimos ${time}, y yo cada día te quiero más. Duerme bonito, cielo. — H`,
    }),
    (time) => ({
      title: `Una noche más y cumplimos ${time} 💕`,
      body: 'Gracias por seguir aquí, mocosa. Mañana te quiero celebrar, cielito lindo. — H',
    }),
  ],
  day: [
    (time) => ({
      title: `¡Feliz ${time}, mocosa! ❤️`,
      body: 'Hoy te sigo eligiendo, igual que el primer día. Te amo, cielito lindo. — H',
    }),
    (time) => ({
      title: `Hoy cumplimos ${time} ❤️`,
      body: 'Buenos días, mi amorcito. Hoy es nuestro día: gracias por cada momento a mi lado. Te amo, mocosa. — H',
    }),
    (time) => ({
      title: 'Feliz mesiversario, cielo ❤️',
      body: `Ya son ${time} juntos, mocosa, y todavía me faltan muchos más contigo. Te amo. — H`,
    }),
  ],
}

/** Para ella, cuando se cumplen años completos. */
const anniversaryForHer: Record<ReminderKind, Template> = {
  eve: (time) => ({
    title: `Mañana cumplimos ${time} 🎉`,
    body: 'Mañana es nuestro aniversario, mocosa. Te amo con todo mi corazón, mi amorcito. — H',
  }),
  day: (time) => ({
    title: '¡Feliz aniversario, mocosa! 🎉❤️',
    body: `Hoy cumplimos ${time} juntos. Gracias por cada día a mi lado, cielito lindo; por muchos más. — H`,
  }),
}

/** Para él: un recordatorio. */
const forHim: Record<ReminderKind, Template> = {
  eve: (time) => ({
    title: `Mañana cumples ${time} con ${config.herName} 💕`,
    body: 'Buen momento para prepararle algo… o dejarle una notita a la mocosa.',
  }),
  day: (time) => ({
    title: `Hoy cumples ${time} con ${config.herName} ❤️`,
    body: 'Ella también recibió su aviso. Déjale una notita a la mocosa.',
  }),
}

/** Mensaje del aviso para `to` cuando se cumplen (o se cumplirán mañana) `months` meses. */
export function reminderMessage(kind: ReminderKind, to: Author, months: number): ReminderMessage {
  const time = monthsInWords(months)
  if (to === 'him') return { ...forHim[kind](time), url: './#/notas' }
  const template = months % 12 === 0 ? anniversaryForHer[kind] : forHer[kind][months % forHer[kind].length]
  return { ...template(time), url: './#/' }
}
