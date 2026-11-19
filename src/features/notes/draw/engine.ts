/**
 * Motor del lienzo: vista con zoom, gestos táctiles y pintado en vivo.
 * ---------------------------------------------------------------------------
 * Sin React (los movimientos del dedo no pasan por el estado de React).
 *
 * El grosor del pincel es el que se ve en pantalla: con zoom, el trazo queda
 * más fino en la hoja (así se dibujan los detalles sin mover el deslizador).
 *
 * Gestos (inspirados en Procreate):
 *   1 dedo            dibujar (o rellenar / tomar color, según la herramienta)
 *   2 dedos           pellizcar para acercar/alejar y arrastrar para moverse
 *   toque con 2 dedos deshacer · toque con 3 dedos rehacer
 *   mantener 1 dedo   gotero (toma el color que hay debajo)
 * Con lápiz óptico, el dedo solo mueve la hoja (así la palma no raya).
 *
 * Capas: la hoja es un <div> (color del papel) y encima un <canvas> con la
 * tinta. Se guarda una copia de la tinta ya pintada (`ink`) para no repintar
 * todo en cada cuadro; solo se repinta completo al cambiar el zoom o deshacer.
 */
import { DOC } from './brushes'
import type { BrushId, DrawingDoc, Op, StrokeOp } from './doc'
import { canvas, renderLive, renderOps } from './render'
import { hexToRgb, rgbToHex } from './palette'

export type Tool = 'brush' | 'eraser' | 'fill' | 'picker'

export interface ToolState {
  tool: Tool
  brush: BrushId
  color: string
  size: number
  opacity: number
}

export interface EngineCallbacks {
  /** Cambió el zoom (`fitPx` = lado de la hoja con zoom 1, en px CSS). */
  onView(zoom: number, fitPx: number): void
  /** Empezó a dibujar (para avisar "está dibujando…"). */
  onStroke(): void
  /** Se agregó una operación (trazo o relleno). */
  onCommit(op: Op): void
  /** Gotero: color bajo el dedo (null = fuera de la hoja) y dónde mostrar la lupa. */
  onPick(color: string | null, x: number, y: number): void
  /** Gotero: soltó el dedo. */
  onPickEnd(color: string | null): void
  /** Deshacer/rehacer con toque de dos o tres dedos (`ok` = había algo que deshacer/rehacer). */
  onTapGesture(kind: 'undo' | 'redo', ok: boolean): void
  /** Balde: tocó en (x, y) px de la pantalla. */
  onFill(x: number, y: number): void
}

interface Ptr {
  id: number
  type: string
  x: number
  y: number
  x0: number
  y0: number
  moved: boolean
}

interface View {
  x: number
  y: number
  z: number
}

type Mode = 'idle' | 'draw' | 'gesture' | 'pick' | 'fill' | 'blocked'

const MIN_Z = 0.5
const MAX_Z = 12
/** Margen alrededor de la hoja cuando se ve completa (px CSS). */
const MARGIN = 14
/** Cuánto de la hoja tiene que quedar visible al moverla (px CSS). */
const KEEP_VISIBLE = 72
const TAP_MS = 320
const LONG_PRESS_MS = 520

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

export class StudioEngine {
  private ctx: CanvasRenderingContext2D
  private ink = canvas(1)
  private inkCtx: CanvasRenderingContext2D
  private dpr = 1
  private W = 0
  private H = 0
  /** Lado de la hoja con zoom 1 (px CSS). */
  private fitPx = 0
  private view: View = { x: 0, y: 0, z: 1 }
  /** Vista con la que se pintó `ink`. */
  private inkView: View = { x: 0, y: 0, z: 1 }
  private renderCost = 0
  private fitted = true
  private tool: ToolState = { tool: 'brush', brush: 'pen', color: '#3a2230', size: 0.012, opacity: 1 }

