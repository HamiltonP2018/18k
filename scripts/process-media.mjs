#!/usr/bin/env node
/**
 * Pipeline de medios — "Nuestra Historia"
 * ---------------------------------------------------------------------------
 * Toma las fotos y videos originales de `media-src/` y genera versiones
 * optimizadas para la web en `public/media/` junto con un manifiesto
 * (`src/data/media.generated.json`) que la app usa para pintar todo.
 *
 *  - Fotos  → WebP en 3 tamaños (lado largo 640 / 1280 / 1920 px),
 *             orientación EXIF corregida, placeholder borroso (LQIP) y
 *             color dominante.
 *  - Videos → MP4 H.264 + AAC (compatible con todos los navegadores; los
 *             originales de Snapchat vienen en HEVC), máx. 1280 px, con
 *             `faststart` para que empiecen a reproducirse de inmediato,
 *             más un póster WebP.
 *
 * Es incremental: si un archivo de salida ya existe y es más nuevo que el
 * original, no se vuelve a generar.
 *
 * Uso:
 *   npm run media                       # procesa las carpetas por defecto
 *   npm run media -- --force            # regenera todo
 *   npm run media -- --src media-src/x  # procesa solo esa(s) carpeta(s)
 *
 * Para agregar fotos nuevas: crea una carpeta dentro de `media-src/`
 * (p. ej. `media-src/lote-3`), copia ahí las fotos y agrégala a
 * DEFAULT_SOURCES. Luego asigna leyendas y álbumes en `src/data/photos.ts`.
 *
 * Correcciones manuales en `media-src/overrides.json`:
 *  - rotate: gira fotos/videos guardados de lado (−90 antihorario, 90 horario).
 *    Si cambias el giro de un archivo, se regenera solo en la próxima corrida.
 *  - dates:  fecha/hora local ("AAAA-MM-DD HH:mm") para archivos sin fecha.
 */
import fs from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import sharp from 'sharp';
import exifr from 'exifr';
import ffmpegPath from 'ffmpeg-static';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const DEFAULT_SOURCES = ['media-src/originales', 'media-src/lote-1', 'media-src/lote-2'];
const OUT_PHOTOS = path.join(ROOT, 'public/media/p');
const OUT_VIDEOS = path.join(ROOT, 'public/media/v');
const MANIFEST = path.join(ROOT, 'src/data/media.generated.json');
const OVERRIDES_FILE = path.join(ROOT, 'media-src/overrides.json');

/** Zona horaria usada para convertir las fechas UTC de los videos. */
const TIME_ZONE = 'America/Bogota';
/** Lados largos (px) de las variantes de cada foto. */
const PHOTO_EDGES = [640, 1280, 1920];
/** Lados largos (px) de las variantes del póster de cada video. */
const POSTER_EDGES = [640, 1280];
/** Lado largo máximo del video transcodificado. */
const VIDEO_MAX_EDGE = 1280;

const PHOTO_EXT = /\.(jpe?g|png|webp|heic|heif|avif|tiff?)$/i;
const VIDEO_EXT = /\.(mp4|mov|m4v|webm|3gp)$/i;

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
const FORCE = argv.includes('--force');
const srcArgs = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--src' && argv[i + 1]) srcArgs.push(argv[++i]);
}
const SOURCES = (srcArgs.length ? srcArgs : DEFAULT_SOURCES).map((s) => path.resolve(ROOT, s));

// ---------------------------------------------------------------------------
// Correcciones manuales y manifiesto anterior
// ---------------------------------------------------------------------------
const OVERRIDES = existsSync(OVERRIDES_FILE) ? JSON.parse(await fs.readFile(OVERRIDES_FILE, 'utf8')) : {};
/** Giro extra (grados, múltiplo de 90) de un elemento. */
const rotationOf = (id) => {
  const deg = Number(OVERRIDES.rotate?.[id] ?? 0);
  return ((Math.round(deg / 90) * 90) % 360 + 360) % 360;
};
/** Entradas del manifiesto anterior: permiten detectar cambios de giro. */
const PREVIOUS = new Map(
  existsSync(MANIFEST) ? JSON.parse(await fs.readFile(MANIFEST, 'utf8')).items.map((it) => [it.id, it]) : [],
);
/** true si el giro guardado en el manifiesto anterior coincide con el actual. */
const sameRotation = (id) => (PREVIOUS.get(id)?.rotate ?? 0) === rotationOf(id);

