/**
 * Razones por las que te amo (se muestran como cartas interactivas).
 * Puedes cambiar, quitar o agregar las que quieras.
 */
export interface Reason {
  text: string
  /** Foto opcional (id del manifiesto) para acompañar la carta. */
  photo?: string
}

export const reasons: Reason[] = [
  { text: 'Porque contigo hasta lo más simple se siente especial.' },
  { text: 'Por tu sonrisa, que me arregla cualquier día.' },
  { text: 'Porque la distancia nunca pudo con nosotros.' },
  { text: 'Porque me eliges incluso en los días difíciles.' },
  { text: 'Por tu risa, que es mi sonido favorito.' },
  { text: 'Porque no te rendiste, ni siquiera cuando era difícil.' },
  { text: 'Porque eres mi lugar seguro.' },
  { text: 'Por cada conversación que se nos hace corta.' },
  { text: 'Porque tus abrazos se sienten como volver a casa.' },
  { text: 'Por cómo me cuidas, aunque estemos lejos.' },
  { text: 'Porque contigo aprendí que el amor también es paciencia.' },
  { text: 'Por todos los recuerdos que hemos construido… y los que faltan.' },
  { text: 'Por tu forma de ser: única, auténtica y preciosa.' },
  { text: 'Porque me haces querer ser mejor cada día.' },
  { text: 'Porque a tu lado los planes más sencillos se vuelven aventuras.' },
  { text: 'Porque un mensaje tuyo me cambia el día.' },
  { text: 'Porque contigo el futuro me emociona.' },
  { text: 'Por esos detalles tuyos que nadie más nota, pero yo sí.' },
  { text: 'Porque me haces sentir seguro, querido y acompañado.' },
  { text: 'Porque eres mi persona favorita en todo el mundo.' },
  { text: 'Porque cada día encuentro una razón nueva para enamorarme de ti.' },
  { text: 'Porque contigo todo es mejor.' },
  { text: 'Porque cuando miro hacia adelante, te veo a ti.' },
  { text: 'Simplemente porque eres tú.' },
]
