/**
 * Worker de las notitas: valida la clave y el origen, y pasa todo al
 * Durable Object `NotesRoom` (un solo cuarto para los dos).
 *
 *   GET /            → "notitas ok" (para comprobar que está vivo)
 *   GET /ws          → WebSocket   (?key=…&author=her|him)
 *   GET /img/<id>    → un dibujo   (?key=…)
 */
import { NotesRoom } from './room'
import type { WorkerEnv } from './env'
import { originAllowed, sameKey } from './auth'

export { NotesRoom }

const text = (body: string, status = 200) =>
  new Response(body, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/') return text('notitas ok')
    if (request.method !== 'GET') return text('Método no permitido', 405)
    if (!env.NOTES_KEY) return text('Falta configurar NOTES_KEY', 503)
    if (!sameKey(url.searchParams.get('key') ?? '', env.NOTES_KEY)) return text('No autorizado', 401)

    const room = env.ROOM.get(env.ROOM.idFromName('nosotros'))

    if (url.pathname === '/ws') {
      if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return text('Se esperaba WebSocket', 426)
      if (!originAllowed(request.headers.get('Origin'), env.ALLOWED_ORIGINS)) return text('Origen no permitido', 403)
      return room.fetch(request)
    }
    if (/^\/img\/[\w-]+$/.test(url.pathname)) return room.fetch(request)
    return text('No encontrado', 404)
  },
} satisfies ExportedHandler<WorkerEnv>
