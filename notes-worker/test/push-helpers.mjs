/** Utilidades de prueba: el lado "navegador" de Web Push (descifrar y verificar VAPID). */
import { b64urlDecode, b64urlEncode } from '../src/webpush.ts'

const enc = new TextEncoder()

async function hkdf(salt, ikm, info, length) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, length * 8))
}
const concat = (...p) => {
  const out = new Uint8Array(p.reduce((n, x) => n + x.length, 0))
  let o = 0
  for (const x of p) {
    out.set(x, o)
    o += x.length
  }
  return out
}

/** Par de claves ECDH desde base64url (privada d + pública sin comprimir). */
export async function ecdhKeysFromRaw(privB64, pubB64) {
  const pub = b64urlDecode(pubB64)
  const jwk = { kty: 'EC', crv: 'P-256', d: privB64, x: b64urlEncode(pub.slice(1, 33)), y: b64urlEncode(pub.slice(33)), ext: true }
  const privateKey = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const publicKey = await crypto.subtle.importKey('raw', pub, { name: 'ECDH', namedCurve: 'P-256' }, true, [])
  return { privateKey, publicKey }
}

/** Crea una "suscripción de navegador" falsa. */
export async function makeBrowserSubscription(endpoint) {
  const keys = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const pub = new Uint8Array(await crypto.subtle.exportKey('raw', keys.publicKey))
  const auth = crypto.getRandomValues(new Uint8Array(16))
  return { keys, sub: { endpoint, keys: { p256dh: b64urlEncode(pub), auth: b64urlEncode(auth) } } }
}

/** Descifra un cuerpo aes128gcm como lo haría el navegador. */
export async function decryptPayload(body, uaKeys, p256dh, auth) {
  const salt = body.slice(0, 16)
  const rs = new DataView(body.buffer, body.byteOffset).getUint32(16)
  const idlen = body[20]
  const asPublic = body.slice(21, 21 + idlen)
  const ct = body.slice(21 + idlen)
  const uaPublic = b64urlDecode(p256dh)
  const asKey = await crypto.subtle.importKey('raw', asPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: asKey }, uaKeys.privateKey, 256))
  const ikm = await hkdf(b64urlDecode(auth), ecdh, concat(enc.encode('WebPush: info\0'), uaPublic, asPublic), 32)
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16)
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12)
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt'])
  const padded = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, ct))
  let end = padded.length - 1
  while (end >= 0 && padded[end] === 0) end--
  if (padded[end] !== 2) throw new Error('Delimitador de registro inválido')
  return { rs, text: new TextDecoder().decode(padded.slice(0, end)) }
}

/** Verifica la firma del JWT VAPID con la clave pública. Devuelve los claims. */
export async function verifyVapid(authorization, expectedPublicKey) {
  const m = /^vapid t=([^,]+), k=(.+)$/.exec(authorization)
  if (!m) throw new Error('Cabecera VAPID mal formada: ' + authorization)
  const [, jwt, k] = m
  if (k !== expectedPublicKey) throw new Error('Clave pública VAPID distinta')
  const [h, c, s] = jwt.split('.')
  const key = await crypto.subtle.importKey('raw', b64urlDecode(k), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
  const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, b64urlDecode(s), enc.encode(`${h}.${c}`))
  if (!ok) throw new Error('Firma VAPID inválida')
  return { header: JSON.parse(new TextDecoder().decode(b64urlDecode(h))), claims: JSON.parse(new TextDecoder().decode(b64urlDecode(c))) }
}
