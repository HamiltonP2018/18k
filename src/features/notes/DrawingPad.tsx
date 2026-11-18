/**
 * Lienzo para dibujar con el dedo (o el mouse).
 * - Trazos suavizados, 7 tintas, 3 grosores, borrador, deshacer y borrar todo.
 * - Los trazos se guardan normalizados (0–1): se exportan nítidos a 720 px
 *   sin importar el tamaño de la pantalla.
 * - Los trazos viven en el padre (`StrokeStore`), así no se pierden si se cierra
 *   el editor sin enviar.
 */
import { useCallback, useEffect, useImperativeHandle, useRef, useState, type PointerEvent as ReactPointerEvent, type Ref } from 'react'
import { Eraser, Trash2, Undo2 } from 'lucide-react'
import { BRUSHES, INKS } from './colors'
import { LIMITS } from './protocol'
import { cx } from '../../lib/cx'
import type { Stroke, StrokeStore } from './strokes'
import styles from './DrawingPad.module.css'


export interface DrawingPadHandle {
  /** Exporta el dibujo (fondo transparente) o null si está vacío. */
  exportImage: () => { data: string; w: number; h: number } | null
}

export interface DrawingPadProps {
  store: StrokeStore
  /** Color del papel (fondo del lienzo). */
  paper: string
  onChange?: (hasInk: boolean) => void
  onActivity?: () => void
  ref?: Ref<DrawingPadHandle>
}

function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke, W: number) {
  const p = s.pts
  const n = p.length / 2
  if (!n) return
  ctx.save()
  ctx.globalCompositeOperation = s.erase ? 'destination-out' : 'source-over'
  ctx.strokeStyle = s.color
  ctx.fillStyle = s.color
  ctx.lineWidth = s.size * W
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  if (n === 1) {
    ctx.beginPath()
    ctx.arc(p[0] * W, p[1] * W, (s.size * W) / 2, 0, Math.PI * 2)
    ctx.fill()
  } else {
    ctx.beginPath()
    ctx.moveTo(p[0] * W, p[1] * W)
    for (let i = 1; i < n - 1; i++) {
      const x = p[i * 2] * W
      const y = p[i * 2 + 1] * W
      ctx.quadraticCurveTo(x, y, (x + p[i * 2 + 2] * W) / 2, (y + p[i * 2 + 3] * W) / 2)
    }
    ctx.lineTo(p[(n - 1) * 2] * W, p[(n - 1) * 2 + 1] * W)
    ctx.stroke()
  }
  ctx.restore()
}

const hasInk = (strokes: readonly Stroke[]) => strokes.some((s) => !s.erase)

function renderAll(canvas: HTMLCanvasElement, strokes: readonly Stroke[]) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  for (const s of strokes) drawStroke(ctx, s, canvas.width)
}

