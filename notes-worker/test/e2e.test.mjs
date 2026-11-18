/**
 * Prueba de punta a punta del Worker real (wrangler dev, en local):
 * dos "celulares" por WebSocket + un servicio push falso que descifra.
 * Se salta si no hay `.dev.vars` con claves VAPID (npm run setup:dev).
 */
import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseVars } from '../scripts/keys.mjs'
import { decryptPayload, makeBrowserSubscription, verifyVapid } from './push-helpers.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const varsFile = join(root, '.dev.vars')
const vars = existsSync(varsFile) ? parseVars(readFileSync(varsFile, 'utf8')) : {}
const skip = !vars.NOTES_KEY || !vars.VAPID_PUBLIC_KEY ? 'falta .dev.vars con claves (npm run setup:dev)' : false

const PORT = 8790 + Math.floor(Math.random() * 100)
const BASE = `http://127.0.0.1:${PORT}`
const KEY = vars.NOTES_KEY
let wrangler, persistDir, pushServer, pushPort
const pushes = []
const pushStatus = {} // ruta → status a devolver

// PNG de 1×1 px
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

before(async () => {
  if (skip) return
  pushServer = createServer((req, res) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      pushes.push({ path: req.url, headers: req.headers, body: new Uint8Array(Buffer.concat(chunks)) })
      res.writeHead(pushStatus[req.url] ?? 201).end()
    })
  })
  await new Promise((r) => pushServer.listen(0, '127.0.0.1', r))
  pushPort = pushServer.address().port

  persistDir = mkdtempSync(join(tmpdir(), 'notitas-e2e-'))
  wrangler = spawn(
    join(root, 'node_modules', '.bin', 'wrangler'),
    ['dev', '--port', String(PORT), '--ip', '127.0.0.1', '--persist-to', persistDir, '--var', 'ALLOW_INSECURE_PUSH:1', '--show-interactive-dev-session=false'],
    { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], detached: true, env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } },
  )
  let log = ''
  wrangler.stdout.on('data', (d) => (log += d))
  wrangler.stderr.on('data', (d) => (log += d))
  const t0 = Date.now()
  while (Date.now() - t0 < 60_000) {
    try {
      const r = await fetch(BASE + '/')
      if (r.ok) return
    } catch {
      /* aún no */
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error('wrangler dev no arrancó:\n' + log)
})

after(() => {
  // Mata a todo el grupo (wrangler + workerd).
  try {
    if (wrangler?.pid) process.kill(-wrangler.pid, 'SIGTERM')
  } catch {
    /* ya terminó */
  }
  pushServer?.close()
  if (persistDir) rmSync(persistDir, { recursive: true, force: true })
})

function client(author, key = KEY) {
  const ws = new WebSocket(`ws://127.0.0.1:${PORT}/ws?key=${key}&author=${author}`)
  const messages = []
  const waiters = []
  ws.addEventListener('message', (e) => {
    const m = e.data === 'pong' ? { t: 'pong' } : JSON.parse(e.data)
    messages.push(m)
    for (const w of [...waiters]) {
      if (!w.pred(m)) continue
      waiters.splice(waiters.indexOf(w), 1)
      w.resolve(m)
    }
  })
  const waitFor = (pred, ms = 5000) => {
    const found = messages.find(pred)
    if (found) return Promise.resolve(found)
    return new Promise((resolve, reject) => {
      const w = { pred, resolve }
      waiters.push(w)
      setTimeout(() => reject(new Error(`${author}: no llegó el mensaje esperado. Recibidos: ${JSON.stringify(messages.map((m) => m.t))}`)), ms)
    })
  }
  const opened = new Promise((r, j) => (ws.addEventListener('open', r), ws.addEventListener('error', j)))
  return { ws, messages, waitFor, opened, send: (m) => ws.send(JSON.stringify(m)), clear: () => (messages.length = 0) }
}

const waitPush = async (n, ms = 5000) => {
  const t0 = Date.now()
  while (pushes.length < n && Date.now() - t0 < ms) await new Promise((r) => setTimeout(r, 50))
  return pushes.length >= n
}

test('rechaza clave incorrecta', { skip }, async () => {
  assert.equal((await fetch(`${BASE}/img/x?key=mala`)).status, 401)
  assert.equal((await fetch(`${BASE}/ws?key=${KEY}&author=her`)).status, 426)
})

