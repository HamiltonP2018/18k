/**
 * Paneles del lienzo: pinceles, colores, menú (papel y más) y ayuda de gestos.
 */
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { Hand, Pipette, Scan, Trash2, X } from 'lucide-react'
import { cx } from '../../../lib/cx'
import { EASE_OUT } from '../../../lib/motion'
import { PAPER } from '../colors'
import { NOTE_COLORS, type NoteColor } from '../protocol'
import { BRUSHES, DOC, brushDef, sampleStroke } from './brushes'
import type { PaintBrush } from './settings'
import { hexToHsv, hsvToHex, isLight, PALETTE } from './palette'
import { renderOps } from './render'
import styles from './DrawingStudio.module.css'

// ---------------------------------------------------------------------------
// Contenedor
// ---------------------------------------------------------------------------

export function Panel({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <>
      <motion.div className={styles.scrim} onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.section
        className={styles.panel}
        role="dialog"
        aria-label={title}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.32, ease: EASE_OUT }}
      >
        <header className={styles.panelHead}>
          <h3>{title}</h3>
          <button type="button" className={styles.iconBtn} onClick={onClose} aria-label="Cerrar">
            <X aria-hidden strokeWidth={1.8} />
          </button>
        </header>
        <div className={styles.panelBody}>{children}</div>
      </motion.section>
    </>
  )
}

// ---------------------------------------------------------------------------
// Pinceles
// ---------------------------------------------------------------------------

function BrushPreview({ brush, color }: { brush: PaintBrush; color: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    const c = ref.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx) return
    const px = 168
    c.width = c.height = px
    ctx.clearRect(0, 0, px, px)
    const w = Math.min(0.14, Math.max(0.03, brushDef(brush).size[1] * 2.2))
    renderOps(ctx, [sampleStroke(brush, color, w, brushDef(brush).opacity)], px / DOC)
  }, [brush, color])
  return <canvas ref={ref} className={styles.brushCanvas} aria-hidden />
}

