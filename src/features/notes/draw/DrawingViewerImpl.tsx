import Lightbox from 'yet-another-react-lightbox'
import Captions from 'yet-another-react-lightbox/plugins/captions'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/captions.css'
import '../../../components/MediaLightbox.css'
import type { DrawingViewerProps } from './DrawingViewer'

export default function DrawingViewerImpl({ open, onClose, src, paper, caption, w, h }: DrawingViewerProps) {
  return (
    <Lightbox
      open={open}
      close={onClose}
      slides={[{ src, width: w, height: h, alt: caption ? `Dibujo: ${caption}` : 'Dibujo', title: caption || undefined }]}
      plugins={[Captions, Zoom]}
      render={{ buttonPrev: () => null, buttonNext: () => null }}
      carousel={{ finite: true, padding: '16px' }}
      animation={{ fade: 280 }}
      controller={{ closeOnBackdropClick: true, closeOnPullDown: true }}
      captions={{ showToggle: false, descriptionTextAlign: 'center' }}
      zoom={{ maxZoomPixelRatio: 4, scrollToZoom: true, doubleTapDelay: 260 }}
      styles={{ root: { '--yarl__nh_paper': paper } }}
      labels={{ Close: 'Cerrar', 'Zoom in': 'Acercar', 'Zoom out': 'Alejar', Lightbox: 'Dibujo en grande' }}
      className="nh-lightbox nh-drawing"
    />
  )
}
