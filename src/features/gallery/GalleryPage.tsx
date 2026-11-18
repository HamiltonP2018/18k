/**
 * Vista "Recuerdos" (#/recuerdos): todas las fotos, por álbumes.
 * - Filtros: Todas · Favoritas · cada álbum (queda en la URL: ?album=promesa).
 * - Mosaico tipo masonry que respeta la proporción de cada foto.
 * - Tocar una foto abre el visor (deslizar, zoom, leyenda y fecha).
 */
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { Heart } from 'lucide-react'
import { albums, picks, type AlbumId } from '../../data/photos'
import { Page } from '../../components/Page'
import { BackButton } from '../../components/BackButton'
import { Photo } from '../../components/Photo'
import { MediaLightbox } from '../../components/MediaLightbox'
import { getAlbum, getMany, photos, type MediaItem } from '../../lib/media'
import { cx } from '../../lib/cx'
import styles from './GalleryPage.module.css'

type Filter = 'todas' | 'favoritas' | AlbumId

interface Group {
  key: string
  title?: string
  subtitle?: string
  description?: string
  items: MediaItem[]
}

const isAlbum = (v: string | null): v is AlbumId => albums.some((a) => a.id === v)

function Tile({ item, onOpen }: { item: MediaItem; onOpen: () => void }) {
  return (
    <motion.button
      type="button"
      className={styles.tile}
      onClick={onOpen}
      aria-label={item.caption ? `Ver foto: ${item.caption}` : 'Ver foto'}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <Photo item={item} layout="intrinsic" sizes="(min-width: 1100px) 24vw, (min-width: 700px) 32vw, 48vw" />
      {item.caption && <span className={styles.caption}>{item.caption}</span>}
    </motion.button>
  )
}

export default function GalleryPage() {
  const [params, setParams] = useSearchParams()
  const raw = params.get('album')
  const filter: Filter = raw === 'favoritas' ? 'favoritas' : isAlbum(raw) ? raw : 'todas'
  const [open, setOpen] = useState<{ items: MediaItem[]; index: number } | null>(null)

  const favorites = useMemo(() => getMany(picks.favorites).filter((m) => m.type === 'photo'), [])
  const groups: Group[] = useMemo(() => {
    if (filter === 'favoritas') return [{ key: 'favoritas', items: favorites }]
    const list = filter === 'todas' ? albums : albums.filter((a) => a.id === filter)
    const out: Group[] = list.map((a) => ({
      key: a.id,
      title: a.title,
      subtitle: a.subtitle,
      description: a.description,
      items: getAlbum(a.id),
    }))
    if (filter === 'todas') {
      const rest = photos.filter((p) => !p.album)
      if (rest.length) out.push({ key: 'otros', title: 'Más recuerdos', items: rest })
    }
    return out.filter((g) => g.items.length > 0)
  }, [filter, favorites])

  const setFilter = (f: Filter) => {
    setParams(f === 'todas' ? {} : { album: f }, { replace: true })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const chips: { id: Filter; label: string; count: number }[] = [
    { id: 'todas', label: 'Todas', count: photos.length },
    { id: 'favoritas', label: 'Favoritas', count: favorites.length },
    ...albums.map((a) => ({ id: a.id as Filter, label: a.title, count: getAlbum(a.id).length })),
  ]

  return (
    <Page className={styles.page} label="Nuestros recuerdos">
      <BackButton />

      <header className={cx('container', styles.header)}>
        <p className="eyebrow">
          {photos.length} fotos · {albums.length} álbumes
        </p>
        <h1 className={styles.title}>
          <span className="text-gradient">Nuestros recuerdos</span>
        </h1>
        <p className={styles.lead}>Cada foto, un pedacito de lo que somos.</p>
      </header>

      <nav className={styles.chipsBar} aria-label="Álbumes">
        <div className={styles.chips}>
          {chips.map((c) => (
            <button
              key={c.id}
              type="button"
              className={cx(styles.chip, filter === c.id && styles.chipActive)}
              onClick={() => setFilter(c.id)}
              aria-pressed={filter === c.id}
            >
              {c.id === 'favoritas' && <Heart className={styles.chipHeart} aria-hidden />}
              {c.label}
              <span className={styles.chipCount}>{c.count}</span>
            </button>
          ))}
        </div>
      </nav>

      <AnimatePresence mode="wait">
        <motion.div
          key={filter}
          className="container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          {groups.map((g) => (
            <section key={g.key} className={styles.group} aria-label={g.title ?? 'Favoritas'}>
              {g.title && (
                <header className={styles.groupHeader}>
                  {g.subtitle && <p className="eyebrow">{g.subtitle}</p>}
                  <h2 className={styles.groupTitle}>{g.title}</h2>
                  {g.description && <p className={styles.groupDesc}>{g.description}</p>}
                  <p className={styles.groupCount}>{g.items.length} fotos</p>
                </header>
              )}
              <div className={styles.masonry}>
                {g.items.map((item, i) => (
                  <Tile key={item.id} item={item} onOpen={() => setOpen({ items: g.items, index: i })} />
                ))}
              </div>
            </section>
          ))}
        </motion.div>
      </AnimatePresence>

      <MediaLightbox items={open?.items ?? []} index={open?.index ?? -1} onClose={() => setOpen(null)} />
    </Page>
  )
}