test('flujo completo: tiempo real, presencia, corazones, borrado, dibujos y push', { skip }, async () => {
  const her = client('her')
  await her.opened
  const hello = await her.waitFor((m) => m.t === 'hello')
  assert.equal(hello.you, 'her')
  assert.deepEqual(hello.notes, [])
  assert.equal(hello.vapidKey, vars.VAPID_PUBLIC_KEY)
  assert.deepEqual(hello.presence, { her: true, him: false })

  // Él entra: ella lo ve "en línea"
  const him = client('him')
  await him.opened
  await him.waitFor((m) => m.t === 'hello')
  await her.waitFor((m) => m.t === 'presence' && m.presence.him === true)

  // Suscripciones push (un endpoint para cada uno + uno vencido para él)
  const himBrowser = await makeBrowserSubscription(`http://127.0.0.1:${pushPort}/push/him`)
  const goneBrowser = await makeBrowserSubscription(`http://127.0.0.1:${pushPort}/push/gone`)
  const herBrowser = await makeBrowserSubscription(`http://127.0.0.1:${pushPort}/push/her`)
  pushStatus['/push/gone'] = 410
  him.send({ t: 'sub', sub: himBrowser.sub })
  await him.waitFor((m) => m.t === 'subbed' && m.endpoint.endsWith('/push/him'))
  him.send({ t: 'sub', sub: goneBrowser.sub })
  await him.waitFor((m) => m.t === 'subbed' && m.endpoint.endsWith('/push/gone'))
  her.send({ t: 'sub', sub: herBrowser.sub })
  await her.waitFor((m) => m.t === 'subbed')
  her.send({ t: 'sub', sub: { endpoint: 'ftp://x', keys: { p256dh: 'a', auth: 'b' } } })
  await her.waitFor((m) => m.t === 'error' && /push/i.test(m.message))

  // "Está escribiendo…" llega solo al otro
  her.send({ t: 'act', a: 'typing' })
  await him.waitFor((m) => m.t === 'act' && m.author === 'her' && m.a === 'typing')

  // Él tiene la app en segundo plano → ella escribe → a él le llega push
  him.send({ t: 'vis', v: false })
  await new Promise((r) => setTimeout(r, 100))
  her.send({ t: 'add', note: { tempId: 't1', kind: 'text', text: '  Te extraño 💌  ', color: 'rose' }, pushTitle: 'Katherine te dejó una notita' })
  const mine = await her.waitFor((m) => m.t === 'added' && m.tempId === 't1')
  assert.equal(mine.note.text, 'Te extraño 💌')
  assert.equal(mine.note.author, 'her')
  assert.equal(mine.note.color, 'rose')
  const theirs = await him.waitFor((m) => m.t === 'added' && m.note.id === mine.note.id)
  assert.equal(theirs.tempId, undefined)

  assert.ok(await waitPush(2), 'debían llegar 2 envíos push (él + vencido)')
  const p = pushes.find((x) => x.path === '/push/him')
  assert.equal(p.headers['content-encoding'], 'aes128gcm')
  assert.equal(p.headers['topic'], 'notitas')
  const { claims } = await verifyVapid(p.headers['authorization'], vars.VAPID_PUBLIC_KEY)
  assert.equal(claims.aud, `http://127.0.0.1:${pushPort}`)
  const payload = JSON.parse((await decryptPayload(p.body, himBrowser.keys, himBrowser.sub.keys.p256dh, himBrowser.sub.keys.auth)).text)
  assert.deepEqual(payload, { title: 'Katherine te dejó una notita', body: 'Te extraño 💌', badge: 1, url: './#/notas', tag: 'notitas' })

  // Él vuelve a mirar la app → la siguiente notita NO genera push; el vencido ya se borró
  him.send({ t: 'vis', v: true })
  await new Promise((r) => setTimeout(r, 100))
  const before = pushes.length
  her.send({ t: 'add', note: { tempId: 't2', kind: 'text', text: 'Otra', color: 'cream' } })
  await him.waitFor((m) => m.t === 'added' && m.note.text === 'Otra')
  await new Promise((r) => setTimeout(r, 400))
  assert.equal(pushes.length, before, 'no debe haber push si está mirando')

  // Corazones: solo los da la otra persona
  her.send({ t: 'heart', id: mine.note.id, on: true })
  him.send({ t: 'heart', id: mine.note.id, on: true })
  await her.waitFor((m) => m.t === 'hearted' && m.id === mine.note.id && m.on === true)

  // Borrado: solo la autora
  him.send({ t: 'del', id: mine.note.id })
  await new Promise((r) => setTimeout(r, 200))
  assert.ok(!her.messages.some((m) => m.t === 'deleted'), 'él no puede borrar notitas de ella')
  her.send({ t: 'del', id: mine.note.id })
  await him.waitFor((m) => m.t === 'deleted' && m.id === mine.note.id)

  // Validación
  her.send({ t: 'add', note: { tempId: 't3', kind: 'text', text: '   ', color: 'cream' } })
  await her.waitFor((m) => m.t === 'error' && m.tempId === 't3')
  her.send({ t: 'add', note: { tempId: 't4', kind: 'drawing', color: 'cream', image: { data: 'data:text/html;base64,PGgxPg==', w: 1, h: 1 } } })
  await her.waitFor((m) => m.t === 'error' && m.tempId === 't4')

  // Dibujo: se guarda y se sirve como imagen; push con texto de dibujo
  him.send({ t: 'vis', v: false })
  her.send({ t: 'seen', at: Date.now() })
  await new Promise((r) => setTimeout(r, 100))
  const nBefore = pushes.length
  her.send({ t: 'add', note: { tempId: 'd1', kind: 'drawing', text: '', color: 'gold', image: { data: PNG, w: 720, h: 720 } } })
  const drawn = await her.waitFor((m) => m.t === 'added' && m.tempId === 'd1')
  assert.equal(drawn.note.kind, 'drawing')
  assert.equal(drawn.note.image.w, 720)
  const img = await fetch(`${BASE}/img/${drawn.note.image.id}?key=${KEY}`)
  assert.equal(img.status, 200)
  assert.equal(img.headers.get('content-type'), 'image/png')
  assert.deepEqual(new Uint8Array(await img.arrayBuffer()), new Uint8Array(Buffer.from(PNG.split(',')[1], 'base64')))
  assert.equal((await fetch(`${BASE}/img/${drawn.note.image.id}?key=mala`)).status, 401)
  assert.ok(await waitPush(nBefore + 1))
  const p2 = pushes.slice(nBefore).find((x) => x.path === '/push/him')
  assert.ok(p2, 'push del dibujo')
  assert.ok(!pushes.slice(nBefore).some((x) => x.path === '/push/gone'), 'la suscripción vencida (410) se debe haber borrado')
  const payload2 = JSON.parse((await decryptPayload(p2.body, himBrowser.keys, himBrowser.sub.keys.p256dh, himBrowser.sub.keys.auth)).text)
  assert.equal(payload2.body, 'Toca para verlo 💕')
  assert.equal(payload2.title, 'Nueva notita 💌')
  assert.equal(payload2.badge, 2, 'él no ha marcado nada como visto: "Otra" + el dibujo')

  // Ella le escribe y él (que no vio nada) cierra: ella recibe presencia
  him.send({ t: 'seen', at: Date.now() })
  him.ws.close()
  await her.waitFor((m) => m.t === 'presence' && m.presence.him === false)

  // Al reconectarse, el historial y "visto" vienen en hello (más nuevas primero)
  const him2 = client('him')
  await him2.opened
  const hello2 = await him2.waitFor((m) => m.t === 'hello')
  assert.deepEqual(hello2.notes.map((n) => n.kind + ':' + n.text), ['drawing:', 'text:Otra'])
  assert.ok(hello2.seen > 0)

  // Latido
  him2.ws.send('ping')
  await him2.waitFor((m) => m.t === 'pong')

  // Él escribe con ella conectada pero sin pestaña visible → push a ella
  her.send({ t: 'vis', v: false })
  await new Promise((r) => setTimeout(r, 100))
  const n3 = pushes.length
  him2.send({ t: 'add', note: { tempId: 'h1', kind: 'text', text: 'Yo también 🫶', color: 'lilac' }, pushTitle: 'Tu amor te dejó una notita' })
  await her.waitFor((m) => m.t === 'added' && m.note.text === 'Yo también 🫶')
  assert.ok(await waitPush(n3 + 1))
  const p3 = pushes.slice(n3).find((x) => x.path === '/push/her')
  const payload3 = JSON.parse((await decryptPayload(p3.body, herBrowser.keys, herBrowser.sub.keys.p256dh, herBrowser.sub.keys.auth)).text)
  assert.equal(payload3.title, 'Tu amor te dejó una notita')
  assert.equal(payload3.badge, 1)

  her.ws.close()
  him2.ws.close()
})

