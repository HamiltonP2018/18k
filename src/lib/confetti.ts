/**
 * Lluvias y explosiones de corazones (canvas-confetti).
 * Todas respetan "reducir movimiento" del sistema.
 */
import confetti from 'canvas-confetti'

const HEART_PATH =
  'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'

export const HEART_COLORS = ['#ff7a93', '#ff4f74', '#f3c969', '#ffe08a', '#ffffff', '#ffb3c1']

let heartShape: confetti.Shape | null = null
function heart(): confetti.Shape {
  heartShape ??= confetti.shapeFromPath({ path: HEART_PATH })
  return heartShape
}

const Z = 1000

export interface BurstOptions {
  /** Origen horizontal 0–1 (0.5 = centro). */
  x?: number
  /** Origen vertical 0–1 (0.5 = centro). */
  y?: number
  /** Cantidad de corazones. */
  count?: number
  /** Multiplicador de velocidad. */
  power?: number
}

/** Explosión de corazones desde un punto (por defecto, el centro). */
export function heartBurst({ x = 0.5, y = 0.5, count = 110, power = 1 }: BurstOptions = {}): void {
  const origin = { x, y }
  confetti({
    particleCount: count,
    spread: 360,
    startVelocity: 34 * power,
    gravity: 0.55,
    decay: 0.92,
    ticks: 260,
    scalar: 1.7,
    origin,
    shapes: [heart()],
    colors: HEART_COLORS,
    disableForReducedMotion: true,
    zIndex: Z,
  })
  confetti({
    particleCount: Math.round(count * 0.6),
    spread: 360,
    startVelocity: 24 * power,
    gravity: 0.45,
    ticks: 200,
    scalar: 0.8,
    origin,
    shapes: ['circle'],
    colors: HEART_COLORS,
    disableForReducedMotion: true,
    zIndex: Z,
  })
}

/** Corazones que salen desde ambos lados durante `durationMs`. */
export function heartCannons(durationMs = 2600): void {
  const end = Date.now() + durationMs
  const frame = () => {
    const common = {
      particleCount: 2,
      spread: 60,
      startVelocity: 55,
      gravity: 0.7,
      ticks: 300,
      scalar: 1.5,
      shapes: [heart()],
      colors: HEART_COLORS,
      disableForReducedMotion: true,
      zIndex: Z,
    }
    confetti({ ...common, angle: 60, origin: { x: 0, y: 0.85 } })
    confetti({ ...common, angle: 120, origin: { x: 1, y: 0.85 } })
    if (Date.now() < end) requestAnimationFrame(frame)
  }
  frame()
}

/** Lluvia suave de corazones cayendo desde arriba. */
export function heartRain(durationMs = 4000): void {
  const end = Date.now() + durationMs
  const frame = () => {
    confetti({
      particleCount: 1,
      startVelocity: 0,
      gravity: 0.35,
      drift: (Math.random() - 0.5) * 0.8,
      ticks: 420,
      scalar: 1.2 + Math.random(),
      origin: { x: Math.random(), y: -0.05 },
      shapes: [heart()],
      colors: HEART_COLORS,
      disableForReducedMotion: true,
      zIndex: Z,
    })
    if (Date.now() < end) requestAnimationFrame(frame)
  }
  frame()
}

/** Acelera momentáneamente las partículas del fondo (ver ParticleBackground). */
export function burstParticles(): void {
  window.dispatchEvent(new Event('nh:particles-burst'))
}