  private pointers = new Map<number, Ptr>()
  private mode: Mode = 'idle'
  private activeId = -1
  private current: StrokeOp | null = null
  private strokeStart = 0
  private strokeLen = 0
  private penSeen = false
  private pickColor: string | null = null
  private longPress = 0
  private gesture = { t0: 0, fingers: 0, moved: false, cx: 0, cy: 0, dist: 0, view: { x: 0, y: 0, z: 1 } }

  private frame = 0
  private fullTimer = 0
  private tween = 0
  private ownChange = false
  private unsubscribe: () => void
  private ro: ResizeObserver
  private cleanup: (() => void)[] = []
  private lastView = { zoom: 0, fit: 0 }
  private paperColor = '#fbf3e6'
  private stage: HTMLElement
  private el: HTMLCanvasElement
  private paperEl: HTMLElement
  private doc: DrawingDoc
  private cb: EngineCallbacks

  constructor(stage: HTMLElement, el: HTMLCanvasElement, paperEl: HTMLElement, doc: DrawingDoc, cb: EngineCallbacks) {
    this.stage = stage
    this.el = el
    this.paperEl = paperEl
    this.doc = doc
    this.cb = cb
    this.ctx = el.getContext('2d')!
    this.inkCtx = this.ink.getContext('2d')!

    this.unsubscribe = doc.subscribe(() => {
      if (this.ownChange) return
      this.fullRender() // deshacer, rehacer, borrar todo
    })

    const on = (t: EventTarget, type: string, fn: (e: Event) => void, opts?: AddEventListenerOptions) => {
      t.addEventListener(type, fn, opts)
      this.cleanup.push(() => t.removeEventListener(type, fn, opts))
    }
    const active = { passive: false }
    on(el, 'pointerdown', (e) => this.down(e as PointerEvent), active)
    on(el, 'pointermove', (e) => this.move(e as PointerEvent), active)
    on(el, 'pointerup', (e) => this.up(e as PointerEvent))
    on(el, 'pointercancel', (e) => this.up(e as PointerEvent))
    on(el, 'lostpointercapture', (e) => this.up(e as PointerEvent))
    on(el, 'wheel', (e) => this.wheel(e as WheelEvent), active)
    on(el, 'contextmenu', (e) => e.preventDefault())
    // Safari: que el pellizco no haga zoom a la página.
    for (const t of ['gesturestart', 'gesturechange', 'gestureend']) on(stage, t, (e) => e.preventDefault(), active)

    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(stage)
    this.resize()
  }

  destroy(): void {
    this.unsubscribe()
    this.ro.disconnect()
    for (const fn of this.cleanup) fn()
    cancelAnimationFrame(this.frame)
    cancelAnimationFrame(this.tween)
    window.clearTimeout(this.fullTimer)
    window.clearTimeout(this.longPress)
    // Libera la memoria de los canvas (Safari es estricto con eso).
    this.ink.width = this.ink.height = 1
  }

  setTool(t: ToolState): void {
    this.tool = t
  }

  // -------------------------------------------------------------------------
  // Vista
  // -------------------------------------------------------------------------

  private resize() {
    // Tamaño de layout (no el de getBoundingClientRect, que cambia con la animación de entrada).
    const w = this.stage.clientWidth
    const h = this.stage.clientHeight
    if (!w || !h) return
    const prevFit = this.fitPx
    const prevW = this.W
    const prevH = this.H
    this.dpr = Math.min(window.devicePixelRatio || 1, 3)
    this.W = w
    this.H = h
    this.fitPx = Math.max(40, Math.min(this.W, this.H) - MARGIN * 2)
    for (const c of [this.el, this.ink]) {
      c.width = Math.round(this.W * this.dpr)
      c.height = Math.round(this.H * this.dpr)
    }
    if (this.fitted || !prevFit) {
      this.setView(this.fitView())
    } else {
      // Conserva lo que se veía en el centro y el tamaño real de la hoja.
      const docPx = prevFit * this.view.z
      const u = (prevW / 2 - this.view.x) / docPx
      const v = (prevH / 2 - this.view.y) / docPx
      const z = docPx / this.fitPx
      this.setView({ z, x: this.W / 2 - u * docPx, y: this.H / 2 - v * docPx })
    }
    this.fullRender()
  }

