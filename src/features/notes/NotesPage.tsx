/**
 * Vista "Notitas" (#/notas): el muro compartido.
 * - Arriba: quién está en línea y "está escribiendo…/dibujando…".
 * - Botones para escribir o dibujar (abren el editor).
 * - Muro de notitas en columnas, la más nueva primero.
 * - Abajo: avisos, instalar la app y quién escribe en este dispositivo.
 */
import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { Brush, PenLine, WifiOff } from 'lucide-react'
import { Page } from '../../components/Page'
import { BackButton } from '../../components/BackButton'
import { Button } from '../../components/Button'
import { Ornament } from '../../components/Ornament'
import { InstallCard } from '../../components/InstallCard'
import { ROUTES } from '../../lib/routes'
import { cx } from '../../lib/cx'
import { useNotes, type LocalNote } from './NotesContext'
import { NoteCard } from './NoteCard'
import { Composer, type ComposerTab } from './Composer'
import { PushToggle } from './PushToggle'
import { authorInSentence, authorLabel } from './config'
import { otherAuthor } from './protocol'
import styles from './NotesPage.module.css'

function useColumns(): number {
  const query = '(min-width: 900px)'
  const [wide, setWide] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setWide(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return wide ? 3 : 2
}

/** Reparte en columnas equilibrando una altura estimada (masonry simple). */
function toColumns(notes: LocalNote[], n: number): LocalNote[][] {
  const cols: LocalNote[][] = Array.from({ length: n }, () => [])
  const heights = new Array<number>(n).fill(0)
  for (const note of notes) {
    const h = note.kind === 'drawing' ? 1.25 + (note.text ? 0.2 : 0) : 0.45 + Math.ceil(note.text.length / 22) * 0.16
    const i = heights.indexOf(Math.min(...heights))
    cols[i].push(note)
    heights[i] += h
  }
  return cols
}

function Presence() {
  const { status, presence, otherActivity, me } = useNotes()
  const other = otherAuthor(me)
  const name = authorLabel(other)

  if (status === 'offline')
    return (
      <p className={cx(styles.presence, styles.off)} role="status">
        <WifiOff aria-hidden /> Sin conexión · reintentando…
      </p>
    )
  if (status === 'connecting')
    return (
      <p className={cx(styles.presence, styles.off)} role="status">
        Conectando…
      </p>
    )
  return (
    <p className={cx(styles.presence, presence[other] && styles.here)} role="status" aria-live="polite">
      <span className={styles.pulse} aria-hidden />
      {otherActivity ? (
        <>
          {name} está {otherActivity === 'drawing' ? 'dibujando' : 'escribiendo'}
          <span className={styles.dots} aria-hidden>
            <i />
            <i />
            <i />
          </span>
        </>
      ) : presence[other] ? (
        `${name} está aquí ahora`
      ) : (
        `${name} no está en línea`
      )}
    </p>
  )
}

export default function NotesPage() {
  const { enabled, notes, me, setMe, heart, remove, markSeen, status } = useNotes()
  const [composer, setComposer] = useState<{ open: boolean; tab: ComposerTab }>({ open: false, tab: 'text' })
  const columns = toColumns(notes, useColumns())
  const other = otherAuthor(me)
  const hasNotes = notes.length > 0
  const latestOther = useMemo(() => notes.find((n) => n.author !== me)?.createdAt ?? 0, [notes, me])

  // Mientras se mira esta vista, todo lo de la otra persona cuenta como visto.
  useEffect(() => {
    if (document.visibilityState === 'visible') markSeen()
    const onVis = () => document.visibilityState === 'visible' && markSeen()
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [latestOther, markSeen])

  if (!enabled) return <Navigate to={ROUTES.home} replace />

  const open = (tab: ComposerTab) => setComposer({ open: true, tab })

  return (
    <Page className={styles.page} label="Nuestras notitas">
      <BackButton />

      <header className={styles.header}>
        <motion.p className="eyebrow" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          Nuestro rincón
        </motion.p>
        <motion.h1 className={styles.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.8 }}>
          <span className="text-gradient">Notitas</span>
          <span className={cx('script', styles.script)}>para ti</span>
        </motion.h1>
        <Presence />
      </header>

      <div className={styles.actions}>
        <Button variant="primary" size="lg" icon={<PenLine aria-hidden />} onClick={() => open('text')} disabled={status === 'connecting' && !hasNotes}>
          Escribir
        </Button>
        <Button variant="outline" size="lg" icon={<Brush aria-hidden />} onClick={() => open('draw')} disabled={status === 'connecting' && !hasNotes}>
          Dibujar
        </Button>
      </div>

      {hasNotes ? (
        <div className={styles.board} style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
          {columns.map((col, i) => (
            <div key={i} className={styles.column}>
              <AnimatePresence initial={false} mode="popLayout">
                {col.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    me={me}
                    onHeart={note.author !== me ? (on) => heart(note.id, on) : undefined}
                    onDelete={note.author === me ? () => remove(note.id) : undefined}
                  />
                ))}
              </AnimatePresence>
            </div>
          ))}
        </div>
      ) : (
        status === 'online' && (
          <div className={styles.empty}>
            <Ornament />
            <p className={styles.emptyTitle}>Todavía no hay notitas</p>
            <p className={styles.emptyText}>Deja la primera: un “te extraño”, un chiste, un dibujito… lo que quieras.</p>
          </div>
        )
      )}

      <section className={styles.settings} aria-label="Ajustes">
        <PushToggle />
        <InstallCard showInstalled text="Con la app instalada te llegan los avisos de notitas nuevas y la abres con un toque." />
        <p className={styles.identity}>
          En este celular escribe <b>{authorLabel(me)}</b>.{' '}
          <button
            type="button"
            className={styles.switch}
            onClick={() => {
              if (window.confirm(`¿Cambiar a escribir como ${authorInSentence(other)} en este celular?`)) setMe(other)
            }}
          >
            ¿No eres tú?
          </button>
        </p>
      </section>

      <Composer open={composer.open} tab={composer.tab} onTab={(tab) => setComposer((c) => ({ ...c, tab }))} onClose={() => setComposer((c) => ({ ...c, open: false }))} />
    </Page>
  )
}
