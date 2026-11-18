/**
 * "Llévame en tu celular": invita a instalar la página como app.
 * - Android/Chrome: botón que abre el diálogo del sistema.
 * - iPhone/iPad: pasos de "Compartir → Agregar a inicio".
 * - Android abierto desde otra app (WhatsApp…): pasos para abrirla en Chrome.
 * En computador no se muestra.
 */
import { useState } from 'react'
import { Check, Download, EllipsisVertical, Share, SquarePlus, Smartphone } from 'lucide-react'
import { useInstall } from '../lib/pwa'
import { mediaUrl } from '../lib/media'
import { Button } from './Button'
import { Sheet } from './Sheet'
import { cx } from '../lib/cx'
import styles from './InstallCard.module.css'

export interface InstallCardProps {
  className?: string
  /** Texto de apoyo (por defecto habla de ícono, pantalla completa y avisos). */
  text?: string
  /** Mostrar "ya está instalada" en lugar de ocultarse. */
  showInstalled?: boolean
}

export function InstallCard({ className, text, showInstalled = false }: InstallCardProps) {
  const { mode, prompt, inApp } = useInstall()
  const [help, setHelp] = useState(false)

  if (mode === 'none') return null
  if (mode === 'installed') {
    return showInstalled ? (
      <p className={cx(styles.installed, className)}>
        <Check aria-hidden /> Ya la tienes instalada en este celular
      </p>
    ) : null
  }

  const onClick = () => {
    if (mode === 'prompt') void prompt()
    else setHelp(true)
  }

  return (
    <div className={cx(styles.card, className)}>
      <img className={styles.icon} src={mediaUrl('icons/icon-192.png')} alt="" width={56} height={56} />
      <div className={styles.copy}>
        <p className={styles.title}>Llévame en tu celular</p>
        <p className={styles.text}>
          {text ?? 'Instálala como una app: con su propio ícono, a pantalla completa y con avisos cuando te deje una notita.'}
        </p>
      </div>
      <Button variant="primary" size="sm" onClick={onClick} icon={mode === 'prompt' ? <Download aria-hidden /> : <Smartphone aria-hidden />}>
        {mode === 'prompt' ? 'Instalar' : 'Cómo instalarla'}
      </Button>

      <Sheet open={help} onClose={() => setHelp(false)} title="Instálala en tu celular">
        {mode === 'ios' ? (
          <ol className={styles.steps}>
            {inApp && (
              <li>
                <span className={styles.num}>0</span>
                <span>
                  Si la abriste desde otra app (Instagram, etc.), primero ábrela en <b>Safari</b>.
                </span>
              </li>
            )}
            <li>
              <span className={styles.num}>1</span>
              <span>
                Toca el botón <b>Compartir</b> <Share className={styles.inline} aria-label="(ícono de compartir)" /> en la barra de
                Safari.
              </span>
            </li>
            <li>
              <span className={styles.num}>2</span>
              <span>
                Desliza hacia abajo y elige <b>Agregar a inicio</b> <SquarePlus className={styles.inline} aria-hidden />.
              </span>
            </li>
            <li>
              <span className={styles.num}>3</span>
              <span>
                Toca <b>Agregar</b>. Ábrela desde el ícono del corazón ❤
              </span>
            </li>
          </ol>
        ) : (
          <ol className={styles.steps}>
            <li>
              <span className={styles.num}>1</span>
              <span>
                Si la abriste desde WhatsApp u otra app, toca <EllipsisVertical className={styles.inline} aria-label="(menú)" /> y elige{' '}
                <b>Abrir en Chrome</b>.
              </span>
            </li>
            <li>
              <span className={styles.num}>2</span>
              <span>
                En Chrome, toca el menú <EllipsisVertical className={styles.inline} aria-label="(menú)" /> arriba a la derecha.
              </span>
            </li>
            <li>
              <span className={styles.num}>3</span>
              <span>
                Elige <b>Instalar app</b> o <b>Agregar a la pantalla principal</b> y confirma.
              </span>
            </li>
          </ol>
        )}
        <p className={styles.note}>
          {mode === 'ios'
            ? 'En iPhone, los avisos de notitas nuevas solo funcionan con la app instalada.'
            : 'Así se abre como una app, sin barras del navegador.'}
        </p>
      </Sheet>
    </div>
  )
}
