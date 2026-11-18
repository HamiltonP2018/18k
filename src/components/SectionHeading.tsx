/**
 * Encabezado de sección:
 *   <SectionHeading eyebrow="Capítulo I" title="Nuestro tiempo" script="juntos" />
 * - eyebrow: etiqueta en versalitas doradas
 * - title: título en serif display (con degradado oro → rosa)
 * - script: palabra manuscrita que se superpone al título
 * - subtitle: bajada opcional
 */
import type { ReactNode } from 'react'
import { Reveal } from './Reveal'
import { Ornament } from './Ornament'
import { cx } from '../lib/cx'
import styles from './SectionHeading.module.css'

export interface SectionHeadingProps {
  eyebrow?: ReactNode
  title: ReactNode
  script?: ReactNode
  subtitle?: ReactNode
  align?: 'center' | 'left'
  /** Nivel del título (h2 por defecto). */
  level?: 'h1' | 'h2'
  ornament?: boolean
  className?: string
}

export function SectionHeading({
  eyebrow,
  title,
  script,
  subtitle,
  align = 'center',
  level = 'h2',
  ornament = true,
  className,
}: SectionHeadingProps) {
  return (
    <header className={cx(styles.heading, align === 'left' && styles.left, className)}>
      {eyebrow && (
        <Reveal as="p" className={cx('eyebrow', styles.eyebrow)} y={14} blur={false}>
          {eyebrow}
        </Reveal>
      )}
      <Reveal as={level} className={styles.title} delay={0.08}>
        <span className="text-gradient">{title}</span>
        {script && <span className={cx('script', styles.script)}>{script}</span>}
      </Reveal>
      {ornament && (
        <Reveal delay={0.18} y={0} scale={0.6} blur={false} className={styles.ornamentWrap}>
          <Ornament />
        </Reveal>
      )}
      {subtitle && (
        <Reveal as="p" className={styles.subtitle} delay={0.24} blur={false}>
          {subtitle}
        </Reveal>
      )}
    </header>
  )
}
