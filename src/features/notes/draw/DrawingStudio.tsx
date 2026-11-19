/**
 * Lienzo a pantalla completa para dibujar desde el celular.
 * ---------------------------------------------------------------------------
 *   arriba   Listo · zoom (toca para ver la hoja completa) · deshacer · rehacer · menú
 *   centro   la hoja: pellizcar para acercar, dos dedos para moverse
 *   abajo    grosor y opacidad · colores recientes · pinceles, borrador, balde, gotero y color
 *
 * El dibujo vive en el `DrawingDoc` del editor: cerrar el lienzo no lo pierde.
 */
import { useCallback, useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Check, ChevronUp, Droplet, Ellipsis, PaintBucket, Pipette, Redo2, Scan, Undo2 } from 'lucide-react'
import { useLockBodyScroll } from '../../../hooks/useLockBodyScroll'
import { local, STORAGE_KEYS } from '../../../lib/storage'
import { cx } from '../../../lib/cx'
import { EASE_OUT } from '../../../lib/motion'
import { PAPER } from '../colors'
import type { NoteColor } from '../protocol'
import { brushDef, ERASER } from './brushes'
import type { BrushId, DrawingDoc } from './doc'
import { StudioEngine, type Tool } from './engine'
import { isLight } from './palette'
import { useDrawSettings } from './settings'
import { BrushPanel, ColorPanel, MenuPanel, Panel, Tips } from './StudioPanels'
import styles from './DrawingStudio.module.css'

export interface DrawingStudioProps {
  open: boolean
  doc: DrawingDoc
  paper: NoteColor
  onPaper: (c: NoteColor) => void
  onClose: () => void
  /** Empezó un trazo (para el "está dibujando…"). */
  onActivity?: () => void
}

type PanelKind = 'brushes' | 'colors' | 'menu'

/** Grosor ↔ posición del deslizador (escala logarítmica: más precisión en lo fino). */
const toSlider = (v: number, [min, , max]: readonly number[]) => Math.round((1000 * Math.log(v / min)) / Math.log(max / min))
const fromSlider = (n: number, [min, , max]: readonly number[]) => min * Math.pow(max / min, n / 1000)

