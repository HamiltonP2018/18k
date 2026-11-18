/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL del servidor de notitas (Cloudflare Worker), p. ej. https://notitas.xxx.workers.dev */
  readonly VITE_NOTES_URL?: string
  /** Clave compartida con el servidor de notitas. */
  readonly VITE_NOTES_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
