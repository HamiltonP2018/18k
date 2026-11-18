import { useSyncExternalStore } from 'react'

/** true mientras la media query se cumpla: useMediaQuery('(min-width: 768px)'). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Orientación vertical (celulares). */
export function useIsPortrait(): boolean {
  return useMediaQuery('(orientation: portrait)')
}

/** Pantallas táctiles sin hover (celulares/tablets). */
export function useIsTouch(): boolean {
  return useMediaQuery('(hover: none) and (pointer: coarse)')
}