function StudioBody({ doc, paper, onPaper, onClose, onActivity }: Omit<DrawingStudioProps, 'open'>) {
  const reduced = useReducedMotion()
  useLockBodyScroll(true)
  const { settings, sizeOf, alphaOf, setBrush, setColor, setSize, setAlpha, remember } = useDrawSettings()
  const [tool, setToolState] = useState<Tool>('brush')
  const [panel, setPanel] = useState<PanelKind | null>(null)
  const [view, setView] = useState({ zoom: 1, fit: 300 })
  const [toast, setToast] = useState<{ text: string; key: number } | null>(null)
  const [loupe, setLoupe] = useState<{ x: number; y: number; color: string | null } | null>(null)
  const [ripple, setRipple] = useState<{ x: number; y: number; key: number } | null>(null)
  const [sizePreview, setSizePreview] = useState(false)
  const [tips, setTips] = useState(() => !local.get(STORAGE_KEYS.drawTips))
  const [confirmClear, setConfirmClear] = useState(false)
  useSyncExternalStore(doc.subscribe, doc.getVersion)

  const stageRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const paperRef = useRef<HTMLDivElement | null>(null)
  const engine = useRef<StudioEngine | null>(null)
  const prevTool = useRef<Tool>('brush')

  const brushId: BrushId = tool === 'eraser' ? 'eraser' : settings.brush
  const def = tool === 'eraser' ? ERASER : brushDef(settings.brush)
  const size = sizeOf(brushId)
  const opacity = tool === 'fill' ? 1 : alphaOf(brushId)
  const color = settings.color
  const paperBg = PAPER[paper].bg

  const say = useCallback((text: string) => setToast({ text, key: Date.now() }), [])
  const setTool = (t: Tool) => {
    if (t === 'picker' && tool !== 'picker') prevTool.current = tool
    setToolState(t)
  }

  // Callbacks del motor (siempre ven el estado más reciente).
  const onPickEnd = useEffectEvent((c: string | null) => {
    setLoupe(null)
    if (c) {
      setColor(c)
      remember(c)
    }
    if (tool === 'picker') setToolState(prevTool.current === 'picker' ? 'brush' : prevTool.current)
  })
  const onCommit = useEffectEvent((c: string | null) => {
    if (c) remember(c)
  })
  const onStroke = useEffectEvent(() => onActivity?.())

  useEffect(() => {
    const stage = stageRef.current
    const el = canvasRef.current
    const paperEl = paperRef.current
    if (!stage || !el || !paperEl) return
    const e = new StudioEngine(stage, el, paperEl, doc, {
      onView: (zoom, fit) => setView({ zoom, fit }),
      onStroke: () => onStroke(),
      onCommit: (op) => onCommit(op.t === 'f' || op.b !== 'eraser' ? op.c : null),
      onPick: (c, x, y) => setLoupe({ x, y, color: c }),
      onPickEnd: (c) => onPickEnd(c),
      onTapGesture: (kind, ok) => say(ok ? (kind === 'undo' ? 'Deshecho' : 'Rehecho') : kind === 'undo' ? 'Nada que deshacer' : 'Nada que rehacer'),
      onFill: (x, y) => setRipple({ x, y, key: Date.now() }),
    })
    engine.current = e
    return () => {
      e.destroy()
      engine.current = null
    }
  }, [doc, say])

  useEffect(() => {
    engine.current?.setTool({ tool, brush: brushId, color, size, opacity })
  }, [tool, brushId, color, size, opacity])

  useEffect(() => {
    engine.current?.setPaper(paperBg)
  }, [paperBg])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 1100)
    return () => window.clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (!sizePreview) return
    const t = window.setTimeout(() => setSizePreview(false), 650)
    return () => window.clearTimeout(t)
  }, [sizePreview, size])

  useEffect(() => {
    if (!confirmClear) return
    const t = window.setTimeout(() => setConfirmClear(false), 3000)
    return () => window.clearTimeout(t)
  }, [confirmClear])

  // Safari: que un pellizco fuera de la hoja tampoco haga zoom a la página.
  useEffect(() => {
    const block = (e: Event) => e.preventDefault()
    document.addEventListener('gesturestart', block)
    return () => document.removeEventListener('gesturestart', block)
  }, [])

  const undo = useCallback(() => doc.undo(), [doc])
  const redo = useCallback(() => doc.redo(), [doc])

  // Teclado (computador): Esc cierra solo el lienzo; Ctrl+Z / Ctrl+Shift+Z.
  const onEscape = useEffectEvent(() => {
    if (panel) setPanel(null)
    else onClose()
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onEscape()
        return
      }
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
          e.preventDefault()
          redo()
        }
        return
      }
      e.preventDefault()
      if (e.shiftKey) redo()
      else undo()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [undo, redo])

  const pickColor = (c: string) => {
    setColor(c)
    if (tool === 'eraser' || tool === 'picker') setToolState('brush')
  }

  const closeTips = () => {
    setTips(false)
    local.set(STORAGE_KEYS.drawTips, '1')
  }

  const clearAll = () => {
    if (!confirmClear) {
      setConfirmClear(true)
      return
    }
    doc.clear()
    setConfirmClear(false)
    setPanel(null)
    say('Se borró todo · toca con dos dedos para recuperarlo')
  }

  const BrushIcon = brushDef(settings.brush).icon
  const sizePx = size * view.fit // en pantalla (no cambia con el zoom)
  const showsSliders = tool === 'brush' || tool === 'eraser'

  return (
    <motion.div
      className={styles.studio}
      role="dialog"
      aria-modal="true"
      aria-label="Lienzo para dibujar"
      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.985 }}
      transition={{ duration: 0.3, ease: EASE_OUT }}
    >
      <header className={styles.top}>
        <button type="button" className={styles.done} onClick={onClose}>
          <Check aria-hidden strokeWidth={2.2} /> Listo
        </button>
        <button type="button" className={styles.zoom} onClick={() => engine.current?.fit()} aria-label={`Zoom ${Math.round(view.zoom * 100)} %. Toca para ver la hoja completa`}>
          <Scan aria-hidden strokeWidth={1.8} />
          {Math.round(view.zoom * 100)}%
        </button>
        <div className={styles.topActions}>
          <button type="button" className={styles.iconBtn} onClick={undo} disabled={!doc.canUndo} aria-label="Deshacer">
            <Undo2 aria-hidden strokeWidth={1.8} />
          </button>
          <button type="button" className={styles.iconBtn} onClick={redo} disabled={!doc.canRedo} aria-label="Rehacer">
            <Redo2 aria-hidden strokeWidth={1.8} />
          </button>
          <button type="button" className={styles.iconBtn} onClick={() => setPanel('menu')} aria-label="Más opciones">
            <Ellipsis aria-hidden strokeWidth={1.8} />
          </button>
        </div>
      </header>

      <div ref={stageRef} className={styles.stage}>
        <div ref={paperRef} className={styles.paper} />
        <canvas ref={canvasRef} className={cx(styles.canvas, tool === 'eraser' && styles.erasing)} aria-label="Hoja para dibujar" role="img" />

        {doc.size === 0 && !tips && <p className={styles.hint}>Dibuja aquí con el dedo ✍️</p>}

        <AnimatePresence>
          {toast && (
            <motion.p key={toast.key} className={styles.toast} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="status">
              {toast.text}
            </motion.p>
          )}
        </AnimatePresence>

        {loupe && (
          <span
            className={styles.loupe}
            style={{ left: loupe.x, top: loupe.y, '--new': loupe.color ?? color, '--old': color } as React.CSSProperties}
            aria-hidden
          />
        )}
        {ripple && <span key={ripple.key} className={styles.ripple} style={{ left: ripple.x, top: ripple.y, background: color }} aria-hidden />}
        {sizePreview && showsSliders && (
          <span
            className={styles.sizePreview}
            style={{
              width: Math.max(2, sizePx),
              height: Math.max(2, sizePx),
              background: tool === 'eraser' ? 'transparent' : color,
              opacity: tool === 'eraser' ? 1 : Math.max(0.25, opacity),
            }}
            aria-hidden
          />
        )}

        <AnimatePresence>{tips && <Tips onClose={closeTips} />}</AnimatePresence>
      </div>

      <footer className={styles.dock}>
        <div className={styles.dockInner}>
          {showsSliders ? (
            <div className={styles.sliders}>
              <label className={styles.slider}>
                <span className={styles.sizeDot} aria-hidden>
                  <i style={{ width: Math.min(26, Math.max(3, sizePx)), height: Math.min(26, Math.max(3, sizePx)), background: tool === 'eraser' ? 'transparent' : color }} />
                </span>
                <input
                  type="range"
                  min={0}
                  max={1000}
                  value={toSlider(size, def.size)}
                  onChange={(e) => {
                    setSize(brushId, fromSlider(Number(e.target.value), def.size))
                    setSizePreview(true)
                  }}
                  aria-label="Grosor"
                />
              </label>
              <label className={cx(styles.slider, !def.alpha && styles.sliderOff)}>
                <Droplet aria-hidden strokeWidth={1.8} className={styles.sliderIcon} />
                <input
                  type="range"
                  min={5}
                  max={100}
                  value={Math.round(opacity * 100)}
                  disabled={!def.alpha}
                  onChange={(e) => setAlpha(brushId, Number(e.target.value) / 100)}
                  aria-label="Opacidad"
                />
                <span className={styles.sliderValue}>{Math.round(opacity * 100)}%</span>
              </label>
            </div>
          ) : (
            <p className={styles.toolHint}>{tool === 'fill' ? 'Toca una zona cerrada para pintarla toda 🪣' : 'Toca el dibujo para tomar ese color'}</p>
          )}

          <div className={styles.recents} role="radiogroup" aria-label="Colores recientes">
            {settings.recents.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={c === color}
                aria-label={`Color ${c}`}
                className={cx(styles.recent, c === color && styles.recentOn, isLight(c) && styles.light)}
                style={{ background: c }}
                onClick={() => pickColor(c)}
              />
            ))}
          </div>

          <div className={styles.tools} role="toolbar" aria-label="Herramientas">
            <button
              type="button"
              className={cx(styles.tool, tool === 'brush' && styles.toolOn)}
              onClick={() => (tool === 'brush' ? setPanel('brushes') : setTool('brush'))}
              aria-label={`Pincel: ${brushDef(settings.brush).label}. Toca de nuevo para cambiarlo`}
            >
              <BrushIcon aria-hidden strokeWidth={1.8} />
              <span>{brushDef(settings.brush).label}</span>
              <ChevronUp aria-hidden className={styles.more} strokeWidth={2.4} />
            </button>
            <button type="button" className={cx(styles.tool, tool === 'eraser' && styles.toolOn)} onClick={() => setTool('eraser')} aria-pressed={tool === 'eraser'}>
              <ERASER.icon aria-hidden strokeWidth={1.8} />
              <span>Borrador</span>
            </button>
            <button type="button" className={cx(styles.tool, tool === 'fill' && styles.toolOn)} onClick={() => setTool('fill')} aria-pressed={tool === 'fill'}>
              <PaintBucket aria-hidden strokeWidth={1.8} />
              <span>Balde</span>
            </button>
            <button type="button" className={cx(styles.tool, tool === 'picker' && styles.toolOn)} onClick={() => setTool(tool === 'picker' ? prevTool.current : 'picker')} aria-pressed={tool === 'picker'}>
              <Pipette aria-hidden strokeWidth={1.8} />
              <span>Gotero</span>
            </button>
            <button type="button" className={cx(styles.colorBtn, isLight(color) && styles.light)} style={{ background: color }} onClick={() => setPanel('colors')} aria-label="Elegir color" />
          </div>
        </div>
      </footer>

      <AnimatePresence>
        {panel === 'brushes' && (
          <Panel key="brushes" title="Pinceles" onClose={() => setPanel(null)}>
            <BrushPanel
              brush={settings.brush}
              color={color}
              paper={paperBg}
              onBrush={(b) => {
                setBrush(b)
                setToolState('brush')
                setPanel(null)
              }}
            />
          </Panel>
        )}
        {panel === 'colors' && (
          <Panel key="colors" title="Colores" onClose={() => setPanel(null)}>
            <ColorPanel
              color={color}
              recents={settings.recents}
              onColor={pickColor}
              onPicker={() => {
                setTool('picker')
                setPanel(null)
              }}
            />
          </Panel>
        )}
        {panel === 'menu' && (
          <Panel key="menu" title="Opciones" onClose={() => setPanel(null)}>
            <MenuPanel
              paper={paper}
              onPaper={onPaper}
              onFit={() => {
                engine.current?.fit()
                setPanel(null)
              }}
              onTips={() => {
                setTips(true)
                setPanel(null)
              }}
              onClear={clearAll}
              confirmClear={confirmClear}
              canClear={doc.size > 0}
            />
          </Panel>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function DrawingStudio({ open, ...rest }: DrawingStudioProps) {
  return createPortal(<AnimatePresence>{open && <StudioBody key="studio" {...rest} />}</AnimatePresence>, document.body)
}
