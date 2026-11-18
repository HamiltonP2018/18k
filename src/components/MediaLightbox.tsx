/**
 * Visor a pantalla completa para fotos y videos (carga diferida).
 *
 *   const [index, setIndex] = useState(-1)
 *   <MediaLightbox items={items} index={index} onClose={() => setIndex(-1)} />
 *
 * - `index < 0` = cerrado.
 * - Deslizar / flechas / teclado, zoom con pellizco o doble toque, leyenda y fecha.
 * - Los videos se reproducen ahí mismo (la música baja sola mientras suenan).
 */
import { lazy, Suspense } from 'react'
import type { MediaItem } from '../lib/media'

const LightboxImpl = lazy(() => import('./MediaLightboxImpl'))

export interface MediaLightboxProps {
  items: MediaItem[]
  /** Índice abierto (-1 = cerrado). */
  index: number
  onClose: () => void
  /** Se llama cuando el usuario navega dentro del visor. */
  onIndexChange?: (index: number) => void
}

export function MediaLightbox(props: MediaLightboxProps) {
  if (props.index < 0) return null
  return (
    <Suspense fallback={null}>
      <LightboxImpl {...props} />
    </Suspense>
  )
}
