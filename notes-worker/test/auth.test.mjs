import { test } from 'node:test'
import assert from 'node:assert/strict'
import { originAllowed, sameKey } from '../src/auth.ts'

test('origen: lista vacía permite todo; con lista solo esos orígenes + localhost', () => {
  assert.equal(originAllowed('https://quien-sea.com', ''), true)
  const list = 'https://nuestra.onrender.com/, https://otro.example'
  assert.equal(originAllowed('https://nuestra.onrender.com', list), true)
  assert.equal(originAllowed('https://otro.example', list), true)
  assert.equal(originAllowed('http://localhost:5173', list), true)
  assert.equal(originAllowed('https://malicioso.com', list), false)
  assert.equal(originAllowed('https://nuestra.onrender.com.malicioso.com', list), false)
  assert.equal(originAllowed(null, list), true)
})

test('clave: compara exacto', () => {
  assert.equal(sameKey('abc', 'abc'), true)
  assert.equal(sameKey('abc', 'abd'), false)
  assert.equal(sameKey('abc', 'abcd'), false)
  assert.equal(sameKey('', 'x'), false)
})
