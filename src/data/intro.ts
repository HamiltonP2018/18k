/**
 * Intro cinematográfica (después del candado).
 * Cada escena: una foto de fondo + 1 o 2 líneas de texto.
 * La última escena usa letra manuscrita para el nombre.
 */
import { config } from './config'
import { picks } from './photos'
import { formatLongDate } from '../lib/time'

export interface IntroScene {
  /** id de la foto de fondo. */
  photo: string
  /** Líneas de texto (se revelan una tras otra). */
  lines: string[]
  /** "script" = letra manuscrita grande (para el nombre). */
  style?: 'display' | 'script'
  /** Duración de la escena en ms. */
  duration?: number
}

const photo = (i: number) => picks.intro[i] ?? picks.intro[0]

export const introScenes: IntroScene[] = [
  { photo: photo(0), lines: ['Hay historias que se escriben despacio…'] },
  { photo: photo(1), lines: ['La nuestra empezó', `el ${formatLongDate(config.startDate)}.`] },
  { photo: photo(2), lines: ['Entre kilómetros, mensajes', 'y abrazos que valían la espera,'] },
  { photo: photo(3), lines: ['aprendimos que el amor', 'también se construye.'] },
  { photo: photo(4), lines: [`${config.herName},`, 'esta es nuestra historia.'], style: 'script', duration: 4600 },
]
