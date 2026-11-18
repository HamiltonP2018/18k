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
   promesas · final con un corazón hecho de fotos.
4. **Vistas a pantalla completa**: galería completa por álbumes
   (`#/recuerdos`), historias en video (`#/momentos`) y la carta con sobre
   animado (`#/carta`).
5. **11:11**: si la página está abierta a las 11:11 aparece un aviso para pedir
   un deseo (para verlo antes: agrega `?deseo` a la URL, antes del `#`).

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
| `config.ts` | Nombres, fecha de inicio, contraseña, firma y canción |
| `letter.ts` | La carta (tal cual) |
| `timeline.ts` | Capítulos de la historia (fecha, título, texto, fotos) |
| `photos.ts` | Leyendas, álbumes, puntos focales y qué fotos van en cada sección (`picks`) |
| `reasons.ts` | Razones por las que te amo |
| `promises.ts` | Promesas |
| `intro.ts` | Frases de la intro |

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
scripts/        pipeline de medios
media-src/      fotos y videos originales
legacy/         la versión original en un solo HTML
```

Basado en la plantilla original "Nuestro Universo" de Alex Dev
([alexxdev.vercel.app](https://alexxdev.vercel.app)).
