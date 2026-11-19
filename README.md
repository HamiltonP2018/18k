# Nuestra Historia ❤

Página sorpresa para Katherine: una experiencia cinematográfica que cuenta la
historia de la pareja desde el **18 de mayo de 2026**, protegida con una
contraseña (nuestra fecha) y hecha en **React + TypeScript + Vite**.

## Recorrido

1. **Candado**: teclado numérico; la contraseña es la fecha en formato `DDMMAA`.
   Al acertar, explosión de corazones y empieza la música.
2. **Intro**: escenas con fotos y frases, estilo película (se puede saltar).
3. **Inicio** (una sola página con scroll):
   portada · contador en vivo · capítulos de la historia · carrusel 3D de
   recuerdos · momentos en video · razones por las que te amo · la carta ·
   cartas «Ábrela cuando…» · promesas · final con un corazón hecho de fotos ·
   «Nuestro rincón» (adelanto de las notitas + instalar la app).
4. **Vistas a pantalla completa**: galería completa por álbumes
   (`#/recuerdos`), historias en video (`#/momentos`) y la carta con sobre
   animado (`#/carta`).
5. **11:11**: si la página está abierta a las 11:11 aparece un aviso para pedir
   un deseo (para verlo antes: agrega `?deseo` a la URL, antes del `#`).
6. **Notitas** (`#/notas`): muro compartido de notitas y dibujitos en tiempo
   real, con «está escribiendo…», corazones y notificaciones push. Necesita el
   servidor de `notes-worker/` (ver más abajo); sin él, la sección no aparece.
   Los dibujos se hacen en un lienzo a pantalla completa pensado para el
   celular (`src/features/notes/draw/`): zoom con dos dedos, 8 pinceles,
   borrador, balde, gotero, paleta de 56 colores y mezclador, deshacer con dos
   dedos y rehacer con tres. El dibujo a medio hacer se guarda en el celular.

El candado y la intro se recuerdan en cada dispositivo: la segunda vez entra
directo a la historia (el botón «volver a empezar» del final los repite).

## App instalable (PWA)

La página se puede instalar en el celular como una app (ícono propio, pantalla
completa, abre sin internet con lo último que vio):

- **Android / Chrome**: botón «Instalar» en «Nuestro rincón» y en Notitas.
- **iPhone**: Compartir → «Agregar a inicio» (la página muestra los pasos).
  En iPhone las notificaciones solo funcionan con la app instalada.

Archivos: `public/manifest.webmanifest`, `public/sw.js` (service worker: caché
y notificaciones) y `public/icons/` (se regeneran con
`node scripts/make-icons.mjs`). El nombre bajo el ícono es «Nosotros»
(`short_name` del manifest y `apple-mobile-web-app-title` en `index.html`).

> Widgets en la pantalla de inicio: ni iPhone ni Android permiten que una app
> web ponga widgets. Lo más cercano son las notificaciones y el globito con el
> número de notitas sin leer sobre el ícono. Un widget real requiere una app
> nativa aparte.

## Vista previa del link (WhatsApp)

Al compartir el link aparece `public/og.jpg` (un sobre sellado «Para
Katherine»). Las redes exigen la URL absoluta de la imagen: en Render se toma
sola de `RENDER_EXTERNAL_URL`; con dominio propio, define `SITE_URL` al hacer
el build. WhatsApp guarda la vista previa de cada link: si ya lo habías
enviado antes, comparte `https://…/?v=2` para que la genere de nuevo.

## Comandos

```bash
npm install        # instalar dependencias
npm run dev        # servidor de desarrollo (también accesible desde el celular en la misma red)
npm run build      # build de producción en dist/
npm run preview    # probar el build localmente
npm run typecheck  # verificación de tipos
npm run lint       # linter (oxlint)
npm run media      # (re)generar fotos y videos optimizados desde media-src/
```

## Editar el contenido

Todo el texto vive en `src/data/`:

