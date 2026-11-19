/**
 * Pinceles: qué ofrece cada uno y cómo se pinta un trazo.
 * ---------------------------------------------------------------------------
 * Se dibuja en "unidades de hoja" (la hoja mide DOC × DOC); el contexto ya
 * viene transformado. `k` = píxeles reales por unidad, para lo que el canvas
 * no escala solo (desenfoques y sombras).
 *
 * La pluma, el lápiz y el borrador usan perfect-freehand (trazo con presión,
 * como tldraw/Excalidraw); el resto recorre la línea suavizada.
 */
import { getStroke, getStrokePoints, type StrokeOptions, type StrokePoint } from 'perfect-freehand'
import type { LucideIcon } from 'lucide-react'
import { Eraser, Heart, Highlighter, PenTool, Pencil, Rainbow, Sparkles, SprayCan, Zap } from 'lucide-react'
import type { BrushId, StrokeOp } from './doc'
import { hexToHsv, hexToRgb, hsvToHex, tint } from './palette'

/** Lado de la hoja en unidades de dibujo. */
export const DOC = 1000

export interface BrushDef {
  id: BrushId
  label: string
  icon: LucideIcon
  /** Grosor mínimo, inicial y máximo (fracción del ancho de la hoja). */
  size: readonly [number, number, number]
  /** Opacidad inicial. */
  opacity: number
  /** Si se le puede cambiar la opacidad. */
  alpha: boolean
}

export const BRUSHES: readonly BrushDef[] = [
  { id: 'pen', label: 'Pluma', icon: PenTool, size: [0.0015, 0.012, 0.09], opacity: 1, alpha: true },
  { id: 'pencil', label: 'Lápiz', icon: Pencil, size: [0.0015, 0.008, 0.05], opacity: 0.9, alpha: true },
  { id: 'marker', label: 'Marcador', icon: Highlighter, size: [0.006, 0.035, 0.14], opacity: 0.5, alpha: true },
  { id: 'airbrush', label: 'Difuminado', icon: SprayCan, size: [0.02, 0.09, 0.32], opacity: 0.45, alpha: true },
  { id: 'neon', label: 'Neón', icon: Zap, size: [0.004, 0.016, 0.06], opacity: 1, alpha: true },
  { id: 'rainbow', label: 'Arcoíris', icon: Rainbow, size: [0.003, 0.02, 0.09], opacity: 1, alpha: false },
  { id: 'hearts', label: 'Corazones', icon: Heart, size: [0.012, 0.045, 0.16], opacity: 1, alpha: true },
  { id: 'sparkles', label: 'Brillitos', icon: Sparkles, size: [0.012, 0.045, 0.16], opacity: 1, alpha: true },
]

export const ERASER: BrushDef = { id: 'eraser', label: 'Borrador', icon: Eraser, size: [0.004, 0.04, 0.2], opacity: 1, alpha: true }

export const brushDef = (id: BrushId): BrushDef => (id === 'eraser' ? ERASER : (BRUSHES.find((b) => b.id === id) ?? BRUSHES[0]))

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

/** Generador pseudoaleatorio con semilla (mulberry32): mismos trazos, mismo dibujo. */
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const triples = (p: number[]): number[][] => {
  const out: number[][] = []
  for (let i = 0; i < p.length; i += 3) out.push([p[i] * DOC, p[i + 1] * DOC, p[i + 2]])
  return out
}

function pathFromOutline(pts: number[][]): Path2D {
  const path = new Path2D()
  const n = pts.length
  if (n < 3) return path
  path.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < n; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % n]
    path.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
  }
  path.closePath()
  return path
}

function centerline(pts: StrokePoint[]): Path2D {
  const path = new Path2D()
  const n = pts.length
  path.moveTo(pts[0].point[0], pts[0].point[1])
  if (n === 1) {
    path.lineTo(pts[0].point[0] + 0.01, pts[0].point[1])
    return path
  }
  for (let i = 1; i < n - 1; i++) {
    const a = pts[i].point
    const b = pts[i + 1].point
    path.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
  }
  path.lineTo(pts[n - 1].point[0], pts[n - 1].point[1])
  return path
}

/** Recorre la línea y llama a `fn` cada `spacing` unidades (empezando en el primer punto). */
function walk(pts: StrokePoint[], spacing: number, fn: (x: number, y: number, pressure: number, angle: number) => void) {
  if (!pts.length) return
  const first = pts[0]
  fn(first.point[0], first.point[1], first.pressure, 0)
  let carry = 0
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1].point
    const [x1, y1] = pts[i].point
    const dx = x1 - x0
    const dy = y1 - y0
    const len = Math.hypot(dx, dy)
    if (!len) continue
    const angle = Math.atan2(dy, dx)
    let d = spacing - carry
    while (d <= len) {
      const t = d / len
      fn(x0 + dx * t, y0 + dy * t, pts[i - 1].pressure + (pts[i].pressure - pts[i - 1].pressure) * t, angle)
      d += spacing
    }
    carry = len - (d - spacing)
  }
}

