/**
 * Rutas (HashRouter: las URLs quedan como …/#/recuerdos) y secciones del
 * inicio (ids de elementos a los que se hace scroll).
 */
export const ROUTES = {
  home: '/',
  gallery: '/recuerdos',
  moments: '/momentos',
  letter: '/carta',
  notes: '/notas',
} as const

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES]

/** ids de las secciones de la página de inicio, en orden. */
export const SECTIONS = {
  hero: 'inicio',
  counter: 'tiempo',
  timeline: 'historia',
  carousel: 'recuerdos',
  moments: 'momentos',
  reasons: 'razones',
  letter: 'carta',
  openWhen: 'abrela',
  promises: 'promesas',
  finale: 'final',
  corner: 'rincon',
} as const

export type SectionId = (typeof SECTIONS)[keyof typeof SECTIONS]

/** Estado que se pasa al navegar a "/" para hacer scroll a una sección. */
export interface HomeNavState {
  scrollTo?: SectionId
}

/** Hace scroll suave hasta una sección del inicio. Devuelve false si no existe. */
export function scrollToSection(id: SectionId, behavior: ScrollBehavior = 'smooth'): boolean {
  const el = document.getElementById(id)
  if (!el) return false
  el.scrollIntoView({ behavior, block: 'start' })
  return true
}
