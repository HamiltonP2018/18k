/**
 * Capítulos de la historia (sección "Nuestra historia" del inicio).
 * ---------------------------------------------------------------------------
 * Cada capítulo: cuándo, un título, un texto corto y sus fotos (ids del
 * manifiesto; la primera es la principal). `quote` es opcional y se muestra
 * como cita destacada. Puedes cambiar, quitar o agregar capítulos.
 */
export interface Chapter {
  id: string
  /** Etiqueta visible de la fecha ("18 de mayo de 2026", "Mayo – octubre"). */
  when: string
  /** Fecha ISO opcional (para el lector de pantalla). */
  date?: string
  title: string
  text: string
  quote?: string
  photos: string[]
}

export const chapters: Chapter[] = [
  {
    id: 'comienzo',
    when: '18 de mayo de 2026',
    date: '2026-05-18',
    title: 'El día que empezó todo',
    text: 'Ese día empezamos a escribir esta historia. Todavía no sabíamos todo lo que vendría, pero ya era nuestra.',
    photos: ['img-20261117-182112-063'],
  },
  {
    id: 'aprendiendo',
    when: 'Mayo – octubre',
    title: 'Aprendiendo a querernos',
    text: 'Parques soleados, flores, selfies sin fin y conversaciones que se nos hacían cortas. Poco a poco nos volvimos el lugar favorito del otro.',
    photos: ['orig-26', 'orig-31', 'orig-09', 'orig-15'],
  },
  {
    id: 'distancia',
    when: 'Entre kilómetros',
    title: 'A pesar de la distancia',
    text: 'No ha sido fácil: la distancia, los días difíciles y todo lo que hemos tenido que enfrentar. Pero seguimos aquí, eligiéndonos.',
    quote: 'Gracias por no rendirte, gracias por ser tan especial conmigo y por seguir aquí.',
    photos: ['orig-02', 'orig-23', 'orig-20'],
  },
  {
    id: 'promesa',
    when: 'Sábado 14 de noviembre',
    date: '2026-11-14',
    title: 'Una promesa',
    text: 'Nos arreglamos, nos reímos frente al espejo y frente a una pared rosa… y un anillo pequeñito guardó una promesa grande.',
    photos: ['img-20261114-155108-085', 'img-20261114-154540-693', 'snapchat-982995529', 'img-20261114-154604-751'],
  },
  {
    id: 'navidad',
    when: 'Domingo 15 de noviembre',
    date: '2026-11-15',
    title: 'Navidad adelantada',
    text: 'Renos y esferas gigantes, una terraza con las montañas de fondo, palomitas en el cine, helado para dos y carreras en las maquinitas. Un domingo perfecto, de tu mano.',
    photos: ['img-20261115-100746-389', 'snapchat-1417529378', 'snapchat-410079293', 'img-20261115-170719-274'],
  },
  {
    id: 'detalles',
    when: '16 – 17 de noviembre',
    date: '2026-11-17',
    title: 'Lo que quedó',
    text: 'Volvió la distancia, pero no el silencio: fotos que viajan hasta mí, flores y detalles que guardan nuestra fecha.',
    photos: ['img-20261116-wa0148', 'img-20261116-wa0153', 'img-20261117-182120-660'],
  },
  {
    id: 'seis-meses',
    when: '18 de noviembre de 2026',
    date: '2026-11-18',
    title: 'Seis meses',
    text: 'Seis meses después, te sigo eligiendo. Y si algo tengo claro, es que todavía quiero vivir muchas cosas a tu lado.',
    photos: ['orig-30'],
  },
]