| Archivo | Qué contiene |
| --- | --- |
| `config.ts` | Nombres, fecha de inicio, contraseña, firma, canción y cómo aparece él en las notitas (`notes.hisLabel`) |
| `letter.ts` | La carta (tal cual) |
| `timeline.ts` | Capítulos de la historia (fecha, título, texto, fotos) |
| `photos.ts` | Leyendas, álbumes, puntos focales y qué fotos van en cada sección (`picks`) |
| `reasons.ts` | Razones por las que te amo |
| `promises.ts` | Promesas |
| `intro.ts` | Frases de la intro |
| `openWhen.ts` | Cartas «Ábrela cuando…» (borradores: revísalos) |

## Agregar fotos o videos

1. Crea una carpeta nueva dentro de `media-src/` (por ejemplo `media-src/lote-3`)
   y copia ahí las fotos/videos originales.
2. Agrega esa carpeta a `DEFAULT_SOURCES` en `scripts/process-media.mjs`.
3. Ejecuta `npm run media`: genera versiones WebP (640/1280/1920 px), convierte
   los videos a MP4 H.264 (compatibles con todos los navegadores), crea pósters
   y actualiza `src/data/media.generated.json`.
4. Opcional: ponles leyenda y álbum en `src/data/photos.ts`.

Si una foto o video quedó de lado, o una foto no tiene fecha (las de Snapchat),
corrígelo en `media-src/overrides.json` (`rotate`: −90 antihorario / 90 horario;
`dates`: `"AAAA-MM-DD HH:mm"`) y vuelve a ejecutar `npm run media`: solo se
regeneran los archivos cuyo giro cambió.

Las fotos marcadas `sensitive` en `photos.ts` solo aparecen dentro de la galería
(nunca en la portada, la intro, el carrusel ni el corazón final).

Los originales pesados (`media-src/lote-*`) y los `.zip` están en `.gitignore`;
lo que se publica son las versiones optimizadas de `public/media/`.

## Publicar

`npm run build` genera `dist/`, que funciona en cualquier hosting estático
(Vercel, Netlify, GitHub Pages…), incluso dentro de una subcarpeta: las rutas
son relativas y la navegación usa `#/`.

### Notitas compartidas (opcional)

Las notitas viven en un pequeño servidor gratuito de Cloudflare
(`notes-worker/`, ver su README). Una vez publicado, agrega en Render
(Environment) y vuelve a desplegar:

| Variable | Valor |
| --- | --- |
| `VITE_NOTES_URL` | URL del Worker (`https://notitas.….workers.dev`) |
| `VITE_NOTES_KEY` | La clave que imprime `npm run deploy` del Worker |

En local: crea `.env.development.local` con las mismas variables apuntando a
`http://localhost:8787` y corre `npm run dev` dentro de `notes-worker/`.

> La contraseña protege la sorpresa, no la privacidad: es una página estática y
> sus fotos son accesibles para quien tenga el enlace. La página incluye
> `noindex` para que los buscadores no la muestren.

## Vista previa de un componente

Con `npm run dev`, abre
`http://localhost:5173/dev/preview.html?c=home/HeroSection` para ver una sola
sección aislada (`?c=<carpeta>/<Archivo>` dentro de `src/features`;
`&route=/recuerdos` para las páginas).

## Estructura

```
src/
  components/   piezas compartidas (Photo, Button, Dock, visor, partículas…)
  context/      estado global (candado/intro) y música
  data/         todo el contenido editable
  features/     cada sección/vista de la experiencia
  hooks/        hooks reutilizables
  lib/          medios, fechas, animaciones, rutas, confeti
  pages/        página de inicio (compone las secciones)
  styles/       tokens de diseño y estilos globales
scripts/        pipeline de medios e íconos de la app
media-src/      fotos y videos originales
notes-worker/   servidor de las notitas (Cloudflare Worker + Durable Object)
public/         sw.js, manifest, íconos, og.jpg, fotos y música
legacy/         la versión original en un solo HTML
```

Basado en la plantilla original "Nuestro Universo" de Alex Dev
([alexxdev.vercel.app](https://alexxdev.vercel.app)).
