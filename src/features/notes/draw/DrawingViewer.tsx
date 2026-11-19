/**
 * Ver un dibujo en grande, con zoom (pellizcar o doble toque).
 *   <DrawingViewer src={…} paper="#fbf3e6" caption="…" w={1280} h={1280} open onClose={…} />
 * El visor (yet-another-react-lightbox) se carga solo cuando se abre.
 */
import { lazy, Suspense } from 'react'

const Impl = lazy(() => import('./DrawingViewerImpl'))

export interface DrawingViewerProps {
  open: boolean
  onClose: () => void
  src: string
  /** Color del papel (el dibujo tiene fondo transparente). */
  paper: string
  caption?: string
  w: number
  h: number
}

export function DrawingViewer(props: DrawingViewerProps) {
  if (!props.open) return null
  return (
    <Suspense fallback={null}>
      <Impl {...props} />
    </Suspense>
  )
}
