/**
 * Cartas "Ábrela cuando…" (sección del inicio).
 * ---------------------------------------------------------------------------
 * ✏️ BORRADORES: están escritos con el tono de la carta, pero lo ideal es que
 * los leas y los cambies con tus propias palabras.
 * Apodos que usa él: mocosa, cielito lindo, mi amorcito, cielo. Ella le dice H.
 *
 * - `when` completa la frase "Ábrela cuando…".
 * - Los párrafos se separan con una línea en blanco.
 * - `photo` (opcional): id de una foto del manifiesto (ver photos.ts).
 * - `icon`: uno de los nombres de abajo.
 * Puedes quitar, agregar o reordenar cartas.
 */
export type OpenWhenIcon = 'heart' | 'cloud-rain' | 'moon' | 'heart-crack' | 'calendar-heart' | 'sparkles'

export interface OpenWhenLetter {
  id: string
  when: string
  icon: OpenWhenIcon
  body: string
  photo?: string
}

export const openWhenLetters: OpenWhenLetter[] = [
  {
    id: 'me-extranes',
    when: 'me extrañes',
    icon: 'heart',
    photo: 'orig-29',
    body: `Si estás leyendo esto es porque me extrañas, mocosa… y quiero que sepas que yo también, muchísimo.

Cierra los ojos un momento e imagina que estoy ahí, abrazándote fuerte, sin prisa, como si el tiempo se detuviera.

La distancia es solo un lugar entre tú y yo, cielito lindo; no cambia lo que siento. Cada día que pasa es un día menos para el próximo abrazo.

Escríbeme, llámame o déjame una notita. Aunque esté lejos, siempre estoy contigo.`,
  },
  {
    id: 'mal-dia',
    when: 'tengas un mal día',
    icon: 'cloud-rain',
    photo: 'snapchat-495190854',
    body: `Hoy no fue tu día, mi amorcito, y está bien. No tienes que poder con todo ni estar bien todo el tiempo.

Respira hondo. Tómate un vaso de agua, ponte cómoda y date permiso de descansar.

Quiero que recuerdes algo, mocosa: eres fuerte, eres valiente y eres mucho más de lo que un mal día puede decir de ti.

Si necesitas desahogarte, aquí estoy, para escucharte sin juzgarte el tiempo que haga falta. Mañana sale el sol otra vez, cielo, y yo voy a seguir aquí.`,
  },
  {
    id: 'no-puedas-dormir',
    when: 'no puedas dormir',
    icon: 'moon',
    photo: 'img-20261114-154814-793',
    body: `¿Otra vez despierta, mocosa? Ven, quédate un ratito conmigo.

Imagina que estoy a tu lado, que te acaricio el cabello y te digo bajito que todo va a estar bien.

Piensa en algo bonito: en nuestros abrazos, en las risas, en todo lo que todavía nos falta por vivir juntos.

Cierra los ojos despacio… yo te cuido los sueños. Buenas noches, cielito lindo.`,
  },
  {
    id: 'peleados',
    when: 'estemos peleados',
    icon: 'heart-crack',
    photo: 'img-20261116-wa0153',
    body: `Si abriste esta carta, seguramente estamos enojados… y aun así la abriste. Eso ya dice mucho de nosotros.

Aunque ahora estemos molestos, te amo, mocosa. Una discusión no cambia lo que siento por ti.

No quiero ganar una pelea; quiero que estemos bien. Quiero escucharte, entenderte y encontrar juntos la forma de arreglarlo.

Cuando estés lista, aquí estoy, mi amorcito. Siempre vamos a ser un equipo: tú y yo contra el problema, nunca el uno contra el otro.`,
  },
  {
    id: 'cuentes-los-dias',
    when: 'cuentes los días para vernos',
    icon: 'calendar-heart',
    photo: 'img-20261115-170719-274',
    body: `Ya falta menos, cielo. Cada día que pasa es un día menos para volver a verte.

Sé que la espera cansa y que a veces los días se hacen eternos. Pero piensa en ese momento: cuando por fin te vea, te abrace y todo vuelva a estar en su lugar.

Mientras tanto, mocosa, sigamos llenando los días de mensajes, llamadas y notitas.

Te prometo que cada abrazo va a valer toda la espera.`,
  },
  {
    id: 'cuanto-te-amo',
    when: 'quieras saber cuánto te amo',
    icon: 'sparkles',
    photo: 'orig-22',
    body: `Más de lo que cabe en estas palabras, mi amorcito. Más de lo que sé explicar.

Te amo en los días buenos y en los difíciles, cuando estamos cerca y cuando nos separan los kilómetros.

Te amo por cómo eres, por cómo me miras y por cómo me haces sentir en casa aunque esté lejos.

Y si algún día lo dudas, mocosa, vuelve a abrir esta carta. La respuesta siempre va a ser la misma: muchísimo, cielito lindo, hoy y siempre.`,
  },
]