export function BrushPanel({ brush, color, paper, onBrush }: { brush: PaintBrush; color: string; paper: string; onBrush: (b: PaintBrush) => void }) {
  return (
    <div className={styles.brushGrid}>
      {BRUSHES.map((b) => {
        const id = b.id as PaintBrush
        return (
          <button key={b.id} type="button" className={cx(styles.brushCard, brush === id && styles.on)} onClick={() => onBrush(id)} aria-pressed={brush === id}>
            <span className={styles.brushPaper} style={{ backgroundColor: paper }}>
              <BrushPreview brush={id} color={color} />
            </span>
            <span className={styles.brushName}>{b.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Colores
// ---------------------------------------------------------------------------

/** Arrastre con captura del puntero; devuelve la posición relativa 0–1. */
function useDrag(onMove: (fx: number, fy: number) => void) {
  const handler = (e: ReactPointerEvent<HTMLElement>) => {
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    onMove(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)))
  }
  return {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      handler(e)
    },
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) handler(e)
    },
  }
}

export function ColorPanel({
  color,
  recents,
  onColor,
  onPicker,
}: {
  color: string
  recents: string[]
  onColor: (c: string) => void
  onPicker: () => void
}) {
  const [hsv, setHsv] = useState(() => hexToHsv(color))
  const [seen, setSeen] = useState(color)

  // Si el color cambia por fuera (paleta, recientes), mueve el mezclador (conserva el tono en grises).
  if (seen !== color) {
    setSeen(color)
    if (hsvToHex(hsv.h, hsv.s, hsv.v) !== color) {
      const next = hexToHsv(color)
      setHsv(next.s === 0 || next.v === 0 ? { ...next, h: hsv.h } : next)
    }
  }

  const set = (next: { h: number; s: number; v: number }) => {
    setHsv(next)
    onColor(hsvToHex(next.h, next.s, next.v))
  }
  const sv = useDrag((fx, fy) => set({ ...hsv, s: fx, v: 1 - fy }))
  const hue = useDrag((fx) => set({ ...hsv, h: Math.min(359.9, fx * 360) }))

  return (
    <div className={styles.colors}>
      <div className={styles.colorHead}>
        <span className={styles.bigSwatch} style={{ background: color }} />
        <span className={styles.hex}>{color.toUpperCase()}</span>
        <button type="button" className={styles.pill} onClick={onPicker}>
          <Pipette aria-hidden strokeWidth={1.8} /> Tomar del dibujo
        </button>
      </div>

      <div className={styles.palette} role="radiogroup" aria-label="Paleta">
        {PALETTE.flat().map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={c === color}
            aria-label={`Color ${c}`}
            className={cx(styles.cell, c === color && styles.cellOn, isLight(c) && styles.light)}
            style={{ background: c }}
            onClick={() => onColor(c)}
          />
        ))}
      </div>

      <p className={styles.label}>Mezcla tu color</p>
      <div className={styles.sv} style={{ '--hue': `${hsv.h}` } as React.CSSProperties} {...sv} aria-label="Saturación y brillo" role="slider" aria-valuetext={color}>
        <span className={styles.svThumb} style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: color }} />
      </div>
      <div className={styles.hue} {...hue} role="slider" aria-label="Tono" aria-valuemin={0} aria-valuemax={360} aria-valuenow={Math.round(hsv.h)}>
        <span className={styles.hueThumb} style={{ left: `${(hsv.h / 360) * 100}%`, background: hsvToHex(hsv.h, 1, 1) }} />
      </div>

      {recents.length > 0 && (
        <>
          <p className={styles.label}>Recientes</p>
          <div className={styles.recentGrid}>
            {recents.map((c) => (
              <button key={c} type="button" className={cx(styles.cell, c === color && styles.cellOn, isLight(c) && styles.light)} style={{ background: c }} onClick={() => onColor(c)} aria-label={`Color ${c}`} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Menú
// ---------------------------------------------------------------------------

export function MenuPanel({
  paper,
  onPaper,
  onFit,
  onTips,
  onClear,
  confirmClear,
  canClear,
}: {
  paper: NoteColor
  onPaper: (c: NoteColor) => void
  onFit: () => void
  onTips: () => void
  onClear: () => void
  confirmClear: boolean
  canClear: boolean
}) {
  return (
    <div className={styles.menu}>
      <p className={styles.label}>Color del papel</p>
      <div className={styles.papers} role="radiogroup" aria-label="Color del papel">
        {NOTE_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={paper === c}
            className={cx(styles.paperSwatch, paper === c && styles.on)}
            style={{ background: PAPER[c].bg }}
            onClick={() => onPaper(c)}
          >
            <span>{PAPER[c].label}</span>
          </button>
        ))}
      </div>
      <button type="button" className={styles.menuItem} onClick={onFit}>
        <Scan aria-hidden strokeWidth={1.8} /> Ver la hoja completa
      </button>
      <button type="button" className={styles.menuItem} onClick={onTips}>
        <Hand aria-hidden strokeWidth={1.8} /> Cómo usar los gestos
      </button>
      <button type="button" className={cx(styles.menuItem, styles.dangerItem, confirmClear && styles.dangerOn)} onClick={onClear} disabled={!canClear}>
        <Trash2 aria-hidden strokeWidth={1.8} /> {confirmClear ? '¿Segura? Toca otra vez para borrar' : 'Borrar todo el dibujo'}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Ayuda de gestos
// ---------------------------------------------------------------------------

export function Tips({ onClose }: { onClose: () => void }) {
  return (
    <motion.div className={styles.tips} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className={styles.tipsCard}
        initial={{ y: 24, scale: 0.96 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className={styles.tipsTitle}>Tu lienzo 🎨</p>
        <ul>
          <li>
            <span aria-hidden>🤏</span> Pellizca con dos dedos para acercarte y dibujar los detalles.
          </li>
          <li>
            <span aria-hidden>✌️</span> Toca con dos dedos para deshacer; con tres, para rehacer.
          </li>
          <li>
            <span aria-hidden>☝️</span> Deja el dedo quieto un momento para tomar un color del dibujo.
          </li>
          <li>
            <span aria-hidden>🪣</span> Con el balde, toca una zona cerrada para pintarla toda.
          </li>
        </ul>
        <button type="button" className={styles.tipsBtn} onClick={onClose}>
          ¡A dibujar!
        </button>
      </motion.div>
    </motion.div>
  )
}
