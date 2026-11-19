/**
 * Modelo de un dibujo (datos puros, sin React).
 * ---------------------------------------------------------------------------
 * Un dibujo es una lista de operaciones (trazos y rellenos) sobre una hoja
 * cuadrada. Las coordenadas van normalizadas 0–1, así se ve igual de nítido
 * en cualquier pantalla, con cualquier zoom y al exportarlo.
 *
 * Deshacer y rehacer funcionan también después de "Borrar todo".
 * El borrador se guarda solo en el celular (localStorage) para no perder
 * un dibujo si se cierra la app sin enviarlo.
 */
import { local, STORAGE_KEYS } from '../../../lib/storage'

export type BrushId = 'pen' | 'pencil' | 'marker' | 'neon' | 'rainbow' | 'airbrush' | 'hearts' | 'sparkles' | 'eraser'

export interface StrokeOp {
  t: 's'
  /** Pincel. */
  b: BrushId
  /** Color #rrggbb. */
  c: string
  /** Grosor como fracción del ancho de la hoja. */
  w: number
  /** Opacidad 0–1. */
  o: number
  /** x, y, presión… (x e y normalizados 0–1, presión 0–1). */
  p: number[]
  /** Semilla para los pinceles con variación (corazones, brillitos, arcoíris). */
  r: number
  /** Presión real (lápiz óptico): no se simula con la velocidad. */
  pen?: boolean
}

export interface FillOp {
  t: 'f'
  c: string
  o: number
  /** Punto tocado (normalizado). */
  x: number
  y: number
}

export type Op = StrokeOp | FillOp

type Action = { k: 'add'; op: Op } | { k: 'clear'; ops: Op[] }

const isInk = (op: Op) => op.t === 'f' || op.b !== 'eraser'

export class DrawingDoc {
  private ops: Op[] = []
  private done: Action[] = []
  private undone: Action[] = []
  private listeners = new Set<() => void>()
  /** Cambia con cada modificación (para useSyncExternalStore). */
  version = 0

  get all(): readonly Op[] {
    return this.ops
  }
  get size(): number {
    return this.ops.length
  }
  get canUndo(): boolean {
    return this.done.length > 0
  }
  get canRedo(): boolean {
    return this.undone.length > 0
  }
  /** Tiene algo visible (no solo borrones). */
  get hasInk(): boolean {
    return this.ops.some(isInk)
  }

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
  getVersion = (): number => this.version

  private changed() {
    this.version++
    for (const fn of this.listeners) fn()
  }

  add(op: Op): void {
    this.ops.push(op)
    this.done.push({ k: 'add', op })
    this.undone = []
    this.changed()
  }

  /** Borra todo, pero se puede deshacer. */
  clear(): void {
    if (!this.ops.length) return
    this.done.push({ k: 'clear', ops: this.ops })
    this.ops = []
    this.undone = []
    this.changed()
  }

  undo(): boolean {
    const a = this.done.pop()
    if (!a) return false
    if (a.k === 'add') this.ops.pop()
    else this.ops = a.ops
    this.undone.push(a)
    this.changed()
    return true
  }

  redo(): boolean {
    const a = this.undone.pop()
    if (!a) return false
    if (a.k === 'add') this.ops.push(a.op)
    else this.ops = []
    this.done.push(a)
    this.changed()
    return true
  }

  /** Empieza de cero, sin historial (después de enviar). */
  reset(): void {
    this.ops = []
    this.done = []
    this.undone = []
    this.changed()
  }

  // -------------------------------------------------------------------------
  // Borrador guardado en el celular
  // -------------------------------------------------------------------------

  /** Guarda el dibujo (comprimido) o lo borra si está vacío. */
  saveDraft(): void {
    if (!this.ops.length) {
      local.remove(STORAGE_KEYS.drawingDraft)
      return
    }
    local.set(STORAGE_KEYS.drawingDraft, JSON.stringify({ v: 1, ops: this.ops.map(pack) }))
  }

  static fromDraft(): DrawingDoc {
    const doc = new DrawingDoc()
    try {
      const raw = local.get(STORAGE_KEYS.drawingDraft)
      if (!raw) return doc
      const data = JSON.parse(raw) as { v?: number; ops?: unknown[] }
      if (data.v !== 1 || !Array.isArray(data.ops)) return doc
      for (const p of data.ops) {
        const op = unpack(p)
        if (op) {
          doc.ops.push(op)
          doc.done.push({ k: 'add', op })
        }
      }
    } catch {
      /* borrador dañado: se empieza de cero */
    }
    return doc
  }
}

// Compresión: coordenadas como enteros 0–10000 y presión 0–100.
const Q = 10_000

function pack(op: Op): unknown {
  if (op.t === 'f') return { ...op, x: Math.round(op.x * Q), y: Math.round(op.y * Q) }
  const p = new Array<number>(op.p.length)
  for (let i = 0; i < op.p.length; i += 3) {
    p[i] = Math.round(op.p[i] * Q)
    p[i + 1] = Math.round(op.p[i + 1] * Q)
    p[i + 2] = Math.round(op.p[i + 2] * 100)
  }
  return { ...op, p }
}

const BRUSH_IDS: readonly string[] = ['pen', 'pencil', 'marker', 'neon', 'rainbow', 'airbrush', 'hearts', 'sparkles', 'eraser']
const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
const color = (v: unknown) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : '#3a2230')

function unpack(raw: unknown): Op | null {
  const o = raw as Record<string, unknown> | null
  if (!o || typeof o !== 'object') return null
  if (o.t === 'f') return { t: 'f', c: color(o.c), o: num(o.o, 1), x: num(o.x) / Q, y: num(o.y) / Q }
  if (o.t !== 's' || !BRUSH_IDS.includes(o.b as string) || !Array.isArray(o.p)) return null
  const src = o.p as unknown[]
  const p = new Array<number>(src.length - (src.length % 3))
  for (let i = 0; i < p.length; i += 3) {
    p[i] = num(src[i]) / Q
    p[i + 1] = num(src[i + 1]) / Q
    p[i + 2] = num(src[i + 2], 50) / 100
  }
  if (!p.length) return null
  return { t: 's', b: o.b as BrushId, c: color(o.c), w: num(o.w, 0.01), o: num(o.o, 1), p, r: num(o.r), pen: o.pen === true }
}
