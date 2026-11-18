/** Validaciones de acceso (puras, sin dependencias de Cloudflare). */

const LOCALHOST = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/

/**
 * ¿Se permite este origen? Con la lista vacía se permite cualquiera (desarrollo).
 * Sin cabecera Origin (clientes que no son navegador) también: igual necesitan la clave.
 */
export function originAllowed(origin: string | null, allowed: string | undefined): boolean {
  const list = (allowed ?? '')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean)
  if (!list.length || !origin) return true
  return list.includes(origin) || LOCALHOST.test(origin)
}

/** Comparación en tiempo constante (no revela cuántos caracteres coinciden). */
export function sameKey(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a)
  const eb = new TextEncoder().encode(b)
  let diff = ea.length ^ eb.length
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0)
  return diff === 0
}