/** "2026-11-14 15:57" → { date, time } */
function parseManualDate(raw) {
  const m = typeof raw === 'string' && raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  return m ? { date: `${m[1]}-${m[2]}-${m[3]}`, time: m[4] ? `${m[4]}:${m[5]}` : null } : null;
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');

/** true si `out` existe y es más nuevo que `src` (y no se pidió --force). */
function isFresh(out, src) {
  if (FORCE || !existsSync(out)) return false;
  return statSync(out).mtimeMs >= statSync(src).mtimeMs;
}

function slug(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function makeId(batch, file) {
  const base = path.parse(file).name;
  if (batch === 'originales' && /^\d+$/.test(base)) return `orig-${base.padStart(2, '0')}`;
  return slug(base);
}

function toHex({ r, g, b }) {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}

function run(cmd, args, { capture = false, allowFail = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', capture ? 'pipe' : 'ignore', 'pipe'] });
    const out = [];
    let err = '';
    if (capture) child.stdout.on('data', (d) => out.push(d));
    child.stderr.on('data', (d) => (err += d.toString()));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0 && !allowFail) reject(new Error(`${path.basename(cmd)} salió con código ${code}\n${err.slice(-2000)}`));
      else resolve({ code, stdout: Buffer.concat(out), stderr: err });
    });
  });
}

async function pool(items, size, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker));
  return results;
}

// ---------------------------------------------------------------------------
// Fechas
// ---------------------------------------------------------------------------
/** "2026:11:14 15:25:34" → { date: '2026-11-14', time: '15:25' } */
function parseExifDate(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const m = raw.match(/^(\d{4})[:-](\d{2})[:-](\d{2})[ T](\d{2}):(\d{2})/);
  if (!m || m[1] === '0000') return null;
  return { date: `${m[1]}-${m[2]}-${m[3]}`, time: `${m[4]}:${m[5]}` };
}

/** Fechas a partir de nombres típicos de Android / WhatsApp. */
function dateFromFilename(name) {
  let m = name.match(/(?:IMG|VID|PXL)[_-](\d{4})(\d{2})(\d{2})[_-](\d{2})(\d{2})(\d{2})/i);
  if (m) return { date: `${m[1]}-${m[2]}-${m[3]}`, time: `${m[4]}:${m[5]}` };
  m = name.match(/(?:IMG|VID)-(\d{4})(\d{2})(\d{2})-WA/i);
  if (m) return { date: `${m[1]}-${m[2]}-${m[3]}`, time: null };
  return null;
}

/** ISO UTC → fecha/hora local en TIME_ZONE. */
function localFromUtc(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

// ---------------------------------------------------------------------------
// Fotos
// ---------------------------------------------------------------------------
async function lqipAndColor(input, rotate = 0) {
  const base = sharp(input, { failOn: 'none' }).autoOrient().rotate(rotate);
  const [tiny, stats] = await Promise.all([
    base.clone().resize(16, 16, { fit: 'inside' }).webp({ quality: 45 }).toBuffer(),
    base.clone().resize(64, 64, { fit: 'inside' }).stats(),
  ]);
  return { lqip: `data:image/webp;base64,${tiny.toString('base64')}`, color: toHex(stats.dominant) };
}

async function writeVariants(input, id, edges, outDir, publicDir, { isFresh: fresh, rotate = 0 }) {
  const meta = await sharp(input, { failOn: 'none' }).metadata();
  const swap = ((meta.orientation ?? 1) >= 5) !== (rotate % 180 === 90);
  const W = swap ? meta.height : meta.width;
  const H = swap ? meta.width : meta.height;
  const long = Math.max(W, H);
  const targets = [...new Set([...edges.filter((e) => e < long), Math.min(long, edges.at(-1))])].sort((a, b) => a - b);

  const variants = [];
  for (const edge of targets) {
    const file = `${id}-${edge}.webp`;
    const out = path.join(outDir, file);
    let info;
    if (fresh(out)) {
      info = await sharp(out).metadata();
    } else {
      info = await sharp(input, { failOn: 'none' })
        .autoOrient()
        .rotate(rotate)
        .resize(edge, edge, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: edge <= 640 ? 72 : 77, effort: 5, smartSubsample: true })
        .toFile(out);
    }
    variants.push({ w: info.width, h: info.height, file: `${publicDir}/${file}` });
  }
  return { width: W, height: H, variants };
}

