/**
 * Acceso seguro a sessionStorage / localStorage (puede fallar en modo
 * incógnito o con almacenamiento bloqueado; nunca debe romper la página).
 */
function safe(getStore: () => Storage) {
  return {
    get(key: string): string | null {
      try {
        return getStore().getItem(key)
      } catch {
        return null
      }
    },
    set(key: string, value: string): void {
      try {
        getStore().setItem(key, value)
      } catch {
        /* sin almacenamiento disponible */
      }
    },
    remove(key: string): void {
      try {
        getStore().removeItem(key)
      } catch {
        /* sin almacenamiento disponible */
      }
    },
  }
}

export const session = safe(() => window.sessionStorage)
export const local = safe(() => window.localStorage)

export const STORAGE_KEYS = {
  unlocked: 'nh:unlocked',
  introDone: 'nh:intro-done',
  /** Quién escribe en este dispositivo ("her" | "him"). */
  author: 'nh:author',
  /** Hasta cuándo se vieron las notitas de la otra persona (ms). */
  notesSeen: 'nh:notes-seen',
  /** Cartas "Ábrela cuando…" ya abiertas (ids separados por coma). */
  openWhen: 'nh:open-when',
  /** Color de papel elegido la última vez. */
  noteColor: 'nh:note-color',
} as const
