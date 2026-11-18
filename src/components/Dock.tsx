/**
 * Navegación flotante inferior (estilo "dock" de vidrio).
 * - En el inicio resalta la sección visible y hace scroll suave.
 * - Se esconde al bajar y reaparece al subir para no tapar el contenido.
 */
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { BookHeart, Clapperboard, House, Images, Mail, type LucideIcon } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { ROUTES, SECTIONS, scrollToSection, type HomeNavState, type SectionId } from '../lib/routes'
import { cx } from '../lib/cx'
import styles from './Dock.module.css'

type DockKey = 'inicio' | 'historia' | 'recuerdos' | 'momentos' | 'carta'

interface DockItem {
  key: DockKey
  label: string
  Icon: LucideIcon
  /** Ruta propia (si la tiene) o sección del inicio. */
  route?: string
  section?: SectionId
}

const ITEMS: DockItem[] = [
  { key: 'inicio', label: 'Inicio', Icon: House, section: SECTIONS.hero },
  { key: 'historia', label: 'Historia', Icon: BookHeart, section: SECTIONS.timeline },
  { key: 'recuerdos', label: 'Recuerdos', Icon: Images, route: ROUTES.gallery },
  { key: 'momentos', label: 'Momentos', Icon: Clapperboard, route: ROUTES.moments },
  { key: 'carta', label: 'Carta', Icon: Mail, route: ROUTES.letter },
]

/** Qué botón se ilumina según la sección visible del inicio. */
const SECTION_TO_KEY: Record<SectionId, DockKey> = {
  inicio: 'inicio',
  tiempo: 'inicio',
  historia: 'historia',
  razones: 'historia',
  recuerdos: 'recuerdos',
  momentos: 'momentos',
  carta: 'carta',
  promesas: 'carta',
  final: 'carta',
}

function useActiveSection(enabled: boolean): SectionId {
  const [active, setActive] = useState<SectionId>(SECTIONS.hero)
  useEffect(() => {
    if (!enabled) return
    const ids = Object.values(SECTIONS)
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id as SectionId)
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )
    // Las secciones pueden montarse un poco después (carga diferida).
    const attach = () => ids.forEach((id) => {
      const el = document.getElementById(id)
      if (el) io.observe(el)
    })
    attach()
    const t = window.setTimeout(attach, 1200)
    return () => {
      window.clearTimeout(t)
      io.disconnect()
    }
  }, [enabled])
  return active
}

function useHideOnScroll(): boolean {
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    let lastY = window.scrollY
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const y = window.scrollY
        const nearBottom = window.innerHeight + y >= document.documentElement.scrollHeight - 80
        if (Math.abs(y - lastY) > 6) {
          setHidden(y > lastY && y > 160 && !nearBottom)
          lastY = y
        }
        ticking = false
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return hidden
}

export function Dock() {
  const { immersive } = useApp()
  const location = useLocation()
  const navigate = useNavigate()
  const onHome = location.pathname === ROUTES.home
  const activeSection = useActiveSection(onHome)
  const hiddenByScroll = useHideOnScroll()

  const activeKey: DockKey | null = onHome
    ? SECTION_TO_KEY[activeSection]
    : (ITEMS.find((i) => i.route === location.pathname)?.key ?? null)

  const go = (item: DockItem) => {
    if (item.route) {
      if (location.pathname !== item.route) navigate(item.route)
      return
    }
    if (!item.section) return
    if (onHome) {
      if (item.section === SECTIONS.hero) window.scrollTo({ top: 0, behavior: 'smooth' })
      else scrollToSection(item.section)
    } else {
      const state: HomeNavState = item.section === SECTIONS.hero ? {} : { scrollTo: item.section }
      navigate(ROUTES.home, { state })
    }
  }

  const visible = !immersive

  return (
    <AnimatePresence>
      {visible && (
        <motion.nav
          key="dock"
          className={styles.wrap}
          aria-label="Navegación principal"
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: hiddenByScroll ? 120 : 0, opacity: hiddenByScroll ? 0 : 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        >
          <ul className={styles.dock}>
            {ITEMS.map((item) => {
              const isActive = item.key === activeKey
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    className={cx(styles.item, isActive && styles.active)}
                    onClick={() => go(item)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="dock-pill"
                        className={styles.pill}
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      />
                    )}
                    <item.Icon className={styles.icon} aria-hidden strokeWidth={1.6} />
                    <span className={styles.label}>{item.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </motion.nav>
      )}
    </AnimatePresence>
  )
}