async function processPhoto(job) {
  const { abs, id, batch, file } = job;
  const rotate = rotationOf(id);
  const { width, height, variants } = await writeVariants(abs, id, PHOTO_EDGES, OUT_PHOTOS, 'media/p', {
    isFresh: (out) => isFresh(out, abs) && sameRotation(id),
    rotate,
  });
  const { lqip, color } = await lqipAndColor(abs, rotate);

  let when = null;
  let dateSource = 'unknown';
  try {
    const ex = await exifr.parse(abs, { pick: ['DateTimeOriginal', 'CreateDate'], reviveValues: false });
    when = parseExifDate(ex?.DateTimeOriginal) ?? parseExifDate(ex?.CreateDate);
    if (when) dateSource = 'exif';
  } catch {
    /* sin EXIF */
  }
  if (!when) {
    when = dateFromFilename(file);
    if (when) dateSource = 'filename';
  }
  const manual = parseManualDate(OVERRIDES.dates?.[id]);
  if (manual) {
    when = manual;
    dateSource = 'manual';
  }

  return {
    id,
    type: 'photo',
    batch,
    original: rel(abs),
    date: when?.date ?? null,
    time: when?.time ?? null,
    dateSource,
    width,
    height,
    aspect: +(width / height).toFixed(4),
    ...(rotate ? { rotate } : null),
    color,
    lqip,
    variants,
  };
}

// ---------------------------------------------------------------------------
// Videos
// ---------------------------------------------------------------------------
async function probe(file) {
  const { stderr } = await run(ffmpegPath, ['-hide_banner', '-i', file], { allowFail: true });
  const dur = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  const dims = stderr.match(/Video:.*?\s(\d{2,5})x(\d{2,5})[\s,]/);
  const rot = stderr.match(/displaymatrix: rotation of (-?\d+(?:\.\d+)?) degrees/) ?? stderr.match(/rotate\s*:\s*(-?\d+)/);
  const created = stderr.match(/creation_time\s*:\s*(\S+)/);
  let w = dims ? +dims[1] : 0;
  let h = dims ? +dims[2] : 0;
  if (rot && Math.abs(Math.round(+rot[1])) % 180 === 90) [w, h] = [h, w];
  return {
    duration: dur ? +dur[1] * 3600 + +dur[2] * 60 + +dur[3] : 0,
    width: w,
    height: h,
    hasAudio: /Stream #.*Audio:/.test(stderr),
    creationTime: created ? created[1] : null,
  };
}

