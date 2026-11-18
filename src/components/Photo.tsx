/**
 * <Photo id="orig-01" />
 * ---------------------------------------------------------------------------
 * Imagen responsiva del manifiesto con:
 *  - srcset (640/1280/1920) + `sizes`
 *  - placeholder borroso (LQIP) y color dominante mientras carga
 *  - fundido suave al cargar
 *  - recorte inteligente con el punto focal de la curaduría
 * Para videos muestra el póster.
 *
 * Layouts:
 *  - "fill" (por defecto): ocupa el 100% del contenedor (el padre define tamaño).
 *  - "intrinsic": mantiene la proporción original de la foto (ideal para mosaicos).
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { getMedia, imageUrl, objectPosition, srcSet, type MediaItem } from '../lib/media'
import { cx } from '../lib/cx'
import styles from './Photo.module.css'

export interface PhotoProps {
  /** id del manifiesto, o el elemento ya resuelto. */
  id?: string
  item?: MediaItem
  /** Atributo `sizes` (por defecto 100vw). */
  sizes?: string
  /** Sobrescribe el texto alternativo. */
  alt?: string
  layout?: 'fill' | 'intrinsic'
  fit?: 'cover' | 'contain'
  /** Sobrescribe el punto focal [x%, y%]. */
  focal?: [number, number]
  /** Carga inmediata con prioridad alta (portada / primera pantalla). */
  priority?: boolean
  className?: string
  imgClassName?: string
  style?: CSSProperties
  onLoad?: () => void
}

export function Photo({
  id,
  item: itemProp,
  sizes = '100vw',
  alt,
  layout = 'fill',
  fit = 'cover',
  focal,
  priority = false,
  className,
  imgClassName,
  style,
  onLoad,
}: PhotoProps) {
  const item = itemProp ?? (id ? getMedia(id) : undefined)
  const imgRef = useRef<HTMLImageElement>(null)
  const [loaded, setLoaded] = useState(false)

  // Si la imagen ya estaba en caché, `onLoad` pudo dispararse antes de hidratar.
  useEffect(() => {
    const img = imgRef.current
    if (img?.complete && img.naturalWidth > 0) setLoaded(true)
  }, [item?.id])

  if (!item) return <div className={cx(styles.frame, styles.missing, className)} style={style} aria-hidden />

  const position = focal ? `${focal[0]}% ${focal[1]}%` : objectPosition(item)
  const frameStyle: CSSProperties = {
    backgroundColor: item.color,
    ...(layout === 'intrinsic' ? { aspectRatio: `${item.width} / ${item.height}` } : null),
    ...style,
  }
  const imgStyle: CSSProperties = { objectFit: fit, objectPosition: position }

  return (
    <div className={cx(styles.frame, layout === 'fill' && styles.fill, className)} style={frameStyle}>
      <img className={styles.lqip} src={item.lqip} alt="" aria-hidden style={imgStyle} draggable={false} />
      <img
        ref={imgRef}
        className={cx(styles.img, loaded && styles.loaded, imgClassName)}
        src={imageUrl(item, 1280)}
        srcSet={srcSet(item)}
        sizes={sizes}
        alt={alt ?? item.alt}
        width={item.width}
        height={item.height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        draggable={false}
        style={imgStyle}
        onLoad={() => {
          setLoaded(true)
          onLoad?.()
        }}
      />
    </div>
  )
}
