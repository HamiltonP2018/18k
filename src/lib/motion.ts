/**
 * Lenguaje de movimiento compartido (motion/react).
 * Suave, cinematográfico, sin rebotes exagerados.
 */
import type { Transition, Variants } from 'motion/react'

export const EASE_OUT = [0.22, 1, 0.36, 1] as const
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const

export const transitionSlow: Transition = { duration: 1.1, ease: EASE_OUT }
export const transitionBase: Transition = { duration: 0.8, ease: EASE_OUT }
export const transitionFast: Transition = { duration: 0.45, ease: EASE_OUT }
export const springSoft: Transition = { type: 'spring', stiffness: 120, damping: 20, mass: 0.9 }

/** Aparece subiendo y desenfocándose (para títulos y bloques). */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28, filter: 'blur(8px)' },
  // `filter: none` al final: un filtro residual rompería los position: fixed internos.
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: transitionBase, transitionEnd: { filter: 'none' } },
}

/** Igual que fadeUp pero sin blur (más liviano para listas largas). */
export const fadeUpLight: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: transitionBase },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: transitionBase },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1, transition: transitionBase },
}

/** Contenedor que escalona la aparición de sus hijos. */
export function stagger(staggerChildren = 0.08, delayChildren = 0): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren, delayChildren } },
  }
}

/**
 * Transición entre páginas. Solo opacidad a propósito: transform/filter en el
 * contenedor de la página romperían los elementos `position: fixed` internos
 * (botón volver, visores a pantalla completa).
 */
export const pageVariants: Variants = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: { duration: 0.6, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: 0.35, ease: EASE_IN_OUT } },
}

/** Props estándar para revelar al hacer scroll. */
export const inViewProps = {
  initial: 'hidden',
  whileInView: 'show',
  viewport: { once: true, amount: 0.25 },
} as const