async function processVideo(job) {
  const { abs, id, batch, file } = job;
  const src = await probe(abs);
  const outFile = path.join(OUT_VIDEOS, `${id}.mp4`);
  const rotate = rotationOf(id);

  if (!isFresh(outFile, abs) || !sameRotation(id)) {
    process.stdout.write(`   ↳ transcodificando ${file} (${src.duration.toFixed(1)} s)…\n`);
    const scale = `scale=w='if(gt(iw,ih),min(${VIDEO_MAX_EDGE},iw),-2)':h='if(gt(iw,ih),-2,min(${VIDEO_MAX_EDGE},ih))'`;
    // transpose=1 → 90° horario, transpose=2 → 90° antihorario.
    const turn = { 90: 'transpose=1,', 180: 'hflip,vflip,', 270: 'transpose=2,' }[rotate] ?? '';
    await run(ffmpegPath, [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-i', abs,
      '-vf', turn + scale,
      '-fpsmax', '30',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      ...(src.hasAudio ? ['-c:a', 'aac', '-b:a', '96k'] : ['-an']),
      '-map_metadata', '-1',
      outFile,
    ]);
  }

  const out = await probe(outFile);
  // Póster: un fotograma al inicio (evita el negro del primer frame).
  const t = Math.min(0.6, Math.max(0, out.duration / 3));
  const { stdout: frame } = await run(
    ffmpegPath,
    ['-hide_banner', '-loglevel', 'error', '-ss', t.toFixed(2), '-i', outFile, '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'],
    { capture: true },
  );
  const posterId = `${id}-poster`;
  const posterFresh = (o) => isFresh(o, outFile);
  const { variants: poster } = await writeVariants(frame, posterId, POSTER_EDGES, OUT_VIDEOS, 'media/v', { isFresh: posterFresh });
  const { lqip, color } = await lqipAndColor(frame);

  let when = dateFromFilename(file);
  let dateSource = when ? 'filename' : 'unknown';
  if (!when && src.creationTime) {
    when = localFromUtc(src.creationTime);
    if (when) dateSource = 'video-meta';
  }
  const manual = parseManualDate(OVERRIDES.dates?.[id]);
  if (manual) {
    when = manual;
    dateSource = 'manual';
  }

  return {
    id,
    type: 'video',
    batch,
    original: rel(abs),
    date: when?.date ?? null,
    time: when?.time ?? null,
    dateSource,
    width: out.width,
    height: out.height,
    aspect: +(out.width / out.height).toFixed(4),
    ...(rotate ? { rotate } : null),
    color,
    lqip,
    src: `media/v/${id}.mp4`,
    duration: +out.duration.toFixed(2),
    hasAudio: out.hasAudio,
    poster,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  if (!ffmpegPath || !existsSync(ffmpegPath)) throw new Error('No se encontró ffmpeg (paquete ffmpeg-static).');
  await fs.mkdir(OUT_PHOTOS, { recursive: true });
  await fs.mkdir(OUT_VIDEOS, { recursive: true });

  const jobs = [];
  const seen = new Set();
  for (const dir of SOURCES) {
    if (!existsSync(dir)) {
      console.warn(`⚠️  No existe ${rel(dir)}, se omite.`);
      continue;
    }
    const batch = path.basename(dir);
    const files = (await fs.readdir(dir)).filter((f) => PHOTO_EXT.test(f) || VIDEO_EXT.test(f)).sort();
    for (const file of files) {
      let id = makeId(batch, file);
      while (seen.has(id)) id += '-b';
      seen.add(id);
      jobs.push({ abs: path.join(dir, file), id, batch, file, kind: VIDEO_EXT.test(file) ? 'video' : 'photo' });
    }
  }

  const photos = jobs.filter((j) => j.kind === 'photo');
  const videos = jobs.filter((j) => j.kind === 'video');
  console.log(`📷 ${photos.length} fotos · 🎬 ${videos.length} videos`);

  const started = performance.now();
  let done = 0;
  const photoItems = await pool(photos, Math.max(2, Math.floor(os.cpus().length / 2)), async (job) => {
    const item = await processPhoto(job);
    done++;
    if (done % 10 === 0 || done === photos.length) process.stdout.write(`   fotos ${done}/${photos.length}\n`);
    return item;
  });

  const videoItems = [];
  for (const job of videos) {
    videoItems.push(await processVideo(job));
    process.stdout.write(`   video listo: ${job.file}\n`);
  }

  // Orden: lote por lote; dentro de cada lote, cronológico (los que no tienen fecha al final, por nombre).
  const batchOrder = new Map(SOURCES.map((s, i) => [path.basename(s), i]));
  const items = [...photoItems, ...videoItems].sort((a, b) => {
    const ba = batchOrder.get(a.batch) ?? 99;
    const bb = batchOrder.get(b.batch) ?? 99;
    if (ba !== bb) return ba - bb;
    const ka = a.date ? `${a.date} ${a.time ?? '99:99'}` : '9999';
    const kb = b.date ? `${b.date} ${b.time ?? '99:99'}` : '9999';
    if (ka !== kb) return ka < kb ? -1 : 1;
    return a.id.localeCompare(b.id, 'es', { numeric: true });
  });

  // Conserva entradas de lotes que no se procesaron en esta corrida (cuando se usa --src).
  if (srcArgs.length && existsSync(MANIFEST)) {
    const prev = JSON.parse(await fs.readFile(MANIFEST, 'utf8'));
    const processed = new Set(SOURCES.map((s) => path.basename(s)));
    items.unshift(...prev.items.filter((it) => !processed.has(it.batch)));
  }

  await fs.mkdir(path.dirname(MANIFEST), { recursive: true });
  await fs.writeFile(MANIFEST, JSON.stringify({ timeZone: TIME_ZONE, items }, null, 2) + '\n');

  const secs = ((performance.now() - started) / 1000).toFixed(1);
  console.log(`✅ Manifiesto: ${rel(MANIFEST)} (${items.length} elementos) en ${secs} s`);
}

main().catch((err) => {
  console.error('❌', err);
  process.exit(1);
});
