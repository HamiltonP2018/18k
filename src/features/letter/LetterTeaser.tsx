/**
 * Adelanto de la carta en el inicio: un sobre sellado que invita a abrirla
 * en la vista "Carta".
 */
import { useState } from 'react'
import { Link } from 'react-router'
import { MailOpen } from 'lucide-react'
import { letter } from '../../data/letter'
import { SectionHeading } from '../../components/SectionHeading'
import { Button } from '../../components/Button'
import { Reveal } from '../../components/Reveal'
import { ROUTES, SECTIONS } from '../../lib/routes'
import { cx } from '../../lib/cx'
import { Envelope } from './Envelope'
import styles from './LetterTeaser.module.css'

const firstLine = letter.body.split(/(?<=[.!?])\s/)[0]

export function LetterTeaser() {
  const [hover, setHover] = useState(false)
  return (
    <section id={SECTIONS.letter} className={cx('section', styles.section)}>
      <div className="container">
        <SectionHeading eyebrow="Una carta para ti" title="Tengo algo" script="que decirte" />

        <Reveal className={styles.body} y={40} amount={0.3}>
          <Link
            to={ROUTES.letter}
            className={styles.envelopeLink}
            aria-label="Abrir la carta"
            onPointerEnter={() => setHover(true)}
            onPointerLeave={() => setHover(false)}
          >
            <Envelope open={hover} peek="Para ti" className={styles.envelope} />
          </Link>

          <blockquote className={styles.excerpt}>
            <p>“{firstLine}”</p>
          </blockquote>

          <Button to={ROUTES.letter} variant="primary" size="lg" icon={<MailOpen aria-hidden />}>
            Abrir la carta
          </Button>
        </Reveal>
      </div>
    </section>
  )
}
