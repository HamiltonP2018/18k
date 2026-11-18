import { useEffect } from 'react'

let locks = 0

/** Bloquea el scroll de la página mientras `active` sea true (admite anidación). */
export function useLockBodyScroll(active = true): void {
  useEffect(() => {
    if (!active) return
    locks++
    document.documentElement.classList.add('is-scroll-locked')
    return () => {
      locks = Math.max(0, locks - 1)
      if (locks === 0) document.documentElement.classList.remove('is-scroll-locked')
    }
  }, [active])
}
