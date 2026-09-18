const assert = require('node:assert/strict')
const test = require('node:test')
const { generatePlayerToken } = require('../lib/gameAuth')
const {
  applyCardRoomResult,
  lobbyJoinFilter,
  lobbyStartFilter,
  cardroomJoinFilter,
  cardroomStartFilter,
  publicLobby,
} = require('../lib/cardroomPlay')
const {
  createUploadToken,
  rotateUploadToken,
  verifyUploadToken,
} = require('../lib/mememixSessions')

function playingRoom() {
  const a = generatePlayerToken()
  const b = generatePlayerToken()
  return {
    status: 'playing',
    currentPlayer: 'p1',
    currentRound: 1,
    maxPoints: 3,
    history: [],
    players: [
      { id: 'p1', token: a, name: 'Ana', points: 0 },
      { id: 'p2', token: b, name: 'Bruno', points: 0 },
    ],
    _tokens: { a, b },
  }
}

test('CardRoom result rejects out-of-turn and double result on the same round', () => {
  const room = playingRoom()
  const skip = applyCardRoomResult(room, { playerToken: room._tokens.b, result: 'completed' })
  assert.equal(skip.ok, false)
  assert.match(skip.error, /tua vez/)
  assert.equal(room.players[1].points, 0)

  const ok = applyCardRoomResult(room, { playerToken: room._tokens.a, result: 'completed' })
  assert.equal(ok.ok, true)
  assert.equal(room.players[0].points, 1)
  assert.equal(room.currentPlayer, 'p2')

  room.currentPlayer = 'p1'
  room.currentRound = 1
  const dup = applyCardRoomResult(room, { playerToken: room._tokens.a, result: 'completed' })
  assert.equal(dup.ok, false)
  assert.match(dup.error, /já foi registada/)
})

test('CardRoom result ignores client points and uses the result key', () => {
  const room = playingRoom()
  applyCardRoomResult(room, { playerToken: room._tokens.a, result: 'skipped' })
  assert.equal(room.players[0].points, 0)
})

test('CardRoom result rejects when the room is not playing', () => {
  const room = playingRoom()
  room.status = 'waiting'
  const denied = applyCardRoomResult(room, { playerToken: room._tokens.a, result: 'completed' })
  assert.equal(denied.ok, false)
  assert.equal(room.players[0].points, 0)
})

test('CardRoom result lock pins the current player and round before mutation', () => {
  const room = playingRoom()
  room.code = 'XYZ999'
  const applied = applyCardRoomResult(room, { playerToken: room._tokens.a, result: 'completed' })
  assert.equal(applied.lock.currentPlayer, 'p1')
  assert.equal(applied.lock.currentRound, 1)
  assert.equal(applied.lock.status, 'playing')
  assert.equal(room.currentPlayer, 'p2')
})

test('lobby and cardroom start filters only match waiting rooms', () => {
  assert.deepEqual(lobbyStartFilter('lobby-id'), { _id: 'lobby-id', status: 'waiting' })
  assert.deepEqual(cardroomStartFilter('room-id'), { _id: 'room-id', status: 'waiting' })
})

test('lobby and cardroom join filters require unique name, waiting, and a size cap', () => {
  const lobby = lobbyJoinFilter('ABC123', 'Ana', 15)
  assert.equal(lobby.status, 'waiting')
  assert.deepEqual(lobby['players.name'], { $ne: 'Ana' })
  assert.deepEqual(lobby.$expr, { $lt: [{ $size: '$players' }, 15] })

  const card = cardroomJoinFilter('XYZ999', 'Bruno')
  assert.equal(card.status, 'waiting')
  assert.deepEqual(card['players.name'], { $ne: 'Bruno' })
  assert.equal(card.$expr.$lt[1], '$maxPlayers')
})

test('publicLobby strips player tokens', () => {
  const view = publicLobby({
    code: 'ABC123',
    host: 'Ana',
    status: 'waiting',
    players: [{ name: 'Ana', token: 'secret', joinedAt: new Date() }],
  })
  assert.equal(view.players[0].name, 'Ana')
  assert.equal(view.players[0].token, undefined)
})

test('MemeMix rotateUploadToken invalidates the old token', () => {
  const oldToken = createUploadToken('ROOM01', 'sock-1', 'Ana')
  const next = rotateUploadToken(oldToken, 'sock-2')
  assert.ok(next)
  assert.notEqual(next, oldToken)
  assert.equal(verifyUploadToken(oldToken, 'ROOM01'), null)
  assert.ok(verifyUploadToken(next, 'ROOM01'))
  assert.equal(verifyUploadToken(next, 'ROOM01').socketId, 'sock-2')
})
