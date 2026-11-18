/**
 * Web Push sin dependencias, solo con WebCrypto (funciona en Workers y Node).
 * - Cifrado del contenido: RFC 8291 (aes128gcm, RFC 8188).
 * - Autenticación del servidor: VAPID, RFC 8292 (JWT ES256).
 */

const encoder = new TextEncoder()
/** UTF-8 como Uint8Array<ArrayBuffer> (lo que exige WebCrypto en los tipos de Workers). */
const utf8 = (s: string): Uint8Array<ArrayBuffer> => new Uint8Array(encoder.encode(s))

export function b64urlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let s = ''
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i])
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function b64urlDecode(str: string): Uint8Array<ArrayBuffer> {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4)
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function concat(...parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

async function hkdf(salt: Uint8Array<ArrayBuffer>, ikm: Uint8Array<ArrayBuffer>, info: Uint8Array<ArrayBuffer>, length: number) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, length * 8)
  return new Uint8Array(bits)
}

export interface EncryptOptions {
  /** Solo para pruebas: sal fija (16 bytes). */
  salt?: Uint8Array<ArrayBuffer>
  /** Solo para pruebas: par de claves ECDH fijo del servidor. */
  serverKeys?: CryptoKeyPair
  recordSize?: number
}

/**
 * Cifra `plaintext` para una suscripción (p256dh = clave pública del
 * navegador, auth = secreto de 16 bytes). Devuelve el cuerpo completo
 * (cabecera aes128gcm + un único registro).
 */
export async function encryptPayload(
  plaintext: Uint8Array<ArrayBuffer>,
  p256dh: string,
  auth: string,
  opts: EncryptOptions = {},
): Promise<Uint8Array<ArrayBuffer>> {
  const uaPublic = b64urlDecode(p256dh)
  const authSecret = b64urlDecode(auth)
  if (uaPublic.length !== 65 || authSecret.length < 16) throw new Error('Suscripción inválida')

  const salt = opts.salt ?? crypto.getRandomValues(new Uint8Array(16))
  const serverKeys =
    opts.serverKeys ??
    ((await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair)
  const asPublic = new Uint8Array((await crypto.subtle.exportKey('raw', serverKeys.publicKey)) as ArrayBuffer)

  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  // En los tipos de Workers el campo se llama `$public`; en tiempo de ejecución es `public` (estándar).
  const ecdhParams = { name: 'ECDH', public: uaKey } as unknown as Parameters<typeof crypto.subtle.deriveBits>[0]
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits(ecdhParams, serverKeys.privateKey, 256))

  const keyInfo = concat(utf8('WebPush: info\u0000'), uaPublic, asPublic)
  const ikm = await hkdf(authSecret, ecdhSecret, keyInfo, 32)
  const cek = await hkdf(salt, ikm, utf8('Content-Encoding: aes128gcm\u0000'), 16)
  const nonce = await hkdf(salt, ikm, utf8('Content-Encoding: nonce\u0000'), 12)

  const rs = opts.recordSize ?? 4096
  // Un solo registro: datos + delimitador 0x02 + etiqueta GCM (16) deben caber en rs.
  if (plaintext.length + 1 + 16 > rs) throw new Error('Contenido demasiado grande para un registro')
  const padded = concat(plaintext, new Uint8Array([2]))
  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, padded))

  const header = new Uint8Array(16 + 4 + 1 + asPublic.length)
  header.set(salt, 0)
  new DataView(header.buffer).setUint32(16, rs)
  header[20] = asPublic.length
  header.set(asPublic, 21)
  return concat(header, ciphertext)
}

export interface VapidKeys {
  /** Clave pública sin comprimir (65 bytes) en base64url. */
  publicKey: string
  /** Componente privado `d` (32 bytes) en base64url. */
  privateKey: string
  /** "mailto:…" o una URL https de contacto. */
  subject: string
}

/** Cabecera Authorization VAPID para el servicio push de `endpoint`. */
export async function vapidAuthorization(endpoint: string, vapid: VapidKeys, now = Date.now()): Promise<string> {
  const pub = b64urlDecode(vapid.publicKey)
  const key = await crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      d: vapid.privateKey,
      x: b64urlEncode(pub.slice(1, 33)),
      y: b64urlEncode(pub.slice(33, 65)),
      ext: true,
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )
  const header = b64urlEncode(utf8(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const claims = b64urlEncode(
    utf8(
      JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: vapid.subject }),
    ),
  )
  const unsigned = `${header}.${claims}`
  // WebCrypto entrega la firma ECDSA como r||s (64 bytes): justo el formato de JWT.
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, utf8(unsigned))
  return `vapid t=${unsigned}.${b64urlEncode(sig)}, k=${vapid.publicKey}`
}

export interface StoredSubscription {
  endpoint: string
  p256dh: string
  auth: string
}

export interface PushOptions {
  /** Segundos que el servicio push guarda el mensaje si el teléfono está apagado. */
  ttl?: number
  urgency?: 'very-low' | 'low' | 'normal' | 'high'
  /** Mensajes con el mismo tema se reemplazan si aún no se entregaron. */
  topic?: string
}

export async function sendWebPush(
  sub: StoredSubscription,
  payload: string,
  vapid: VapidKeys,
  opts: PushOptions = {},
): Promise<Response> {
  const body = await encryptPayload(utf8(payload), sub.p256dh, sub.auth)
  const headers: Record<string, string> = {
    Authorization: await vapidAuthorization(sub.endpoint, vapid),
    'Content-Encoding': 'aes128gcm',
    'Content-Type': 'application/octet-stream',
    TTL: String(opts.ttl ?? 86_400),
    Urgency: opts.urgency ?? 'high',
  }
  if (opts.topic) headers.Topic = opts.topic
  return fetch(sub.endpoint, { method: 'POST', headers, body })
}
