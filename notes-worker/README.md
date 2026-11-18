# Servidor de las notitas 💌

Un Cloudflare Worker con un Durable Object (SQLite) que guarda las notitas y
los dibujos, los reenvía al instante por WebSocket y manda notificaciones push
cuando la otra persona no tiene la app abierta. Es gratis en el plan Free de
Cloudflare (sin tarjeta) y no se duerme.

## Publicarlo (una sola vez, ~5 minutos)

```bash
cd notes-worker
npm install
npx wrangler login                                   # abre el navegador; crea la cuenta si no tienes
npm run deploy -- --site https://TU-SITIO.onrender.com
```

El script:

1. genera la clave compartida y las claves de notificaciones (VAPID) y las
   guarda en `.secrets.json` (**no lo borres ni lo subas a git**: si se pierde,
   hay que volver a activar los avisos en cada celular);
2. publica el Worker (si es tu primer Worker, wrangler te pide elegir un
   subdominio `….workers.dev`);
3. guarda los secretos en Cloudflare;
4. imprime las dos variables que hay que agregar en Render:
   `VITE_NOTES_URL` y `VITE_NOTES_KEY`. Después: *Manual Deploy → Clear build
   cache & deploy*.

Para publicar cambios del servidor más adelante, basta con `npm run deploy`
(reusa las mismas claves y la misma URL del sitio).

## Probar en local

```bash
npm run setup:dev   # crea .dev.vars con claves de prueba (una vez)
npm run dev         # http://localhost:8787
```

En la raíz del proyecto, `.env.development.local` con `VITE_NOTES_URL` y
`VITE_NOTES_KEY` (lo imprime `setup:dev`) y `npm run dev`. Las notificaciones
push solo funcionan en el build de producción (`npm run build && npm run preview`),
porque el service worker no se registra en desarrollo.

## Pruebas

```bash
npm test         # cifrado push (vector del RFC 8291), acceso y flujo completo con wrangler dev
npm run typecheck
```

## Cómo funciona

- `src/index.ts` — valida la clave (`?key=`) y el origen, y pasa todo al cuarto.
- `src/room.ts` — el Durable Object `NotesRoom`: SQLite (notitas, dibujos,
  suscripciones, "visto"), WebSockets con hibernación, presencia, "está
  escribiendo…" y avisos push.
- `src/webpush.ts` — Web Push sin dependencias (RFC 8291 + VAPID RFC 8292).
- `../src/features/notes/protocol.ts` — los mensajes que se intercambian
  (compartido con la página).

Reglas: cada quien solo puede borrar sus propias notitas; el corazón solo lo da
la otra persona; no se manda push a quien tiene la página abierta y visible.

## Privacidad

Las notitas no son públicas, pero la protección es la clave que va dentro de la
página (igual que la contraseña de la fecha): quien tenga el link de la página
podría llegar a ellas. Los avisos push van cifrados de extremo a extremo.
