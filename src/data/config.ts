/**
 * Configuración principal de la página.
 * ---------------------------------------------------------------------------
 * Aquí se cambian los nombres, la fecha, la contraseña y la canción.
 * Todo el resto del contenido está en los demás archivos de `src/data/`.
 */
export const config = {
  /** Nombre de ella (aparece en la portada, la intro y el final). */
  herName: 'Katherine',

  /**
   * Nombre de quien firma (opcional). Si se deja vacío, la página nunca
   * muestra un nombre para él: firma con `signature`.
   */
  fromName: '',

  /** Firma manuscrita al final de la carta. */
  signature: 'Love You',

  /** Fecha y hora (local) en que empezó todo. */
  startDate: '2026-05-18T00:00:00',

  /** Contraseña de 6 dígitos: nuestra fecha en formato DD MM AA. */
  passcode: '180526',
  passcodeHint: 'Ingresa nuestra fecha',
  /** Pista que aparece después de dos intentos fallidos. */
  passcodeHelp: 'Pista: el día que empezó todo · DD MM AA',

  /** Canción de fondo (archivo dentro de `public/`). */
  song: {
    src: 'audio/nuestra-cancion.mp3',
    title: 'Nuestra canción',
    /** Volumen máximo (0 a 1). */
    volume: 0.6,
  },

  siteTitle: 'Nuestra Historia',
} as const

export type AppConfig = typeof config