// Formas
const HEART = new Path2D(
  'M0 .42C-.08 .34-.5 .08-.5-.17C-.5-.36-.36-.47-.24-.47C-.12-.47-.03-.39 0-.3C.03-.39 .12-.47 .24-.47C.36-.47 .5-.36 .5-.17C.5 .08 .08 .34 0 .42Z',
)
const STAR = new Path2D('M0-.5Q.07-.07 .5 0Q.07 .07 0 .5Q-.07 .07-.5 0Q-.07-.07 0-.5Z')

// Texturas (una por color, se crean una vez)
const grainCache = new Map<string, HTMLCanvasElement>()
function grainTile(color: string): HTMLCanvasElement {
  let tile = grainCache.get(color)
  if (tile) return tile
  tile = document.createElement('canvas')
  tile.width = tile.height = 96
  const ctx = tile.getContext('2d')!
  const img = ctx.createImageData(96, 96)
  const [r, g, b] = hexToRgb(color)
  const rand = rng(7)
  for (let i = 0; i < img.data.length; i += 4) {
    const n = rand()
    img.data[i] = r
    img.data[i + 1] = g
    img.data[i + 2] = b
    img.data[i + 3] = n < 0.18 ? 40 : n < 0.45 ? 150 : 235
  }
  ctx.putImageData(img, 0, 0)
  if (grainCache.size > 40) grainCache.clear()
  grainCache.set(color, tile)
  return tile
}

const dabCache = new Map<string, HTMLCanvasElement>()
function softDab(color: string): HTMLCanvasElement {
  let dab = dabCache.get(color)
  if (dab) return dab
  dab = document.createElement('canvas')
  dab.width = dab.height = 128
  const ctx = dab.getContext('2d')!
  const [r, g, b] = hexToRgb(color)
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, `rgba(${r},${g},${b},1)`)
  grad.addColorStop(0.35, `rgba(${r},${g},${b},0.75)`)
  grad.addColorStop(0.7, `rgba(${r},${g},${b},0.25)`)
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 128, 128)
  if (dabCache.size > 40) dabCache.clear()
  dabCache.set(color, dab)
  return dab
}

// ---------------------------------------------------------------------------
// Pintar un trazo
// ---------------------------------------------------------------------------

interface Geometry {
  path?: Path2D
  pts?: StrokePoint[]
}
const geometryCache = new WeakMap<StrokeOp, Geometry>()

function outlineOptions(op: StrokeOp, last: boolean): StrokeOptions {
  const size = op.w * DOC
  switch (op.b) {
    case 'pencil':
      return { size, thinning: 0.3, smoothing: 0.5, streamline: 0.35, simulatePressure: !op.pen, start: { taper: size * 1.2 }, end: { taper: size * 2 }, last }
    case 'eraser':
      return { size, thinning: 0, smoothing: 0.5, streamline: 0.4, simulatePressure: false, last }
    default:
      return {
        size,
        thinning: 0.58,
        smoothing: 0.6,
        streamline: 0.42,
        simulatePressure: !op.pen,
        easing: (t) => Math.sin((t * Math.PI) / 2),
        start: { taper: size * 0.9 },
        end: { taper: size * 1.6 },
        last,
      }
  }
}

function geometry(op: StrokeOp, live: boolean): Geometry {
  const cached = live ? undefined : geometryCache.get(op)
  if (cached) return cached
  const input = triples(op.p)
  const g: Geometry = {}
  if (op.b === 'pen' || op.b === 'pencil' || op.b === 'eraser') {
    g.path = pathFromOutline(getStroke(input, outlineOptions(op, !live)))
  } else {
    g.pts = getStrokePoints(input, { size: op.w * DOC, streamline: op.b === 'airbrush' ? 0.3 : 0.45, last: !live })
    if (!g.pts.length && input.length) g.pts = [{ point: [input[0][0], input[0][1]], pressure: input[0][2] ?? 0.5, distance: 0, vector: [1, 0], runningLength: 0 }]
  }
  if (!live) geometryCache.set(op, g)
  return g
}

