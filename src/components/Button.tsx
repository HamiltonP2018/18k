/**
 * Botón de la casa.
 *   <Button onClick={…}>Leer la carta</Button>
 *   <Button to="/recuerdos" variant="outline" icon={<Images />}>Ver todo</Button>
 * Variantes:
 *  - primary: relleno oro → rosa (acción principal)
 *  - outline: borde rosa; al pasar el mouse se llena con el degradado (como el original)
 *  - ghost:   vidrio sutil
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router'
import { cx } from '../lib/cx'
import styles from './Button.module.css'

type Variant = 'primary' | 'outline' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface CommonProps {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  iconRight?: ReactNode
  children?: ReactNode
  className?: string
  fullWidth?: boolean
}

export type ButtonAsButtonProps = CommonProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'> & { to?: never }
export type ButtonAsLinkProps = CommonProps & {
  to: string
  state?: unknown
  onClick?: () => void
  'aria-label'?: string
}
export type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps

function Content({ icon, iconRight, children }: Pick<CommonProps, 'icon' | 'iconRight' | 'children'>) {
  return (
    <>
      {icon && <span className={styles.icon}>{icon}</span>}
      {children && <span className={styles.label}>{children}</span>}
      {iconRight && <span className={styles.icon}>{iconRight}</span>}
    </>
  )
}

const classesFor = ({ variant = 'outline', size = 'md', fullWidth, className }: CommonProps) =>
  cx(styles.btn, styles[variant], styles[size], fullWidth && styles.full, className)

export function Button(props: ButtonProps) {
  if (props.to !== undefined) {
    const { to, state, onClick, icon, iconRight, children } = props
    return (
      <Link to={to} state={state} className={classesFor(props)} onClick={onClick} aria-label={props['aria-label']}>
        <Content icon={icon} iconRight={iconRight}>
          {children}
        </Content>
      </Link>
    )
  }
  const { variant, size, icon, iconRight, children, className, fullWidth, type = 'button', ...rest } = props
  return (
    <button type={type} {...rest} className={classesFor({ variant, size, fullWidth, className })}>
      <Content icon={icon} iconRight={iconRight}>
        {children}
      </Content>
    </button>
  )
}
