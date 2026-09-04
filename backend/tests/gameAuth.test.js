const assert = require('node:assert/strict')
const test = require('node:test')

const {
  cardsInHand,
  generateRoomCode,
  guessMatchesWord,
  normalizePlayerName,
  sanitizeDeck,
  tokensEqual,
  ROOM_CODE_LEN,
} = require('../lib/gameAuth')

test('room codes are 6 chars from a non-ambiguous alphabet', () => {
  const code = generateRoomCode()
  assert.equal(code.length, ROOM_CODE_LEN)
  assert.match(code, /^[A-HJ-NP-Z2-9]{6}$/)
})

test('tokensEqual is length-safe and rejects mismatches', () => {
  assert.equal(tokensEqual('abc', 'abc'), true)
  assert.equal(tokensEqual('abc', 'abd'), false)
  assert.equal(tokensEqual('abc', 'ab'), false)
  assert.equal(tokensEqual('', 'abc'), false)
})

test('normalizePlayerName strips tags and truncates', () => {
  assert.equal(normalizePlayerName('  Ana <b>x</b>  '), 'Ana x')
  assert.equal(normalizePlayerName('x'.repeat(40)).length, 20)
})

test('sanitizeDeck caps size and strips html', () => {
  const cards = sanitizeDeck(['  oi  ', '<img src=x>', 'ok', 'extra'], { max: 3, maxLen: 10 })
  assert.deepEqual(cards, ['oi', 'ok'])
})

test('cardsInHand rejects cards the player does not hold', () => {
  assert.equal(cardsInHand(['a', 'b'], ['a']), true)
  assert.equal(cardsInHand(['a', 'b'], ['a', 'a']), false)
  assert.equal(cardsInHand(['a', 'b'], ['c']), false)
})

test('guessMatchesWord requires an exact match', () => {
  assert.equal(guessMatchesWord('Casa', 'casa'), true)
  assert.equal(guessMatchesWord('c', 'casa'), false)
  assert.equal(guessMatchesWord('casamento', 'casa'), false)
})
