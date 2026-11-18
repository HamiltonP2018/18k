import { test } from 'node:test'
import assert from 'node:assert/strict'
import { addDays, dueReminders, localParts, monthiversaryDate, monthiversaryOn } from '../src/monthiversary.ts'

const S = { startDate: '2026-05-18T00:00:00', timeZone: 'America/Bogota', eveHour: 20, dayHour: 8 }
/** Hora local de Bogotá (UTC−5, sin horario de verano). */
const bog = (iso) => Date.parse(`${iso}-05:00`)
const kinds = (ms) => dueReminders(ms, S).map((d) => d.key)

test('aviso del día antes: desde las 20:00 hasta antes de las 23:00', () => {
  assert.deepEqual(kinds(bog('2026-11-17T19:59')), [])
  assert.deepEqual(dueReminders(bog('2026-11-17T20:00'), S), [{ kind: 'eve', months: 6, key: '6:eve' }])
  assert.deepEqual(kinds(bog('2026-11-17T22:59')), ['6:eve'])
  assert.deepEqual(kinds(bog('2026-11-17T23:00')), [])
})

test('aviso del mismo día: desde las 8:00 hasta antes de las 11:00', () => {
  assert.deepEqual(kinds(bog('2026-11-18T07:59')), [])
  assert.deepEqual(dueReminders(bog('2026-11-18T08:00'), S), [{ kind: 'day', months: 6, key: '6:day' }])
  assert.deepEqual(kinds(bog('2026-11-18T10:59')), ['6:day'])
  assert.deepEqual(kinds(bog('2026-11-18T11:00')), [])
  assert.deepEqual(kinds(bog('2026-11-18T20:00')), [], 'el 19 no es mesiversario')
})

test('usa la hora de Bogotá aunque el servidor esté en UTC', () => {
  // 01:00 UTC del 18 = 20:00 del 17 en Bogotá
  assert.deepEqual(kinds(Date.parse('2026-11-18T01:00:00Z')), ['6:eve'])
  assert.deepEqual(localParts(Date.parse('2026-11-18T05:00:00Z'), 'America/Bogota'), { y: 2026, m: 11, d: 18, hour: 0 })
})

test('primer año y años siguientes', () => {
  assert.deepEqual(kinds(bog('2027-05-17T21:00')), ['12:eve'])
  assert.deepEqual(kinds(bog('2027-05-18T09:00')), ['12:day'])
  assert.deepEqual(kinds(bog('2027-01-18T08:00')), ['8:day'], 'cruza el año')
})

test('el día de inicio no cuenta como mesiversario', () => {
  assert.deepEqual(kinds(bog('2026-05-17T20:00')), [])
  assert.deepEqual(kinds(bog('2026-05-18T08:00')), [])
  assert.equal(monthiversaryOn({ y: 2026, m: 4, d: 18 }, { y: 2026, m: 5, d: 18 }), null)
})

test('inicio un 31: el mesiversario cae el último día de los meses cortos', () => {
  const start = { y: 2026, m: 1, d: 31 }
  assert.deepEqual(monthiversaryDate(start, 1), { y: 2026, m: 2, d: 28 })
  assert.deepEqual(monthiversaryDate(start, 2), { y: 2026, m: 3, d: 31 })
  assert.deepEqual(monthiversaryDate(start, 13), { y: 2027, m: 2, d: 28 })
  assert.equal(monthiversaryOn({ y: 2026, m: 2, d: 28 }, start), 1)
  assert.equal(monthiversaryOn({ y: 2026, m: 3, d: 1 }, start), null)
  assert.equal(monthiversaryOn({ y: 2026, m: 4, d: 30 }, start), 3)
  const s31 = { ...S, startDate: '2026-01-31' }
  assert.deepEqual(dueReminders(bog('2026-02-27T20:00'), s31).map((d) => d.key), ['1:eve'])
})

test('el día antes cruza el cambio de mes', () => {
  assert.deepEqual(addDays({ y: 2026, m: 12, d: 31 }, 1), { y: 2027, m: 1, d: 1 })
  const s1 = { ...S, startDate: '2026-05-01' }
  assert.deepEqual(dueReminders(bog('2026-05-31T20:00'), s1).map((d) => d.key), ['1:eve'])
})
