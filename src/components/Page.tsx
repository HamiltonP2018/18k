/**
 * <Page> envuelve cada ruta:
 *  - transición de entrada/salida
 *  - restauración del scroll (al volver atrás regresa donde estabas)
 *  - scroll a una sección si se navegó con state.scrollTo
 */
import { useEffect, useLayoutEffect, type ReactNode } from 'react'
import { useLocation, useNavigationType } from 'react-router'
import { motion } from 'motion/react'
import { pageVariants } from '../lib/motion'
import { scrollToSection, type HomeNavState } from '../lib/routes'

const positions = new Map<string, number>()

export interface PageProps {
  children: ReactNode
  className?: string
  /** Etiqueta accesible de la región principal. */
  label?: string
}

export function Page({ children, className, label }: PageProps) {
  const location = useLocation()
  const navType = useNavigationType()

  useLayoutEffect(() => {
    const state = location.state as HomeNavState | null
    if (state?.scrollTo) {
      const target = state.scrollTo
      window.scrollTo(0, 0)
      // Espera un frame a que la página esté pintada.
      requestAnimationFrame(() => requestAnimationFrame(() => scrollToSection(target)))
      return
    }
    const saved = positions.get(location.key)
    window.scrollTo(0, navType === 'POP' && saved != null ? saved : 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key])

  useEffect(() => {
    const onScroll = () => positions.set(location.key, window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [location.key])

  return (
    <motion.main
      className={className}
      aria-label={label}
      variants={pageVariants}
      initial="initial"
      animate="enter"
      exit="exit"
    >
      {children}
    </motion.main>
  )
}
