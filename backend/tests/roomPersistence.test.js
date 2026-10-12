const assert = require('node:assert/strict')
const test = require('node:test')
const { cloneRoom, reviveRoom } = require('../lib/roomPersistence')
const { secretEqual } = require('../lib/gameAuth')

test('secretEqual compares passwords without leaking by length', () => {
  assert.equal(secretEqual('correct horse', 'correct horse'), true)
  assert.equal(secretEqual('correct horse', 'wrong'), false)
  assert.equal(secretEqual('', 'x'), false)
})

test('cloneRoom drops timers and revive marks players disconnected', () => {
  const room = {
    code: 'ABCDEF',
    host: 'Ana',
    disconnectTimer: setTimeout(() => {}, 1000),
    players: [{ id: 'sock-1', name: 'Ana', token: 'abc', disconnected: false }],
  }
  const cloned = cloneRoom(room)
  assert.equal(cloned.disconnectTimer, undefined)
  assert.equal(cloned.players[0].token, 'abc')
  const revived = reviveRoom(cloned)
  assert.equal(revived.players[0].id, null)
  assert.equal(revived.players[0].disconnected, true)
  assert.equal(revived.players[0].token, 'abc')
  clearTimeout(room.disconnectTimer)
})
