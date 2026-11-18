/**
 * Botón "volver" flotante (arriba a la izquierda).
 * Regresa en el historial si se llegó navegando; si no, va al inicio.
 */
import { ArrowLeft, X } from 'lucide-react'
import { useGoBack } from '../hooks/useGoBack'
import { cx } from '../lib/cx'
import styles from './BackButton.module.css'

export interface BackButtonProps {
  label?: string
  /** "close" muestra una X (para vistas a pantalla completa). */
  icon?: 'back' | 'close'
  className?: string
  onClick?: () => void
}

export function BackButton({ label = 'Volver', icon = 'back', className, onClick }: BackButtonProps) {
  const goBack = useGoBack()
  const Icon = icon === 'close' ? X : ArrowLeft
  return (
    <button type="button" className={cx(styles.btn, className)} onClick={onClick ?? goBack} aria-label={label}>
      <Icon className={styles.icon} aria-hidden strokeWidth={1.8} />
    </button>
  )
}