test('avisos del mesiversario: el día antes, el mismo día y el aniversario', { skip }, async () => {
  const her = client('her')
  const him = client('him')
  await Promise.all([her.opened, him.opened])
  await Promise.all([her.waitFor((m) => m.t === 'hello'), him.waitFor((m) => m.t === 'hello')])
  const herB = await makeBrowserSubscription(`http://127.0.0.1:${pushPort}/push/her-mv`)
  const himB = await makeBrowserSubscription(`http://127.0.0.1:${pushPort}/push/him-mv`)
  her.send({ t: 'sub', sub: herB.sub })
  him.send({ t: 'sub', sub: himB.sub })
  await her.waitFor((m) => m.t === 'subbed' && m.endpoint.endsWith('/push/her-mv'))
  await him.waitFor((m) => m.t === 'subbed' && m.endpoint.endsWith('/push/him-mv'))

  // Dispara el cron como si fuera esa hora (en Bogotá).
  const tick = async (localIso) => {
    const r = await fetch(`${BASE}/cdn-cgi/local/scheduled?cron=0+*+*+*+*&time=${Date.parse(`${localIso}-05:00`)}`)
    assert.equal(r.status, 200, await r.text())
  }
  const pushFor = async (path, from, ms = 5000) => {
    const t0 = Date.now()
    for (;;) {
      const p = pushes.slice(from).find((x) => x.path === path)
      if (p || Date.now() - t0 > ms) return p
      await new Promise((r) => setTimeout(r, 50))
    }
  }
  const read = async (p, b) => JSON.parse((await decryptPayload(p.body, b.keys, b.sub.keys.p256dh, b.sub.keys.auth)).text)
  const mine = (from) => pushes.slice(from).filter((x) => x.path.endsWith('-mv'))

  // Día antes del 7.º mesiversario, a las 20:00. Llega aunque tengan la página abierta.
  let n0 = pushes.length
  await tick('2026-12-17T20:00:00')
  const eveHer = await pushFor('/push/her-mv', n0)
  const eveHim = await pushFor('/push/him-mv', n0)
  assert.ok(eveHer && eveHim, 'deben llegar los avisos a los dos')
  assert.equal(eveHer.headers['topic'], 'mesiversario')
  assert.equal(eveHer.headers['ttl'], '10800')
  assert.deepEqual(await read(eveHer, herB), {
    title: 'Mañana es nuestro día, mi amorcito 💕',
    body: 'Mañana cumplimos siete meses, y yo cada día te quiero más. Duerme bonito, cielo. — H',
    url: './#/',
    tag: 'mesiversario',
  })
  const himPayload = await read(eveHim, himB)
  assert.equal(himPayload.title, 'Mañana cumples siete meses con Katherine 💕')
  assert.equal(himPayload.url, './#/notas')

  // El mismo aviso no se repite (cron repetido o una hora después).
  n0 = pushes.length
  await tick('2026-12-17T20:00:00')
  await tick('2026-12-17T21:00:00')
  await new Promise((r) => setTimeout(r, 400))
  assert.equal(mine(n0).length, 0, 'el aviso de "mañana" sale una sola vez')

  // Fuera de horario o sin mesiversario: nada.
  await tick('2026-12-18T07:00:00')
  await tick('2026-12-20T08:00:00')
  await new Promise((r) => setTimeout(r, 400))
  assert.equal(mine(n0).length, 0)

  // El mismo día, a las 8:00.
  n0 = pushes.length
  await tick('2026-12-18T08:00:00')
  const day = await pushFor('/push/her-mv', n0)
  assert.ok(day)
  assert.equal(day.headers['ttl'], '43200')
  const dayPayload = await read(day, herB)
  assert.equal(dayPayload.title, 'Hoy cumplimos siete meses ❤️')
  assert.equal(dayPayload.badge, undefined, 'no toca el globito de notitas')

  // Primer año (con el cron atrasado una hora).
  n0 = pushes.length
  await tick('2027-05-18T09:00:00')
  const year = await read(await pushFor('/push/her-mv', n0), herB)
  assert.equal(year.title, '¡Feliz aniversario, mocosa! 🎉❤️')
  assert.match(year.body, /un año juntos/)

  her.ws.close()
  him.ws.close()
})
