/**
 * 11:11 — pide un deseo.
 * Si la página está abierta a las 11:11 (de la mañana o de la noche) aparece
 * un aviso con una estrella fugaz; al pedir el deseo llueven corazones.
 * Para verlo en cualquier momento: agrega `?deseo` a la URL (antes del #).
 */
import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Sparkles, X } from 'lucide-react'
import { burstParticles, heartRain } from '../../lib/confetti'
import { useNow } from '../../lib/time'
import styles from './WishMoment.module.css'

const forced = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('deseo')

export function WishMoment() {
  const now = useNow(5000)
  const h = now.getHours()
  const isWishTime = (h === 11 || h === 23) && now.getMinutes() === 11
  const slot = `${now.toDateString()}-${h}`
  const [dismissed, setDismissed] = useState<string | null>(null)
  const [wished, setWished] = useState(false)

  const visible = (isWishTime || forced) && dismissed !== slot

  const wish = () => {
    setWished(true)
    heartRain(4500)
    burstParticles()
    window.setTimeout(() => {
      setDismissed(slot)
      setWished(false)
    }, 3200)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.aside
          key="wish"
          className={styles.toast}
          role="status"
          initial={{ opacity: 0, y: -30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 220, damping: 24 }}
        >
          <span className={styles.star} aria-hidden />
          <button type="button" className={styles.close} onClick={() => setDismissed(slot)} aria-label="Cerrar">
            <X aria-hidden strokeWidth={1.6} />
          </button>
          <p className={styles.time}>11:11</p>
          {wished ? (
            <p className={styles.text}>Deseo enviado. Ojalá se cumpla… aunque el mío ya se cumplió: eres tú.</p>
          ) : (
            <>
              <p className={styles.text}>Cierra los ojos y pide un deseo.</p>
              <button type="button" className={styles.action} onClick={wish}>
                <Sparkles aria-hidden strokeWidth={1.6} /> Pedir mi deseo
              </button>
            </>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
