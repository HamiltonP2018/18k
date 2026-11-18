/**
 * Sobre ilustrado con sello de cera. Con `open` la solapa se abre y la carta
 * asoma (transiciones CSS). Se usa en el adelanto del inicio y en la vista Carta.
 */
import { HeartIcon } from '../../components/Ornament'
import { cx } from '../../lib/cx'
import styles from './Envelope.module.css'

export interface EnvelopeProps {
  open?: boolean
  /** Texto que asoma en la carta. */
  peek?: string
  className?: string
}

export function Envelope({ open = false, peek, className }: EnvelopeProps) {
  return (
    <div className={cx(styles.envelope, open && styles.open, className)} aria-hidden>
      <span className={styles.back} />
      <span className={styles.letter}>
        {peek && <span className={styles.peek}>{peek}</span>}
        <span className={styles.lines}>
          <i />
          <i />
          <i />
          <i />
        </span>
      </span>
      <span className={styles.pocket} />
      <span className={styles.flap} />
      <span className={styles.seal}>
        <HeartIcon className={styles.sealHeart} />
      </span>
    </div>
  )
}
