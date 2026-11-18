/**
 * Variables del Worker.
 * - En producción se guardan como secretos (`npm run deploy` los crea).
 * - En local se leen de `.dev.vars` (ver `.dev.vars.example`).
 */
import type { NotesRoom } from './room'

export interface WorkerEnv {
  ROOM: DurableObjectNamespace<NotesRoom>
  /** Clave compartida que la página manda en cada conexión. Obligatoria. */
  NOTES_KEY?: string
  /** Orígenes permitidos separados por coma (p. ej. https://mi-sitio.onrender.com). Vacío = cualquiera. */
  ALLOWED_ORIGINS?: string
  VAPID_PUBLIC_KEY?: string
  VAPID_PRIVATE_KEY?: string
  /** Contacto VAPID ("mailto:…" o https://…). Por defecto, el primer origen https permitido. */
  VAPID_SUBJECT?: string
  /** Solo pruebas locales: acepta endpoints push http://. */
  ALLOW_INSECURE_PUSH?: string
}
