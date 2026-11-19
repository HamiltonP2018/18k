/**
 * Pintar un dibujo completo: en pantalla (con zoom), en miniatura y al exportar.
 * También el balde de pintura (relleno por área).
 *
 * El relleno se calcula en una imagen de FILL_RES px y se pinta *debajo* de lo
 * que ya había (destination-over): así el borde, que es de baja resolución,
 * queda escondido bajo las líneas y no aparecen halos blancos ni con zoom.
 */
import { DOC, drawStroke } from './brushes'
import type { FillOp, Op, StrokeOp } from './doc'
import { hexToRgb } from './palette'

const FILL_RES = 1024
/** Diferencia de color (0–255) que todavía cuenta como "la misma zona". */
const FILL_TOLERANCE = 42
/** Cuánto se agranda el relleno por debajo de las líneas (px de FILL_RES). */
const FILL_GROW = 2
/** Huecos entre líneas que el balde cierra solo (px de FILL_RES a cada lado ≈ 0,6 % de la hoja). */
const FILL_GAP = 3

export function canvas(w: number, h = w): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w))
  c.height = Math.max(1, Math.round(h))
  return c
}

/**
 * Pinta las operaciones [start, end) en `ctx`.
 * `k` = px por unidad de hoja; (ox, oy) = esquina de la hoja en px.
 */
export function renderOps(ctx: CanvasRenderingContext2D, ops: readonly Op[], k: number, ox = 0, oy = 0, start = 0, end = ops.length): void {
  ctx.save()
  ctx.setTransform(k, 0, 0, k, ox, oy)
  ctx.beginPath()
  ctx.rect(0, 0, DOC, DOC)
  ctx.clip()
  for (let i = start; i < end; i++) {
    const op = ops[i]
    if (op.t === 'f') drawFill(ctx, ops, i)
    else drawStroke(ctx, op, k)
  }
  ctx.restore()
}

/** Pinta un trazo suelto (el que se está dibujando) con la misma vista. */
export function renderLive(ctx: CanvasRenderingContext2D, op: StrokeOp, k: number, ox: number, oy: number): void {
  ctx.save()
  ctx.setTransform(k, 0, 0, k, ox, oy)
  ctx.beginPath()
  ctx.rect(0, 0, DOC, DOC)
  ctx.clip()
  drawStroke(ctx, op, k, true)
  ctx.restore()
}

// ---------------------------------------------------------------------------
// Relleno
// ---------------------------------------------------------------------------

interface FillResult {
  /** Rectángulo en unidades de hoja. */
  x: number
  y: number
  w: number
  h: number
  fill: HTMLCanvasElement
  /** Lo que había antes en la zona (se quita al cambiar el color de un relleno). */
  erase: HTMLCanvasElement | null
}

const fillCache = new WeakMap<FillOp, FillResult | null>()

function drawFill(ctx: CanvasRenderingContext2D, ops: readonly Op[], i: number) {
  const op = ops[i] as FillOp
  let res = fillCache.get(op)
  if (res === undefined) {
    res = computeFill(ops, i)
    fillCache.set(op, res)
  }
  if (!res) return
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  if (res.erase) {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.drawImage(res.erase, res.x, res.y, res.w, res.h)
  }
  ctx.globalCompositeOperation = 'destination-over'
  ctx.globalAlpha = op.o
  ctx.drawImage(res.fill, res.x, res.y, res.w, res.h)
  ctx.restore()
}

