const assert = require('node:assert/strict')
const test = require('node:test')

const {
  cardsInHand,
  detachSocketFromRooms,
  dropDisconnectedPlayers,
  generateRoomCode,
  guessMatchesWord,
  normalizePlayerName,
  removeCardsFromHand,
  socketSeatedIn,
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

test('removeCardsFromHand removes one copy of a duplicate card', () => {
  assert.deepEqual(removeCardsFromHand(['foo', 'foo', 'bar'], ['foo']), ['foo', 'bar'])
})

test('socketSeatedIn rejects a second seat for the same connection', () => {
  const room = { players: [{ id: 's1', name: 'Ana', disconnected: false }] }
  assert.equal(socketSeatedIn(room, 's1'), true)
  assert.equal(socketSeatedIn(room, 's2'), false)
})

test('detachSocketFromRooms marks the socket disconnected except in the kept room', () => {
  const rooms = {
    AAA111: { players: [{ id: 's1', name: 'Ana', disconnected: false }] },
    BBB222: { players: [{ id: 's1', name: 'Ana', disconnected: false }] },
  }
  const affected = detachSocketFromRooms(rooms, 's1', 'BBB222')
  assert.equal(affected.length, 1)
  assert.equal(rooms.AAA111.players[0].disconnected, true)
  assert.equal(rooms.AAA111.players[0].id, null)
  assert.equal(rooms.BBB222.players[0].id, 's1')
})

test('dropDisconnectedPlayers remaps host and juiz onto remaining seats', () => {
  const room = {
    host: 'Ana',
    hostId: null,
    juizIdx: 0,
    players: [
      { id: null, name: 'Ana', disconnected: true },
      { id: 'b', name: 'Bruno', disconnected: false },
    ],
  }
  dropDisconnectedPlayers(room)
  assert.equal(room.players.length, 1)
  assert.equal(room.host, 'Bruno')
  assert.equal(room.hostId, 'b')
  assert.equal(room.juizIdx, 0)
})
