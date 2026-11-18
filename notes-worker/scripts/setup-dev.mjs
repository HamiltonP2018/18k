/**
 * Crea `.dev.vars` para probar en local con claves nuevas (no toca uno existente
 * salvo con --force). Imprime lo que hay que poner en `.env.development.local`
 * de la página.
 */
import { existsSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { generateSecrets } from './keys.mjs'

const file = fileURLToPath(new URL('../.dev.vars', import.meta.url))
if (existsSync(file) && !process.argv.includes('--force')) {
  console.log('.dev.vars ya existe (usa --force para regenerarlo).')
  process.exit(0)
}
const s = await generateSecrets()
writeFileSync(
  file,
  `NOTES_KEY="${s.NOTES_KEY}"\nALLOWED_ORIGINS=""\nVAPID_PUBLIC_KEY="${s.VAPID_PUBLIC_KEY}"\nVAPID_PRIVATE_KEY="${s.VAPID_PRIVATE_KEY}"\nVAPID_SUBJECT="mailto:notitas@localhost.invalid"\nALLOW_INSECURE_PUSH="0"\n`,
)
console.log('Listo: .dev.vars creado.\n\nEn la raíz del proyecto, crea .env.development.local con:\n')
console.log(`VITE_NOTES_URL=http://localhost:8787\nVITE_NOTES_KEY=${s.NOTES_KEY}\n`)