function computeFill(ops: readonly Op[], i: number): FillResult | null {
  const op = ops[i] as FillOp
  const R = FILL_RES
  const N = R * R
  let sx = Math.floor(op.x * R)
  let sy = Math.floor(op.y * R)
  if (sx < 0 || sy < 0 || sx >= R || sy >= R) return null

  const c = canvas(R)
  const ctx = c.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  renderOps(ctx, ops, R / DOC, 0, 0, 0, i)
  const data = ctx.getImageData(0, 0, R, R).data

  // 1) Qué píxeles se parecen al tocado. Premultiplicado ×255 para usar solo
  //    enteros (es el bucle más caliente); papel vacío: basta mirar la opacidad.
  const s = (sy * R + sx) * 4
  const ta = data[s + 3]
  const ok = new Uint8Array(N)
  const wall = new Uint8Array(N)
  if (ta === 0) {
    for (let p = 0, q = 3; p < N; p++, q += 4) {
      if (data[q] <= FILL_TOLERANCE) ok[p] = 1
      else wall[p] = 1
    }
  } else {
    const tr = data[s] * ta
    const tg = data[s + 1] * ta
    const tb = data[s + 2] * ta
    const tol = FILL_TOLERANCE * 255
    for (let p = 0, q = 0; p < N; p++, q += 4) {
      const a = data[q + 3]
      const d = a - ta
      if (
        d <= FILL_TOLERANCE &&
        d >= -FILL_TOLERANCE &&
        Math.abs(data[q] * a - tr) <= tol &&
        Math.abs(data[q + 1] * a - tg) <= tol &&
        Math.abs(data[q + 2] * a - tb) <= tol
      )
        ok[p] = 1
      else wall[p] = 1
    }
  }

  // 2) Cierra huecos pequeños: se engordan las líneas antes de buscar la zona,
  //    así el color no se escapa por donde un trazo casi toca a otro.
  const near = dilate(wall, R, R, FILL_GAP)
  const closed = near // se reutiliza la memoria: closed = ok y lejos de las líneas
  for (let p = 0; p < N; p++) closed[p] = ok[p] & (near[p] ^ 1)
  if (!closed[sy * R + sx]) {
    // Tocó muy cerca de una línea: busca el punto libre más cercano.
    let best = Infinity
    const r0 = FILL_GAP * 2
    for (let y = Math.max(0, sy - r0); y <= Math.min(R - 1, sy + r0); y++)
      for (let x = Math.max(0, sx - r0); x <= Math.min(R - 1, sx + r0); x++) {
        const d = (x - sx) ** 2 + (y - sy) ** 2
        if (closed[y * R + x] && d < best) {
          best = d
          sx = x
          sy = y
        }
      }
  }
  const gapClosed = closed[sy * R + sx] === 1
  if (!gapClosed && !ok[sy * R + sx]) return null
  const f = flood(gapClosed ? closed : ok, R, sx, sy)

  // 3) Desde aquí solo se trabaja en el rectángulo de la zona (con margen).
  const M = FILL_GAP + FILL_GROW
  const x0 = Math.max(0, f.x0 - M)
  const y0 = Math.max(0, f.y0 - M)
  const bw = Math.min(R - 1, f.x1 + M) - x0 + 1
  const bh = Math.min(R - 1, f.y1 + M) - y0 + 1
  let region: Uint8Array = new Uint8Array(bw * bh)
  for (let y = 0; y < bh; y++) {
    const src = (y0 + y) * R + x0
    region.set(f.mask.subarray(src, src + bw), y * bw)
  }
  if (gapClosed) {
    // La zona vuelve a crecer hasta las líneas (solo por píxeles del mismo color).
    region = dilate(region, bw, bh, FILL_GAP)
    for (let y = 0; y < bh; y++) {
      const row = (y0 + y) * R + x0
      for (let x = 0; x < bw; x++) region[y * bw + x] &= ok[row + x]
    }
  }
  // Un poco más grande, para meterse bajo las líneas.
  const grown = dilate(region, bw, bh, FILL_GROW)

  const [r, g, b] = hexToRgb(op.c)
  const fill = canvas(bw, bh)
  const fctx = fill.getContext('2d')!
  const fimg = fctx.createImageData(bw, bh)
  const eimg = ta > 8 ? fctx.createImageData(bw, bh) : null
  for (let p = 0, q = 0; p < grown.length; p++, q += 4) {
    if (grown[p]) {
      fimg.data[q] = r
      fimg.data[q + 1] = g
      fimg.data[q + 2] = b
      fimg.data[q + 3] = 255
    }
    if (eimg && region[p]) eimg.data[q + 3] = 255
  }
  fctx.putImageData(fimg, 0, 0)
  let erase: HTMLCanvasElement | null = null
  if (eimg) {
    erase = canvas(bw, bh)
    erase.getContext('2d')!.putImageData(eimg, 0, 0)
  }

  const u = DOC / R
  return { x: x0 * u, y: y0 * u, w: bw * u, h: bh * u, fill, erase }
}