  private fitView(): View {
    return { z: 1, x: (this.W - this.fitPx) / 2, y: (this.H - this.fitPx) / 2 }
  }

  private setView(v: View) {
    const z = clamp(v.z, MIN_Z, MAX_Z)
    const size = this.fitPx * z
    const x = clamp(v.x, KEEP_VISIBLE - size, this.W - KEEP_VISIBLE)
    const y = clamp(v.y, KEEP_VISIBLE - size, this.H - KEEP_VISIBLE)
    this.view = { x, y, z }
    const st = this.paperEl.style
    st.width = st.height = `${size}px`
    st.transform = `translate3d(${x}px, ${y}px, 0)`
    const zoom = Math.round(z * 100)
    if (zoom !== this.lastView.zoom || this.fitPx !== this.lastView.fit) {
      this.lastView = { zoom, fit: this.fitPx }
      this.cb.onView(zoom / 100, this.fitPx)
    }
  }

  /** Vuelve a ver la hoja completa (animado). */
  fit(): void {
    this.fitted = true
    this.animateTo(this.fitView())
  }

  private animateTo(target: View) {
    cancelAnimationFrame(this.tween)
    const from = { ...this.view }
    const t0 = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / 260)
      const e = 1 - Math.pow(1 - t, 3)
      this.setView({ x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e, z: from.z + (target.z - from.z) * e })
      if (t < 1) {
        this.composite(true)
        this.tween = requestAnimationFrame(step)
      } else this.fullRender()
    }
    this.tween = requestAnimationFrame(step)
  }

  // -------------------------------------------------------------------------
  // Pintado
  // -------------------------------------------------------------------------

  private transformFor(v: View) {
    const s = this.fitPx * v.z * this.dpr
    return { k: s / DOC, ox: v.x * this.dpr, oy: v.y * this.dpr }
  }

  /** Repinta toda la tinta con la vista actual. */
  fullRender(): void {
    window.clearTimeout(this.fullTimer)
    const c = this.inkCtx
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.clearRect(0, 0, this.ink.width, this.ink.height)
    const { k, ox, oy } = this.transformFor(this.view)
    const t0 = performance.now()
    renderOps(c, this.doc.all, k, ox, oy)
    this.renderCost = performance.now() - t0
    this.inkView = { ...this.view }
    this.composite()
  }

  /**
   * Pasa la tinta al canvas visible y pinta encima el trazo en curso.
   * `fast`: si la vista cambió, estira la copia anterior (mientras se pellizca)
   * en vez de repintar todo; luego se repinta nítido.
   */
  private composite(fast = false) {
    const ctx = this.ctx
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, this.el.width, this.el.height)
    const v = this.view
    const iv = this.inkView
    if (v.x === iv.x && v.y === iv.y && v.z === iv.z) {
      ctx.drawImage(this.ink, 0, 0)
    } else if (fast) {
      const a = v.z / iv.z
      ctx.imageSmoothingEnabled = true
      ctx.drawImage(this.ink, this.dpr * (v.x - iv.x * a), this.dpr * (v.y - iv.y * a), this.ink.width * a, this.ink.height * a)
    } else {
      this.fullRender()
      return
    }
    if (this.current) {
      const { k, ox, oy } = this.transformFor(v)
      renderLive(ctx, this.current, k, ox, oy)
    }
  }

  private requestComposite() {
    if (this.frame) return
    this.frame = requestAnimationFrame(() => {
      this.frame = 0
      this.composite()
    })
  }

  /** Durante gestos: repinta nítido si es barato; si no, estira y repinta al final. */
  private viewChanged() {
    if (this.frame) return
    this.frame = requestAnimationFrame(() => {
      this.frame = 0
      if (this.renderCost < 9) this.fullRender()
      else {
        this.composite(true)
        window.clearTimeout(this.fullTimer)
        this.fullTimer = window.setTimeout(() => this.fullRender(), 160)
      }
    })
  }

  // -------------------------------------------------------------------------
  // Punteros
  // -------------------------------------------------------------------------

  /** Posición del puntero en px CSS del escenario (corrige si está escalado por una animación). */
  private local(e: { clientX: number; clientY: number }, r = this.el.getBoundingClientRect()) {
    const sx = r.width ? this.W / r.width : 1
    const sy = r.height ? this.H / r.height : 1
    return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy }
  }

  private toDoc(x: number, y: number) {
    const s = this.fitPx * this.view.z
    return { u: (x - this.view.x) / s, v: (y - this.view.y) / s }
  }

  private down(e: PointerEvent) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.preventDefault()
    // Con lápiz dibujando, se ignoran los dedos (la palma).
    if (this.mode === 'draw' && this.currentIsPen() && e.pointerType === 'touch') return
    try {
      this.el.setPointerCapture(e.pointerId)
    } catch {
      /* algunos navegadores no lo permiten en todos los casos */
    }
    const { x, y } = this.local(e)
    const p: Ptr = { id: e.pointerId, type: e.pointerType, x, y, x0: x, y0: y, moved: false }
    this.pointers.set(e.pointerId, p)
    if (e.pointerType === 'pen') this.penSeen = true
    cancelAnimationFrame(this.tween)

    if (this.mode === 'gesture') {
      this.gesture.fingers = Math.max(this.gesture.fingers, this.pointers.size)
      this.resetGesture()
      return
    }
    if (this.mode !== 'idle') {
      if (e.pointerType !== 'touch' || this.pointers.size < 2) return
      // Segundo dedo: es un gesto. Un trazo recién empezado se descarta.
      if (this.mode === 'draw') {
        const young = e.timeStamp - this.strokeStart < 260 || this.strokeLen < 24
        if (young) this.cancelStroke()
        else this.commitStroke()
      } else if (this.mode === 'pick') {
        this.cb.onPickEnd(null)
      }
      this.startGesture(e.timeStamp)
      return
    }

    if (e.pointerType === 'touch' && this.penSeen) return this.startGesture(e.timeStamp)
    this.activeId = e.pointerId
    if (this.tool.tool === 'fill') {
      this.mode = 'fill'
      return
    }
    if (this.tool.tool === 'picker') {
      this.mode = 'pick'
      this.pick(p)
      return
    }
    this.startStroke(e, p)
  }

  private move(e: PointerEvent) {
    const p = this.pointers.get(e.pointerId)
    if (!p) return
    e.preventDefault()
    const { x, y } = this.local(e)
    p.x = x
    p.y = y
    if (!p.moved && Math.hypot(x - p.x0, y - p.y0) > 8) p.moved = true

    switch (this.mode) {
      case 'draw':
        if (e.pointerId === this.activeId) this.extendStroke(e)
        break
      case 'gesture':
        this.updateGesture()
        break
      case 'pick':
        if (e.pointerId === this.activeId) this.pick(p)
        break
    }
  }

  private up(e: PointerEvent) {
    const p = this.pointers.get(e.pointerId)
    if (!p) return
    this.pointers.delete(e.pointerId)

    switch (this.mode) {
      case 'draw':
        if (e.pointerId === this.activeId) {
          this.commitStroke()
          this.mode = this.pointers.size ? 'blocked' : 'idle'
        }
        break
      case 'gesture':
        if (!this.pointers.size) this.endGesture(e.timeStamp)
        else this.resetGesture()
        break
      case 'pick':
        if (e.pointerId === this.activeId) {
          this.cb.onPickEnd(this.pickColor)
          this.mode = this.pointers.size ? 'blocked' : 'idle'
        }
        break
      case 'fill':
        if (e.pointerId === this.activeId) {
          if (!p.moved) this.fillAt(p.x, p.y)
          this.mode = this.pointers.size ? 'blocked' : 'idle'
        }
        break
      case 'blocked':
        if (!this.pointers.size) this.mode = 'idle'
        break
    }
  }

  private wheel(e: WheelEvent) {
    e.preventDefault()
    const { x, y } = this.local(e)
    const v = this.view
    this.fitted = false
    // Pellizco en el trackpad (ctrlKey) o rueda del mouse: zoom. Dos dedos en el trackpad: mover.
    if (e.ctrlKey || e.metaKey || (e.deltaX === 0 && e.deltaMode === 1) || (e.deltaX === 0 && Math.abs(e.deltaY) >= 50 && !e.shiftKey)) {
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0025))
      const z = clamp(v.z * factor, MIN_Z, MAX_Z)
      const s = z / v.z
      this.setView({ z, x: x - (x - v.x) * s, y: y - (y - v.y) * s })
    } else {
      this.setView({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY })
    }
    this.viewChanged()
  }

  // -------------------------------------------------------------------------
  // Trazos
  // -------------------------------------------------------------------------

  private currentIsPen() {
    return this.current?.pen === true
  }

  private startStroke(e: PointerEvent, p: Ptr) {
    const t = this.tool
    const brush: BrushId = t.tool === 'eraser' ? 'eraser' : t.brush
    const { u, v } = this.toDoc(p.x, p.y)
    const pen = e.pointerType === 'pen'
    this.current = {
      t: 's',
      b: brush,
      c: t.color,
      // El grosor se ve igual en pantalla con cualquier zoom: acercarse = trazo más fino (para detalles).
      w: t.size / this.view.z,
      o: t.opacity,
      p: [u, v, pen ? e.pressure || 0.5 : 0.5],
      r: (Math.random() * 2 ** 31) | 0,
      ...(pen ? { pen: true } : {}),
    }
    this.mode = 'draw'
    this.strokeStart = e.timeStamp
    this.strokeLen = 0
    this.cb.onStroke()
    this.requestComposite()

    // Mantener el dedo quieto = gotero (solo con pincel).
    window.clearTimeout(this.longPress)
    if (t.tool === 'brush') {
      this.longPress = window.setTimeout(() => {
        if (this.mode !== 'draw' || p.moved || this.pointers.size !== 1) return
        this.cancelStroke()
        this.mode = 'pick'
        navigator.vibrate?.(10)
        this.pick(p)
      }, LONG_PRESS_MS)
    }
  }

  private extendStroke(e: PointerEvent) {
    const s = this.current
    if (!s) return
    const minStep = 0.6 / (this.fitPx * this.view.z)
    const r = this.el.getBoundingClientRect()
    const coalesced = e.getCoalescedEvents?.() ?? []
    for (const ev of coalesced.length ? coalesced : [e]) {
      const pt = this.local(ev, r)
      const { u, v } = this.toDoc(pt.x, pt.y)
      const n = s.p.length
      const du = u - s.p[n - 3]
      const dv = v - s.p[n - 2]
      const d = Math.hypot(du, dv)
      if (d < minStep) continue
      this.strokeLen += d * this.fitPx * this.view.z
      s.p.push(u, v, s.pen ? ev.pressure || 0.5 : 0.5)
    }
    if (this.strokeLen > 6) window.clearTimeout(this.longPress)
    this.requestComposite()
  }

  private commitStroke() {
    window.clearTimeout(this.longPress)
    const s = this.current
    this.current = null
    if (!s) return
    this.ownChange = true
    this.doc.add(s)
    this.ownChange = false
    // Solo se pinta el trazo nuevo sobre la tinta (si la vista no cambió).
    const iv = this.inkView
    const v = this.view
    if (iv.x === v.x && iv.y === v.y && iv.z === v.z) {
      const { k, ox, oy } = this.transformFor(v)
      renderOps(this.inkCtx, this.doc.all, k, ox, oy, this.doc.size - 1)
      this.composite()
    } else this.fullRender()
    this.cb.onCommit(s)
  }

  private cancelStroke() {
    window.clearTimeout(this.longPress)
    this.current = null
    this.requestComposite()
  }

  // -------------------------------------------------------------------------
  // Gotero y balde
  // -------------------------------------------------------------------------

  private pick(p: Ptr) {
    const { u, v } = this.toDoc(p.x, p.y)
    let color: string | null = null
    if (u >= 0 && v >= 0 && u <= 1 && v <= 1) {
      const iv = this.inkView
      if (iv.x !== this.view.x || iv.y !== this.view.y || iv.z !== this.view.z) this.fullRender()
      const px = clamp(Math.round(p.x * this.dpr), 0, this.ink.width - 1)
      const py = clamp(Math.round(p.y * this.dpr), 0, this.ink.height - 1)
      const [r, g, b, a] = this.inkCtx.getImageData(px, py, 1, 1).data
      const [pr, pg, pb] = hexToRgb(this.paperColor)
      const al = a / 255
      color = rgbToHex([Math.round(r * al + pr * (1 - al)), Math.round(g * al + pg * (1 - al)), Math.round(b * al + pb * (1 - al))])
    }
    this.pickColor = color
    this.cb.onPick(color, p.x, p.y)
  }

  setPaper(color: string): void {
    this.paperColor = color
    this.paperEl.style.backgroundColor = color
  }

  private fillAt(x: number, y: number) {
    const { u, v } = this.toDoc(x, y)
    if (u < 0 || v < 0 || u > 1 || v > 1) return
    this.cb.onFill(x, y)
    const op: Op = { t: 'f', c: this.tool.color, o: this.tool.opacity, x: u, y: v }
    // Deja que se vea la onda antes del cálculo (puede tardar un instante).
    window.setTimeout(() => {
      this.ownChange = true
      this.doc.add(op)
      this.ownChange = false
      this.fullRender()
      this.cb.onCommit(op)
    }, 30)
  }

  // -------------------------------------------------------------------------
  // Gestos con dos o más dedos
  // -------------------------------------------------------------------------

  private startGesture(t: number) {
    this.mode = 'gesture'
    this.fitted = false
    this.gesture.t0 = t
    this.gesture.fingers = this.pointers.size
    this.gesture.moved = false
    this.resetGesture()
  }

  private centroid() {
    let cx = 0
    let cy = 0
    const pts = [...this.pointers.values()].slice(0, 2)
    for (const p of pts) {
      cx += p.x
      cy += p.y
    }
    cx /= pts.length || 1
    cy /= pts.length || 1
    const dist = pts.length >= 2 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0
    return { cx, cy, dist }
  }

  private resetGesture() {
    const { cx, cy, dist } = this.centroid()
    Object.assign(this.gesture, { cx, cy, dist, view: { ...this.view } })
  }

  private updateGesture() {
    const g = this.gesture
    for (const p of this.pointers.values()) if (p.moved) g.moved = true
    if (!g.moved) return
    const { cx, cy, dist } = this.centroid()
    const v0 = g.view
    const z = g.dist > 0 && dist > 0 ? clamp(v0.z * (dist / g.dist), MIN_Z, MAX_Z) : v0.z
    const s = z / v0.z
    // El punto de la hoja que estaba bajo los dedos sigue bajo los dedos.
    this.setView({ z, x: cx - (g.cx - v0.x) * s, y: cy - (g.cy - v0.y) * s })
    this.viewChanged()
  }

  private endGesture(t: number) {
    const g = this.gesture
    this.mode = 'idle'
    if (!g.moved && t - g.t0 < TAP_MS && g.fingers >= 2) {
      const kind = g.fingers >= 3 ? 'redo' : 'undo'
      const ok = kind === 'undo' ? this.doc.undo() : this.doc.redo()
      if (ok) navigator.vibrate?.(8)
      this.cb.onTapGesture(kind, ok)
      return
    }
    // Si quedó casi a pantalla completa, se ajusta solo.
    if (Math.abs(this.view.z - 1) < 0.12) this.fit()
    else this.fullRender()
  }
}
