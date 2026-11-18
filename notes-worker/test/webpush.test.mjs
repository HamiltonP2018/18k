import { test } from 'node:test'
import assert from 'node:assert/strict'
import { b64urlDecode, b64urlEncode, encryptPayload, vapidAuthorization } from '../src/webpush.ts'
import { decryptPayload, ecdhKeysFromRaw, makeBrowserSubscription, verifyVapid } from './push-helpers.mjs'

// RFC 8291, apéndice A
const V = {
  plaintext: 'V2hlbiBJIGdyb3cgdXAsIEkgd2FudCB0byBiZSBhIHdhdGVybWVsb24',
  asPublic: 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8',
  asPrivate: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw',
  uaPublic: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
  uaPrivate: 'q1dXpw3UpT5VOmu_cf_v6ih07Aems3njxI-JWgLcM94',
  salt: 'DGv6ra1nlYgDCS1FRnbzlw',
  auth: 'BTBZMqHH6r4Tts7J_aSIgg',
  body: 'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN',
}

test('cifrado aes128gcm idéntico al vector del RFC 8291', async () => {
  const serverKeys = await ecdhKeysFromRaw(V.asPrivate, V.asPublic)
  const body = await encryptPayload(b64urlDecode(V.plaintext), V.uaPublic, V.auth, { salt: b64urlDecode(V.salt), serverKeys })
  assert.equal(b64urlEncode(body), V.body)
})

test('el vector del RFC se descifra con la clave del navegador', async () => {
  const uaKeys = await ecdhKeysFromRaw(V.uaPrivate, V.uaPublic)
  const { text, rs } = await decryptPayload(b64urlDecode(V.body), uaKeys, V.uaPublic, V.auth)
  assert.equal(text, 'When I grow up, I want to be a watermelon')
  assert.equal(rs, 4096)
})

test('ida y vuelta con claves aleatorias y texto con acentos/emoji', async () => {
  const { keys, sub } = await makeBrowserSubscription('https://push.example/abc')
  const msg = JSON.stringify({ title: 'Katherine te dejó una notita 💌', body: 'Te extraño muchísimo, ¿sabías?' })
  const body = await encryptPayload(new TextEncoder().encode(msg), sub.keys.p256dh, sub.keys.auth)
  const { text } = await decryptPayload(body, keys, sub.keys.p256dh, sub.keys.auth)
  assert.equal(text, msg)
})

test('JWT VAPID firmado y verificable (ES256, aud = origen del endpoint)', async () => {
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
  const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey)
  const pub = b64urlEncode(await crypto.subtle.exportKey('raw', kp.publicKey))
  const auth = await vapidAuthorization('https://fcm.googleapis.com/fcm/send/xyz', { publicKey: pub, privateKey: jwk.d, subject: 'https://ejemplo.onrender.com' })
  const { header, claims } = await verifyVapid(auth, pub)
  assert.equal(header.alg, 'ES256')
  assert.equal(claims.aud, 'https://fcm.googleapis.com')
  assert.equal(claims.sub, 'https://ejemplo.onrender.com')
  assert.ok(claims.exp > Date.now() / 1000 + 3600 && claims.exp <= Date.now() / 1000 + 24 * 3600)
})
