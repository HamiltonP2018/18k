import { useMemo } from 'react'
import Lightbox, { type Slide } from 'yet-another-react-lightbox'
import Captions from 'yet-another-react-lightbox/plugins/captions'
import Counter from 'yet-another-react-lightbox/plugins/counter'
import Video from 'yet-another-react-lightbox/plugins/video'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/captions.css'
import 'yet-another-react-lightbox/plugins/counter.css'
import { imageUrl, mediaUrl, videoUrl, type MediaItem } from '../lib/media'
import { formatLongDate } from '../lib/time'
import type { MediaLightboxProps } from './MediaLightbox'
import './MediaLightbox.css'

function describe(item: MediaItem): string | undefined {
  if (!item.date) return undefined
  return formatLongDate(item.date)
}

function toSlide(item: MediaItem): Slide {
  if (item.type === 'video' && item.video) {
    return {
      type: 'video',
      width: item.width,
      height: item.height,
      poster: imageUrl(item, 1280),
      autoPlay: true,
      controls: true,
      playsInline: true,
      preload: 'metadata',
      sources: [{ src: videoUrl(item) ?? '', type: 'video/mp4' }],
      title: item.caption,
      description: describe(item),
    }
  }
  return {
    src: imageUrl(item, 1920),
    width: item.width,
    height: item.height,
    alt: item.alt,
    srcSet: item.variants.map((v) => ({ src: mediaUrl(v.file), width: v.w, height: v.h })),
    title: item.caption || undefined,
    description: describe(item),
  }
}

export default function MediaLightboxImpl({ items, index, onClose, onIndexChange }: MediaLightboxProps) {
  const slides = useMemo(() => items.map(toSlide), [items])

  return (
    <Lightbox
      open={index >= 0}
      index={Math.max(0, index)}
      close={onClose}
      slides={slides}
      plugins={[Captions, Counter, Zoom, Video]}
      on={{ view: ({ index: i }) => onIndexChange?.(i) }}
      carousel={{ finite: false, preload: 2, padding: '16px', spacing: '12%' }}
      animation={{ fade: 320, swipe: 380 }}
      controller={{ closeOnBackdropClick: true, closeOnPullDown: true }}
      captions={{ descriptionTextAlign: 'center', showToggle: false, descriptionMaxLines: 2 }}
      counter={{ container: { style: { top: 'unset', bottom: 0, left: '50%', transform: 'translateX(-50%)' } } }}
      zoom={{ maxZoomPixelRatio: 2.5, scrollToZoom: true }}
      labels={{
        Previous: 'Anterior',
        Next: 'Siguiente',
        Close: 'Cerrar',
        'Zoom in': 'Acercar',
        'Zoom out': 'Alejar',
        Lightbox: 'Visor de recuerdos',
        Carousel: 'Recuerdos',
        Slide: 'Recuerdo',
      }}
      className="nh-lightbox"
    />
  )
}
