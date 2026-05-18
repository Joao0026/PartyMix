const assert = require('node:assert/strict')
const test = require('node:test')

const {
  bool,
  cleanString,
  intInRange,
  jsonWithinLimit,
  mongoId,
  mongoIdList,
  oneOf,
  roomCode,
  stripHtml,
} = require('../lib/validate')

test('stripHtml removes tags and control characters', () => {
  assert.equal(stripHtml(' <b>Olá</b>\u0000 '), ' Olá ')
})

test('cleanString trims, strips html and enforces required values', () => {
  assert.equal(cleanString('  <script>x</script> João  ', { max: 20 }), 'x João')
  assert.throws(() => cleanString('   ', { field: 'name', required: true }), /name is required/)
})

test('oneOf accepts only allowed enum values', () => {
  assert.equal(oneOf('friends', ['friends', 'family']), 'friends')
  assert.throws(() => oneOf('admin', ['friends', 'family'], { field: 'mode' }), /mode is invalid/)
})

test('bool parses common query string booleans', () => {
  assert.equal(bool('true'), true)
  assert.equal(bool('false'), false)
  assert.equal(bool(undefined, true), true)
})

test('intInRange clamps numeric values', () => {
  assert.equal(intInRange('999', { min: 1, max: 20, defaultValue: 5 }), 20)
  assert.equal(intInRange('nope', { min: 1, max: 20, defaultValue: 5 }), 5)
})

test('roomCode normalizes valid room codes and rejects invalid input', () => {
  assert.equal(roomCode(' ab12 '), 'AB12')
  assert.throws(() => roomCode('bad code!'), /code is invalid/)
})

test('mongo id helpers reject invalid ids and filter invalid lists', () => {
  const valid = '507f1f77bcf86cd799439011'
  assert.equal(mongoId(valid), valid)
  assert.deepEqual(mongoIdList([valid, 'bad']), [valid])
  assert.throws(() => mongoId('bad'), /id is invalid/)
})

test('jsonWithinLimit rejects oversized payloads', () => {
  assert.deepEqual(jsonWithinLimit({ ok: true }, { maxBytes: 20 }), { ok: true })
  assert.throws(() => jsonWithinLimit({ text: 'x'.repeat(50) }, { maxBytes: 20 }), /payload is too large/)
})
