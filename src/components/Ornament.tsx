/** Separador decorativo: línea — corazón — línea, en oro. */
import { cx } from '../lib/cx'
import styles from './Ornament.module.css'

export function Ornament({ className }: { className?: string }) {
  return (
    <span className={cx(styles.ornament, className)} aria-hidden>
      <span className={styles.line} />
      <HeartIcon className={styles.heart} />
      <span className={cx(styles.line, styles.flip)} />
    </span>
  )
}

/** Corazón relleno en SVG (hereda `currentColor`). */
export function HeartIcon({ className, title }: { className?: string; title?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <path
        fill="currentColor"
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
      />
    </svg>
  )
}
