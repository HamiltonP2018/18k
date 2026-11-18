/**
 * Fondo de partículas (evolución del canvas original):
 * destellos dorados/rosados y pequeños corazones que flotan hacia arriba y
 * se apartan del dedo o del mouse.
 *
 * Rendimiento: sprites con brillo pre-renderizados (nada de shadowBlur por
 * frame), densidad según el tamaño de pantalla, pausa con la pestaña oculta
 * y cuadro estático si el sistema pide reducir movimiento.
 *
 * `burstParticles()` (lib/confetti) acelera las partículas un momento.
 */
import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'motion/react'
import styles from './ParticleBackground.module.css'

const COLORS = ['#f3c969', '#ff7a93', '#ffffff', '#ffb3c1', '#ffe08a']
const HEART = new Path2D(
  'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
)

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  sprite: HTMLCanvasElement
  alpha: number
  phase: number
  speed: number
  heart: boolean
  rot: number
}

function makeDotSprite(color: string): HTMLCanvasElement {
  const s = 48
  const c = document.createElement('canvas')
  c.width = c.height = s
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  grad.addColorStop(0, color)
  grad.addColorStop(0.18, color)
  grad.addColorStop(0.35, `${color}88`)
  grad.addColorStop(1, `${color}00`)
  g.fillStyle = grad
  g.fillRect(0, 0, s, s)
  return c
}

function makeHeartSprite(color: string): HTMLCanvasElement {
  const s = 64
  const c = document.createElement('canvas')
  c.width = c.height = s
  const g = c.getContext('2d')!
  g.translate(s / 2 - 12 * 1.6, s / 2 - 12 * 1.6)
  g.scale(1.6, 1.6)
  g.shadowColor = color
  g.shadowBlur = 10
  g.fillStyle = color
  g.fill(HEART)
  return c
}

export function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const dots = COLORS.map(makeDotSprite)
    const hearts = COLORS.map(makeHeartSprite)
    const pointer = { x: -9999, y: -9999 }
    let w = 0
    let h = 0
    let particles: Particle[] = []
    let raf = 0
    let boost = 1
    let running = false

    const rand = (min: number, max: number) => min + Math.random() * (max - min)

    const spawn = (anywhere: boolean): Particle => {
      const heart = Math.random() < 0.1
      const i = Math.floor(Math.random() * COLORS.length)
      return {
        x: rand(0, w),
        y: anywhere ? rand(0, h) : h + rand(10, 60),
        vx: rand(-0.12, 0.12),
        vy: -rand(0.06, 0.32) * (heart ? 1.25 : 1),
        size: heart ? rand(7, 13) : rand(1.2, 4.2),
        sprite: heart ? hearts[i] : dots[i],
        alpha: heart ? rand(0.25, 0.55) : rand(0.3, 0.9),
        phase: rand(0, Math.PI * 2),
        speed: rand(0.008, 0.03),
        heart,
        rot: rand(-0.35, 0.35),
      }
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.round(Math.min(150, Math.max(45, (w * h) / 10000)))
      particles = Array.from({ length: count }, () => spawn(true))
    }

    const draw = (animate: boolean) => {
      ctx.clearRect(0, 0, w, h)
      for (const p of particles) {
        if (animate) {
          p.phase += p.speed
          p.x += (p.vx + Math.sin(p.phase) * 0.12) * boost
          p.y += p.vy * boost
          const dx = p.x - pointer.x
          const dy = p.y - pointer.y
          const dist2 = dx * dx + dy * dy
          if (dist2 < 130 * 130 && dist2 > 0.01) {
            const dist = Math.sqrt(dist2)
            const force = (130 - dist) / 130
            p.x += (dx / dist) * force * 3.2
            p.y += (dy / dist) * force * 3.2
          }
          if (p.y < -30 || p.x < -40 || p.x > w + 40) Object.assign(p, spawn(false))
        }
        const twinkle = 0.55 + 0.45 * Math.sin(p.phase * 2)
        ctx.globalAlpha = p.alpha * twinkle
        const s = p.heart ? p.size * 2.4 : p.size * 6
        if (p.heart) {
          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.rotate(p.rot + Math.sin(p.phase) * 0.15)
          ctx.drawImage(p.sprite, -s / 2, -s / 2, s, s)
          ctx.restore()
        } else {
          ctx.drawImage(p.sprite, p.x - s / 2, p.y - s / 2, s, s)
        }
      }
      ctx.globalAlpha = 1
      boost = 1 + (boost - 1) * 0.965
    }

    const loop = () => {
      draw(true)
      raf = requestAnimationFrame(loop)
    }
    const start = () => {
      if (running || reduced) return
      running = true
      raf = requestAnimationFrame(loop)
    }
    const stop = () => {
      running = false
      cancelAnimationFrame(raf)
    }

    let resizeTimer = 0
    const onResize = () => {
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => {
        resize()
        if (reduced) draw(false)
      }, 150)
    }
    const onPointer = (e: PointerEvent) => {
      pointer.x = e.clientX
      pointer.y = e.clientY
    }
    const onLeave = () => {
      pointer.x = pointer.y = -9999
    }
    const onVisibility = () => (document.hidden ? stop() : start())
    const onBurst = () => {
      boost = 16
    }

    resize()
    if (reduced) draw(false)
    else start()

    window.addEventListener('resize', onResize)
    window.addEventListener('pointermove', onPointer, { passive: true })
    window.addEventListener('pointerdown', onPointer, { passive: true })
    window.addEventListener('pointerup', onLeave, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('nh:particles-burst', onBurst)
    return () => {
      stop()
      window.clearTimeout(resizeTimer)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('pointerup', onLeave)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('nh:particles-burst', onBurst)
    }
  }, [reduced])

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden />
}