/** Pinta un trazo. `live` = se está dibujando (sin caché, final provisional). */
export function drawStroke(ctx: CanvasRenderingContext2D, op: StrokeOp, k: number, live = false): void {
  if (!op.p.length) return
  const g = geometry(op, live)
  const size = op.w * DOC
  ctx.save()
  ctx.globalAlpha = op.o
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  switch (op.b) {
    case 'pen':
      ctx.fillStyle = op.c
      ctx.fill(g.path!)
      break

    case 'pencil': {
      const pattern = ctx.createPattern(grainTile(op.c), 'repeat')
      if (pattern) {
        pattern.setTransform(new DOMMatrix().scale(0.9))
        ctx.fillStyle = pattern
      } else ctx.fillStyle = op.c
      ctx.fill(g.path!)
      break
    }

    case 'eraser':
      ctx.globalCompositeOperation = 'destination-out'
      ctx.fillStyle = '#000'
      ctx.fill(g.path!)
      break

    case 'marker':
      ctx.globalCompositeOperation = 'multiply'
      ctx.strokeStyle = op.c
      ctx.lineWidth = size
      ctx.stroke(centerline(g.pts!))
      break

    case 'neon': {
      const line = centerline(g.pts!)
      ctx.strokeStyle = op.c
      ctx.shadowColor = op.c
      ctx.shadowBlur = size * k * 1.4
      ctx.lineWidth = size
      ctx.stroke(line)
      ctx.shadowBlur = size * k * 0.5
      ctx.stroke(line)
      ctx.shadowBlur = 0
      ctx.strokeStyle = tint(op.c, 0.78)
      ctx.lineWidth = size * 0.4
      ctx.stroke(line)
      break
    }

    case 'rainbow': {
      // Círculos muy juntos cuyo tono avanza con la distancia: degradado continuo, sin "cuentas".
      const { h, s, v } = hexToHsv(op.c)
      const sat = Math.max(0.5, s)
      const val = Math.max(0.72, v)
      let dist = 0
      let px = NaN
      let py = NaN
      walk(g.pts!, Math.max(size * 0.12, 0.35), (x, y, p) => {
        if (!Number.isNaN(px)) dist += Math.hypot(x - px, y - py)
        px = x
        py = y
        ctx.fillStyle = hsvToHex((h + dist * 0.5) % 360, sat, val)
        ctx.beginPath()
        ctx.arc(x, y, (size / 2) * (op.pen ? 0.4 + p * 0.9 : 1), 0, Math.PI * 2)
        ctx.fill()
      })
      break
    }

    case 'airbrush': {
      const dab = softDab(op.c)
      ctx.globalAlpha = op.o * 0.14
      walk(g.pts!, Math.max(size * 0.1, 0.4), (x, y, p) => {
        const r = (size / 2) * (op.pen ? 0.35 + p * 0.9 : 1)
        ctx.drawImage(dab, x - r, y - r, r * 2, r * 2)
      })
      break
    }

    case 'hearts': {
      const rand = rng(op.r)
      walk(g.pts!, size * 1.25, (x, y) => {
        const s = size * (0.72 + rand() * 0.5)
        const rot = (rand() - 0.5) * 0.7
        const light = rand() * 0.28
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(rot)
        ctx.scale(s, s)
        ctx.fillStyle = tint(op.c, light)
        ctx.fill(HEART)
        ctx.globalAlpha = op.o * 0.45
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.ellipse(-0.22, -0.22, 0.09, 0.055, -0.6, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      })
      break
    }

    case 'sparkles': {
      const rand = rng(op.r)
      const soft = tint(op.c, 0.6)
      walk(g.pts!, size * 0.55, (x, y) => {
        const a = rand() * Math.PI * 2
        const d = rand() * size * 0.75
        const px = x + Math.cos(a) * d
        const py = y + Math.sin(a) * d
        const kind = rand()
        ctx.save()
        ctx.translate(px, py)
        if (kind < 0.3) {
          ctx.fillStyle = kind < 0.12 ? '#fff' : soft
          ctx.beginPath()
          ctx.arc(0, 0, size * (0.04 + rand() * 0.05), 0, Math.PI * 2)
          ctx.fill()
        } else {
          const s = size * (0.3 + rand() * 0.6)
          ctx.rotate((rand() - 0.5) * 0.5)
          ctx.scale(s, s)
          ctx.fillStyle = kind < 0.75 ? op.c : soft
          ctx.fill(STAR)
          ctx.fillStyle = '#fff'
          ctx.globalAlpha = op.o * 0.8
          ctx.scale(0.35, 0.35)
          ctx.fill(STAR)
        }
        ctx.restore()
      })
      break
    }
  }
  ctx.restore()
}

/** Trazo de muestra (curva en S) para las vistas previas de los pinceles. */
export function sampleStroke(b: BrushId, c: string, w: number, o: number): StrokeOp {
  const p: number[] = []
  const N = 40
  for (let i = 0; i <= N; i++) {
    const t = i / N
    p.push(0.08 + t * 0.84, 0.5 - Math.sin(t * Math.PI * 2) * 0.24, 0.35 + Math.sin(t * Math.PI) * 0.5)
  }
  return { t: 's', b, c, w, o, p, r: 11 }
}