/** Zona conectada a (sx, sy) dentro de `ok` (relleno por líneas horizontales) y su rectángulo. */
function flood(ok: Uint8Array, R: number, sx: number, sy: number) {
  const mask = new Uint8Array(ok.length)
  let x0 = sx
  let x1 = sx
  let y0 = sy
  let y1 = sy
  const stack: number[] = [sx, sy]
  while (stack.length) {
    const y = stack.pop()!
    const x = stack.pop()!
    const row = y * R
    if (mask[row + x] || !ok[row + x]) continue
    let l = x
    while (l > 0 && ok[row + l - 1] && !mask[row + l - 1]) l--
    let r = x
    while (r < R - 1 && ok[row + r + 1] && !mask[row + r + 1]) r++
    mask.fill(1, row + l, row + r + 1)
    if (l < x0) x0 = l
    if (r > x1) x1 = r
    if (y < y0) y0 = y
    if (y > y1) y1 = y
    for (const ny of [y - 1, y + 1]) {
      if (ny < 0 || ny >= R) continue
      const nrow = ny * R
      let inRun = false
      for (let nx = l; nx <= r; nx++) {
        const free = ok[nrow + nx] === 1 && mask[nrow + nx] === 0
        if (free && !inRun) stack.push(nx, ny)
        inRun = free
      }
    }
  }
  return { mask, x0, y0, x1, y1 }
}

/** Agranda la máscara `g` px (ventana cuadrada; dos pasadas con conteo deslizante, O(n)). */
function dilate(src: Uint8Array, w: number, h: number, g: number): Uint8Array {
  const tmp = new Uint8Array(src.length)
  for (let y = 0; y < h; y++) {
    const row = y * w
    let count = 0
    for (let x = 0; x <= Math.min(g, w - 1); x++) count += src[row + x]
    for (let x = 0; x < w; x++) {
      if (count) tmp[row + x] = 1
      if (x + g + 1 < w) count += src[row + x + g + 1]
      if (x - g >= 0) count -= src[row + x - g]
    }
  }
  // Vertical fila por fila (recorre la memoria en orden: más rápido en el celular).
  const out = new Uint8Array(src.length)
  const counts = new Int32Array(w)
  for (let y = 0; y <= Math.min(g, h - 1); y++) for (let x = 0; x < w; x++) counts[x] += tmp[y * w + x]
  for (let y = 0; y < h; y++) {
    const row = y * w
    for (let x = 0; x < w; x++) if (counts[x]) out[row + x] = 1
    if (y + g + 1 < h) {
      const add = (y + g + 1) * w
      for (let x = 0; x < w; x++) counts[x] += tmp[add + x]
    }
    if (y - g >= 0) {
      const rem = (y - g) * w
      for (let x = 0; x < w; x++) counts[x] -= tmp[rem + x]
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Exportar
// ---------------------------------------------------------------------------

/**
 * Imagen para enviar: la más nítida que quepa en `maxChars` (límite del servidor).
 * Fondo transparente (la notita pone el papel); si el navegador no sabe hacer
 * WebP y el PNG es muy pesado, JPEG sobre el color del papel.
 */
export function exportDrawing(ops: readonly Op[], paper: string, maxChars: number): { data: string; w: number; h: number } | null {
  const tries: [number, 'image/webp' | 'image/png' | 'image/jpeg', number][] = [
    [1280, 'image/webp', 0.92],
    [1280, 'image/webp', 0.82],
    [1280, 'image/png', 1],
    [1080, 'image/webp', 0.85],
    [1080, 'image/png', 1],
    [1280, 'image/jpeg', 0.9],
    [1080, 'image/jpeg', 0.88],
    [900, 'image/jpeg', 0.85],
    [720, 'image/png', 1],
    [720, 'image/jpeg', 0.82],
  ]
  const rendered = new Map<number, HTMLCanvasElement>()
  for (const [px, type, quality] of tries) {
    let c = rendered.get(px)
    if (!c) {
      c = canvas(px)
      const ctx = c.getContext('2d')
      if (!ctx) return null
      renderOps(ctx, ops, px / DOC)
      rendered.set(px, c)
    }
    let out = c
    if (type === 'image/jpeg') {
      out = canvas(px)
      const ctx = out.getContext('2d')!
      ctx.fillStyle = paper
      ctx.fillRect(0, 0, px, px)
      ctx.drawImage(c, 0, 0)
    }
    const data = out.toDataURL(type, quality)
    if (!data.startsWith(`data:${type}`)) continue // p. ej. Safari: sin WebP
    if (data.length <= maxChars) return { data, w: px, h: px }
  }
  return null
}
