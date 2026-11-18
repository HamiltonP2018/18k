/** Genera la clave compartida y el par de claves VAPID (para push). */
const b64url = (buf) => Buffer.from(buf).toString('base64url')

export async function generateSecrets() {
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
  const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey)
  const pub = await crypto.subtle.exportKey('raw', kp.publicKey)
  return {
    NOTES_KEY: b64url(crypto.getRandomValues(new Uint8Array(24))),
    VAPID_PUBLIC_KEY: b64url(pub),
    VAPID_PRIVATE_KEY: jwk.d,
  }
}

/** Lee un archivo KEY="valor" (formato .dev.vars). */
export function parseVars(text) {
  const out = {}
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/.exec(line)
    if (m) out[m[1]] = m[2]
  }
  return out
}
