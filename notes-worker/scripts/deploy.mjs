/**
 * Publica el servidor de las notitas en Cloudflare (gratis) y configura sus secretos.
 *
 *   npx wrangler login                      # una sola vez (abre el navegador)
 *   npm run deploy -- --site https://TU-SITIO.onrender.com
 *
 * - Genera la clave compartida y las claves VAPID la primera vez y las guarda
 *   en `.secrets.json` (NO se sube a git). Las siguientes publicaciones reusan
 *   las mismas claves: así no se rompen las notificaciones ya activadas.
 * - Al final imprime las 2 variables que hay que pegar en Render.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath } from 'node:url'
import { generateSecrets } from './keys.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const secretsFile = join(root, '.secrets.json')
const wranglerBin = join(root, 'node_modules', '.bin', 'wrangler')

const say = (msg = '') => console.log(msg)
const fail = (msg) => {
  console.error(`\n✖ ${msg}\n`)
  process.exit(1)
}

function wrangler(args, opts = {}) {
  return spawnSync(wranglerBin, args, { cwd: root, encoding: 'utf8', ...opts })
}

if (!existsSync(wranglerBin)) fail('Primero instala las dependencias: npm install')

// 1) Sesión de Cloudflare
const who = wrangler(['whoami'], { stdio: ['ignore', 'pipe', 'pipe'] })
if (who.status !== 0 || /not authenticated|You are not logged in/i.test(`${who.stdout}${who.stderr}`)) {
  fail('No has iniciado sesión en Cloudflare. Corre:  npx wrangler login')
}

// 2) Claves (se crean una vez y se reusan)
let secrets = existsSync(secretsFile) ? JSON.parse(readFileSync(secretsFile, 'utf8')) : null
if (!secrets?.NOTES_KEY || !secrets?.VAPID_PUBLIC_KEY || !secrets?.VAPID_PRIVATE_KEY) {
  secrets = { ...(secrets ?? {}), ...(await generateSecrets()) }
  say('🔑 Claves nuevas generadas (se guardan en notes-worker/.secrets.json — no lo borres ni lo subas a git).')
}

// 3) URL del sitio (para permitir solo ese origen y como contacto VAPID)
const argIdx = process.argv.indexOf('--site')
let site = argIdx > -1 ? process.argv[argIdx + 1] : secrets.SITE_URL
if (!site) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  site = (await rl.question('URL de la página en Render (https://…onrender.com): ')).trim()
  rl.close()
}
site = (site ?? '').replace(/\/+$/, '')
if (!/^https:\/\/[^/\s]+$/.test(site)) fail(`URL inválida: "${site}". Debe ser algo como https://mi-sitio.onrender.com`)
secrets.SITE_URL = site
writeFileSync(secretsFile, JSON.stringify(secrets, null, 2) + '\n')

// 4) Publicar
say('\n🚀 Publicando el Worker…\n')
const tmp = mkdtempSync(join(tmpdir(), 'notitas-'))
const outFile = join(tmp, 'out.ndjson')
const dep = wrangler(['deploy'], { stdio: 'inherit', env: { ...process.env, WRANGLER_OUTPUT_FILE_PATH: outFile } })
if (dep.status !== 0) fail('La publicación falló (mira el mensaje de arriba).')

let workerUrl = ''
try {
  for (const line of readFileSync(outFile, 'utf8').split('\n')) {
    if (!line.trim()) continue
    const entry = JSON.parse(line)
    if (entry.type === 'deploy' && Array.isArray(entry.targets)) workerUrl = entry.targets.find((t) => t.startsWith('https://')) ?? ''
  }
} catch {
  /* sin archivo de salida: se pregunta abajo */
}
if (!workerUrl) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  workerUrl = (await rl.question('Pega la URL que mostró wrangler (https://notitas.….workers.dev): ')).trim()
  rl.close()
}
workerUrl = workerUrl.replace(/\/+$/, '')

// 5) Secretos
say('\n🔒 Guardando los secretos en Cloudflare…\n')
const bulk = join(tmp, 'secrets.json')
writeFileSync(
  bulk,
  JSON.stringify({
    NOTES_KEY: secrets.NOTES_KEY,
    VAPID_PUBLIC_KEY: secrets.VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: secrets.VAPID_PRIVATE_KEY,
    VAPID_SUBJECT: site,
    ALLOWED_ORIGINS: site,
  }),
)
const sec = wrangler(['secret', 'bulk', bulk], { stdio: 'inherit' })
rmSync(tmp, { recursive: true, force: true })
if (sec.status !== 0) fail('No se pudieron guardar los secretos (mira el mensaje de arriba).')

// 6) Comprobación
try {
  const r = await fetch(workerUrl + '/')
  say(r.ok ? `\n✅ El servidor responde en ${workerUrl}` : `\n⚠️  El servidor respondió ${r.status} (puede tardar unos segundos en activarse).`)
} catch {
  say('\n⚠️  Aún no responde (puede tardar unos segundos en activarse).')
}

say(`
────────────────────────────────────────────────────────────
Último paso — en Render (tu sitio → Environment), agrega:

  VITE_NOTES_URL = ${workerUrl}
  VITE_NOTES_KEY = ${secrets.NOTES_KEY}

y luego: Manual Deploy → "Clear build cache & deploy".
────────────────────────────────────────────────────────────
`)
