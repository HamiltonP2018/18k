/**
 * <Reveal> — aparece suavemente cuando entra en pantalla.
 *   <Reveal as="h2" delay={0.1}>Título</Reveal>
 * Con "reducir movimiento" solo hace un fundido.
 */
import { motion, useReducedMotion } from 'motion/react'
import type { CSSProperties, ReactNode } from 'react'
import { EASE_OUT } from '../lib/motion'

type Tag = 'div' | 'section' | 'header' | 'p' | 'span' | 'h1' | 'h2' | 'h3' | 'h4' | 'li' | 'ul' | 'figure' | 'article'

export interface RevealProps {
  as?: Tag
  children?: ReactNode
  className?: string
  style?: CSSProperties
  /** Retraso en segundos. */
  delay?: number
  /** Duración en segundos. */
  duration?: number
  /** Desplazamiento vertical inicial en px. */
  y?: number
  /** Desplazamiento horizontal inicial en px. */
  x?: number
  /** Escala inicial (1 = sin escala). */
  scale?: number
  /** Desenfoque inicial (desactívalo en listas largas). */
  blur?: boolean
  /** Fracción visible necesaria para disparar (0–1). */
  amount?: number
  /** Repetir cada vez que entra en pantalla. */
  repeat?: boolean
  id?: string
}

export function Reveal({
  as = 'div',
  children,
  className,
  style,
  delay = 0,
  duration = 0.9,
  y = 28,
  x = 0,
  scale = 1,
  blur = true,
  amount = 0.25,
  repeat = false,
  id,
}: RevealProps) {
  const reduced = useReducedMotion()
  const MotionTag = motion[as]
  const hidden = reduced
    ? { opacity: 0 }
    : { opacity: 0, y, x, scale, ...(blur ? { filter: 'blur(8px)' } : null) }
  // `transitionEnd` limpia el filtro: uno residual (aunque sea blur(0)) convierte
  // al elemento en contenedor de los position: fixed que tenga dentro.
  const shown = reduced
    ? { opacity: 1 }
    : {
        opacity: 1,
        y: 0,
        x: 0,
        scale: 1,
        ...(blur ? { filter: 'blur(0px)', transitionEnd: { filter: 'none' } } : null),
      }

  return (
    <MotionTag
      id={id}
      className={className}
      style={style}
      initial={hidden}
      whileInView={shown}
      viewport={{ once: !repeat, amount }}
      transition={{ duration: reduced ? 0.4 : duration, delay, ease: EASE_OUT }}
    >
      {children}
    </MotionTag>
  )
}
