/**
 * Hoja modal: sube desde abajo en el celular y queda centrada en pantallas
 * grandes. Se cierra con la X, tocando fuera o con Esc.
 *   <Sheet open={open} onClose={…} title="Instalar">…</Sheet>
 * variant="paper": tarjeta de papel (cartas).
 */
import { useEffect, useId, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { X } from 'lucide-react'
import { useLockBodyScroll } from '../hooks/useLockBodyScroll'
import { EASE_OUT } from '../lib/motion'
import { cx } from '../lib/cx'
import styles from './Sheet.module.css'

export interface SheetProps {
  open: boolean
  onClose: () => void
  /** Título visible (o solo accesible con `hideTitle`). */
  title: string
  hideTitle?: boolean
  variant?: 'glass' | 'paper'
  className?: string
  children: ReactNode
}

function SheetBody({ onClose, title, hideTitle, variant = 'glass', className, children }: Omit<SheetProps, 'open'>) {
  const reduced = useReducedMotion()
  const id = useId()
  useLockBodyScroll(true)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        className={cx(styles.panel, variant === 'paper' && styles.paper, className)}
        onClick={(e) => e.stopPropagation()}
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 60, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduced ? { opacity: 0 } : { opacity: 0, y: 50, scale: 0.98 }}
        transition={{ duration: 0.45, ease: EASE_OUT }}
      >
        <span className={styles.grabber} aria-hidden />
        <button type="button" className={styles.close} onClick={onClose} aria-label="Cerrar">
          <X aria-hidden strokeWidth={1.8} />
        </button>
        <h2 id={id} className={cx(styles.title, hideTitle && 'sr-only')}>
          {title}
        </h2>
        {children}
      </motion.div>
    </motion.div>
  )
}

export function Sheet({ open, ...rest }: SheetProps) {
  return createPortal(<AnimatePresence>{open && <SheetBody key="sheet" {...rest} />}</AnimatePresence>, document.body)
}
