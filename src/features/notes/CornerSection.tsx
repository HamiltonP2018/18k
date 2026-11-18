/**
 * "Nuestro rincón" (final del inicio): adelanto en vivo de las últimas
 * notitas + invitación a instalar la app. Si las notitas no están
 * configuradas, queda solo la invitación a instalar.
 */
import { Link } from 'react-router'
import { MessageCircleHeart } from 'lucide-react'
import { SectionHeading } from '../../components/SectionHeading'
import { Button } from '../../components/Button'
import { Reveal } from '../../components/Reveal'
import { InstallCard } from '../../components/InstallCard'
import { useInstall } from '../../lib/pwa'
import { ROUTES, SECTIONS } from '../../lib/routes'
import { cx } from '../../lib/cx'
import { useNotes } from './NotesContext'
import { NoteCard } from './NoteCard'
import styles from './CornerSection.module.css'

export function CornerSection() {
  const { enabled, notes, me, unread } = useNotes()
  const { mode } = useInstall()
  if (!enabled && (mode === 'none' || mode === 'installed')) return null

  const latest = notes.filter((n) => !n.pending).slice(0, 3)

  return (
    <section id={SECTIONS.corner} className={cx('section', styles.section)}>
      <div className="container">
        {enabled ? (
          <SectionHeading
            eyebrow="Esto sigue"
            title="Nuestro rincón"
            script="de notitas"
            subtitle="Un lugar solo nuestro para dejarnos notitas y dibujitos. Lo que escribas aquí lo ve la otra persona al instante."
          />
        ) : (
          <SectionHeading eyebrow="Esto sigue" title="Llévame" script="contigo" subtitle="Guarda nuestra historia en tu celular, como una app." />
        )}

        {enabled && (
          <Reveal className={styles.preview} y={30}>
            {latest.length > 0 ? (
              <Link to={ROUTES.notes} className={styles.notes} aria-label="Ver todas las notitas">
                {latest.map((n) => (
                  <NoteCard key={n.id} note={n} me={me} compact />
                ))}
              </Link>
            ) : (
              <p className={styles.emptyText}>Aún no hay notitas… ¿dejas la primera?</p>
            )}
            <Button to={ROUTES.notes} variant="primary" size="lg" icon={<MessageCircleHeart aria-hidden />}>
              {unread > 0 ? `Tienes ${unread} ${unread === 1 ? 'notita nueva' : 'notitas nuevas'}` : 'Ir a nuestras notitas'}
            </Button>
          </Reveal>
        )}

        <Reveal className={styles.install} y={24} delay={0.1} blur={false}>
          <InstallCard />
        </Reveal>
      </div>
    </section>
  )
}
