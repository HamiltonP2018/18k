/**
 * Genera los íconos de la app (PWA) desde un SVG: corazón oro → rosa sobre
 * fondo vino. Uso: node scripts/make-icons.mjs
 */
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

const HEART = 'M32 52.5 28.9 49.7C18 39.8 10.8 33.3 10.8 25.3 10.8 18.8 15.9 13.7 22.4 13.7c3.7 0 7.2 1.7 9.6 4.4 2.4-2.7 5.9-4.4 9.6-4.4 6.5 0 11.6 5.1 11.6 11.6 0 8-7.2 14.5-18.1 24.4L32 52.5Z'
const out = new URL('../public/icons/', import.meta.url)
mkdirSync(out, { recursive: true })

/** scale: tamaño del corazón relativo al lienzo (el corazón ocupa ~0.66 de su viewBox de 64). */
const icon = (scale) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="75%">
      <stop offset="0" stop-color="#3a0e23"/>
      <stop offset=".55" stop-color="#1a0915"/>
      <stop offset="1" stop-color="#07020a"/>
    </radialGradient>
    <linearGradient id="h" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff1c9"/>
      <stop offset=".45" stop-color="#f3c969"/>
      <stop offset="1" stop-color="#ff7a93"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#ff7a93" stop-opacity=".35"/>
      <stop offset="1" stop-color="#ff7a93" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <circle cx="256" cy="262" r="${200 * scale}" fill="url(#glow)"/>
  <g transform="translate(256 262) scale(${8 * scale}) translate(-32 -33)">
    <path fill="url(#h)" d="${HEART}"/>
  </g>
</svg>`

const badge = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <g transform="translate(32 33) scale(1.15) translate(-32 -33)"><path fill="#fff" d="${HEART}"/></g>
</svg>`

const jobs = [
  ['icon-192.png', icon(1), 192],
  ['icon-512.png', icon(1), 512],
  ['icon-maskable-512.png', icon(0.72), 512], // dentro de la zona segura (círculo del 80 %)
  ['apple-touch-icon.png', icon(0.92), 180],
  ['badge-96.png', badge, 96], // monocromo para la barra de notificaciones de Android
]
for (const [name, svg, size] of jobs) {
  await sharp(Buffer.from(svg), { density: 300 }).resize(size, size).png({ compressionLevel: 9 }).toFile(new URL(name, out).pathname)
  console.log('✓', name)
}