export function DrawingPad({ store, paper, onChange, onActivity, ref }: DrawingPadProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const committed = useRef<HTMLCanvasElement | null>(null)
  const current = useRef<Stroke | null>(null)
  const pointerId = useRef<number | null>(null)
  const frame = useRef(0)
  const [ink, setInk] = useState<string>(INKS[0].value)
  const [size, setSize] = useState<number>(BRUSHES[1].value)
  const [erase, setErase] = useState(false)
  const [count, setCount] = useState(store.size)
  const [confirmClear, setConfirmClear] = useState(false)

  /** Rehace la capa de trazos terminados y pinta todo. */
  const rebuild = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!committed.current) committed.current = document.createElement('canvas')
    const c = committed.current
    c.width = canvas.width
    c.height = canvas.height
    renderAll(c, store.all)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(c, 0, 0)
  }, [store])

  // Tamaño del lienzo = ancho del contenedor × densidad de pantalla.
  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const resize = () => {
      const px = Math.round(wrap.clientWidth * Math.min(window.devicePixelRatio || 1, 3))
      if (px > 0 && canvas.width !== px) {
        canvas.width = px
        canvas.height = px
        rebuild()
      }
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [rebuild])

  useEffect(() => {
    if (!confirmClear) return
    const t = window.setTimeout(() => setConfirmClear(false), 3000)
    return () => window.clearTimeout(t)
  }, [confirmClear])

  const paintCurrent = () => {
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      if (committed.current) ctx.drawImage(committed.current, 0, 0)
      if (current.current) drawStroke(ctx, current.current, canvas.width)
    })
  }

  const point = (e: { clientX: number; clientY: number }) => {
    const r = canvasRef.current!.getBoundingClientRect()
    return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))]
  }

  const onDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (pointerId.current !== null) return // ignora un segundo dedo / la palma
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    pointerId.current = e.pointerId
    current.current = { color: ink, size: erase ? size * 2.2 : size, erase, pts: point(e) }
    paintCurrent()
    onActivity?.()
  }

  const onMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (e.pointerId !== pointerId.current || !current.current) return
    const events = e.nativeEvent.getCoalescedEvents?.() ?? []
    for (const ev of events.length ? events : [e.nativeEvent]) current.current.pts.push(...point(ev))
    paintCurrent()
  }

  const onUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (e.pointerId !== pointerId.current) return
    pointerId.current = null
    const s = current.current
    current.current = null
    if (!s) return
    store.add(s)
    const c = committed.current
    const canvas = canvasRef.current
    if (c && canvas) {
      const cctx = c.getContext('2d')
      if (cctx) drawStroke(cctx, s, c.width)
    }
    paintCurrent()
    setCount(store.size)
    onChange?.(hasInk(store.all))
  }

  const undo = () => {
    if (!store.size) return
    store.undo()
    rebuild()
    setCount(store.size)
    onChange?.(hasInk(store.all))
  }

  const clear = () => {
    if (!confirmClear) {
      setConfirmClear(true)
      return
    }
    store.clear()
    rebuild()
    setCount(0)
    setConfirmClear(false)
    onChange?.(false)
  }

  useImperativeHandle(
    ref,
    () => ({
      exportImage() {
        if (!hasInk(store.all)) return null
        for (const [px, type] of [
          [720, 'image/webp'],
          [720, 'image/png'],
          [540, 'image/webp'],
          [540, 'image/png'],
        ] as const) {
          const c = document.createElement('canvas')
          c.width = px
          c.height = px
          renderAll(c, store.all)
          let data = c.toDataURL(type, 0.92)
          if (type === 'image/webp' && !data.startsWith('data:image/webp')) continue // Safari antiguo: sin WebP
          if (data.length <= LIMITS.imageDataUrl) return { data, w: px, h: px }
          data = ''
        }
        return null
      },
    }),
    [store],
  )

  return (
    <div className={styles.wrap}>
      <div ref={wrapRef} className={styles.pad} style={{ background: paper }}>
        <canvas
          ref={canvasRef}
          className={cx(styles.canvas, erase && styles.erasing)}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          aria-label="Lienzo para dibujar"
          role="img"
        />
        {count === 0 && <p className={styles.hint}>Dibuja aquí con el dedo ✍️</p>}
      </div>

      <div className={styles.tools} role="toolbar" aria-label="Herramientas de dibujo">
        <div className={styles.inks}>
          {INKS.map((c) => (
            <button
              key={c.value}
              type="button"
              className={cx(styles.ink, !erase && ink === c.value && styles.selected)}
              style={{ background: c.value }}
              onClick={() => {
                setInk(c.value)
                setErase(false)
              }}
              aria-label={`Tinta ${c.label}`}
              aria-pressed={!erase && ink === c.value}
            />
          ))}
        </div>
        <div className={styles.row}>
          <div className={styles.sizes}>
            {BRUSHES.map((b) => (
              <button
                key={b.value}
                type="button"
                className={cx(styles.size, size === b.value && styles.selected)}
                onClick={() => setSize(b.value)}
                aria-label={`Grosor ${b.label}`}
                aria-pressed={size === b.value}
              >
                <span style={{ width: 4 + b.value * 360, height: 4 + b.value * 360, background: erase ? 'currentColor' : ink }} />
              </button>
            ))}
          </div>
          <div className={styles.actions}>
            <button type="button" className={cx(styles.tool, erase && styles.toolOn)} onClick={() => setErase((v) => !v)} aria-pressed={erase} aria-label="Borrador">
              <Eraser aria-hidden strokeWidth={1.7} />
            </button>
            <button type="button" className={styles.tool} onClick={undo} disabled={!count} aria-label="Deshacer">
              <Undo2 aria-hidden strokeWidth={1.7} />
            </button>
            <button type="button" className={cx(styles.tool, confirmClear && styles.danger)} onClick={clear} disabled={!count} aria-label={confirmClear ? 'Confirmar: borrar todo' : 'Borrar todo'}>
              <Trash2 aria-hidden strokeWidth={1.7} />
              {confirmClear && <span>¿Todo?</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
