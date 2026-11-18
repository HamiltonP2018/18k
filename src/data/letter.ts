/**
 * La carta. Se muestra con efecto de máquina de escribir en la vista "Carta".
 * Los saltos de línea dobles separan párrafos.
 * (Texto original, sin cambios.)
 */
export const letter = {
  greeting: 'Para ti, mi amor ❤️',
  body: `No sé exactamente qué palabras puedan explicar todo lo que siento en este momento, pero quiero intentarlo.

Sé que nuestra relación no ha sido fácil. La distancia, los momentos difíciles, las discusiones y todo lo que hemos tenido que enfrentar pueden hacer que uno se canse y empiece a preguntarse si vale la pena seguir. Pero gracias por no rendirte, gracias por ser tan especial conmigo y por seguir aquí, incluso en los momentos en los que las cosas no han sido fáciles.

Solo quiero que sepas que para mí lo que hemos vivido ha sido real y muy importante. Te he amado, te amo y agradezco cada momento, cada conversación, cada risa y cada recuerdo que hemos construido juntos.

También quiero que sepas que no quiero quedarme solamente con los recuerdos de lo que somos. Quiero seguir creando momentos contigo, volver a sentir esa emoción que nos hacía tan felices y encontrar nuevas razones para enamorarnos cada día.

Quiero seguir eligiéndote, incluso en los días difíciles. Quiero aprender a escucharte mejor, a comprenderte, a cuidar más de ti y de nosotros. No quiero una relación perfecta, quiero una relación en la que los dos podamos sentirnos seguros, queridos y acompañados.

Gracias por quedarte, por darme oportunidades, por compartir tu vida conmigo y por hacerme sentir tantas cosas bonitas. Espero que podamos seguir caminando juntos, superando la distancia y construyendo poco a poco ese futuro que tantas veces hemos imaginado.

Te amo muchísimo y, si algo tengo claro, es que todavía quiero vivir muchas cosas a tu lado. ❤️`,
} as const

/** La carta dividida en párrafos (el saludo es el primero). */
export const letterParagraphs: string[] = [letter.greeting, ...letter.body.split(/\n{2,}/)]
