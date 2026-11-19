/**
 * Miniatura del dibujo en el editor: tocarla abre el lienzo.
 */
import { useEffect, useRef, useSyncExternalStore } from 'react'
import { Brush } from 'lucide-react'
import { DOC } from './brushes'
import type { DrawingDoc } from './doc'
import { renderOps } from './render'
import styles from './DrawingThumb.module.css'

export function DrawingThumb({ doc, paper, onOpen, paused }: { doc: DrawingDoc; paper: string; onOpen: () => void; paused?: boolean }) {
  const version = useSyncExternalStore(doc.subscribe, doc.getVersion)
  const ref = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const c = ref.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx || paused) return
    const px = Math.round((c.clientWidth || 440) * Math.min(window.devicePixelRatio || 1, 2))
    c.width = c.height = px
    ctx.clearRect(0, 0, px, px)
    renderOps(ctx, doc.all, px / DOC)
  }, [doc, version, paused])

  const empty = !doc.hasInk
  return (
    <button type="button" className={styles.thumb} style={{ backgroundColor: paper }} onClick={onOpen} aria-label={empty ? 'Abrir el lienzo para dibujar' : 'Seguir dibujando'}>
      <canvas ref={ref} className={styles.canvas} aria-hidden />
      {empty ? (
        <span className={styles.empty}>Toca para dibujar ✍️</span>
      ) : (
        <span className={styles.cta}>
          <Brush aria-hidden strokeWidth={1.8} /> Seguir dibujando
        </span>
      )}
    </button>
  )
}
