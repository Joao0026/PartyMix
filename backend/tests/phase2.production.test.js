const assert = require('node:assert/strict')
const test = require('node:test')
const http = require('node:http')
const { io: ioc } = require('socket.io-client')

const { hashRoom, errorCode, track, trackRoom, resetEvents, recentEvents, setWriter } = require('../lib/observability')
const { assertSingleInstance, helloPayload, stickyCookieHeader, WS_POLICY } = require('../lib/wsPolicy')
const { assertModeEnabled, onlineFlags, DISABLED_MESSAGE } = require('../lib/featureFlags')
const { healthPayload, readyPayload } = require('../lib/health')
const { staleLobbyFilter, staleCardRoomFilter, LOBBY_TTL_MS, CARDROOM_TTL_MS } = require('../lib/mongoMaintenance')
const { pruneAiDailyHits, aiDailyHits } = require('../middleware/rateLimits')
const { initWebSocket, _test: wsTest } = require('../websocket')

test('WS policy is single-instance sticky and rejects multi-worker prod shapes', () => {
  assert.equal(WS_POLICY, 'single-instance-sticky')
  assert.equal(assertSingleInstance({}).ok, true)
  assert.equal(assertSingleInstance({ WEB_CONCURRENCY: '1' }).ok, true)
  const many = assertSingleInstance({ WEB_CONCURRENCY: '2' })
  assert.equal(many.ok, false)
  assert.match(many.error, /WEB_CONCURRENCY=1/)
  const hello = helloPayload({ INSTANCE_ID: 'box-1' })
  assert.equal(hello.wsPolicy, WS_POLICY)
  assert.equal(hello.roomsEphemeral, true)
  assert.equal(hello.instanceId, 'box-1')
  assert.match(stickyCookieHeader({ INSTANCE_ID: 'box-1' }), /pmx_instance=box-1/)
})

test('structured logs hash room codes and drop PII', () => {
  resetEvents()
  const lines = []
  const restore = setWriter((line) => lines.push(line))
  const rec = trackRoom('room_created', 'cards', {
    code: 'ABC123',
    players: [{ name: 'Ana', token: 'secret' }, { name: 'Bruno' }],
  })
  restore()
  assert.equal(rec.roomHash, hashRoom('ABC123'))
  assert.equal(rec.playerCount, 2)
  assert.equal(rec.roomCode, undefined)
  assert.equal(rec.players, undefined)
  assert.equal(lines.join('').includes('ABC123'), false)
  assert.equal(lines.join('').includes('Ana'), false)
  assert.equal(lines.join('').includes('secret'), false)
})

test('analytics events omit player tokens and classify error codes', () => {
  resetEvents()
  const restore = setWriter(() => {})
  track('rejoin_failed', { roomCode: 'ZZZZZZ', playerToken: 'deadbeef', playerName: 'Ana' })
  restore()
  const row = recentEvents().at(-1)
  assert.equal(row.event, 'rejoin_failed')
  assert.equal(row.playerToken, undefined)
  assert.equal(row.playerName, undefined)
  assert.equal(row.roomCode, undefined)
  assert.equal(row.roomHash, hashRoom('ZZZZZZ'))
  assert.equal(errorCode('Sala não encontrada'), 'room_not_found')
  assert.equal(errorCode('Sessão inválida'), 'invalid_session')
  assert.equal(errorCode('Este modo online está desligado neste servidor'), 'mode_disabled')
})

test('health payload is live without Mongo; ready is false when db is down', () => {
  const live = healthPayload()
  assert.equal(live.status, 'ok')
  assert.equal(live.wsPolicy, WS_POLICY)
  assert.equal(live.roomsEphemeral, true)
  const ready = readyPayload({ cards: 2, mw: 0, aldeia: 1, mememix: 0 })
  assert.equal(ready.ready, false)
  assert.equal(ready.db, 'disconnected')
  assert.equal(ready.rooms.cards, 2)
  assert.equal(ready.rooms.aldeia, 1)
})

test('online feature flags default on and can disable a mode', () => {
  assert.deepEqual(onlineFlags({}), { cards: true, aldeia: true, mememix: true, mw: true })
  const off = assertModeEnabled('aldeia', { FEATURE_ALDEIA_ONLINE: '0' })
  assert.equal(off.ok, false)
  assert.equal(off.error, DISABLED_MESSAGE)
  assert.equal(assertModeEnabled('cards', { FEATURE_CARDS_ONLINE: 'true' }).ok, true)
})

test('mongo stale filters match the documented TTLs', () => {
  const now = 1_700_000_000_000
  assert.equal(staleLobbyFilter(now).createdAt.$lt.getTime(), now - LOBBY_TTL_MS)
  assert.equal(staleCardRoomFilter(now).createdAt.$lt.getTime(), now - CARDROOM_TTL_MS)
})

test('AI daily rate-limit Map prunes previous days', () => {
  aiDailyHits.clear()
  aiDailyHits.set('1999-01-01:1.1.1.1', 3)
  const today = new Date().toISOString().slice(0, 10)
  aiDailyHits.set(`${today}:2.2.2.2`, 1)
  pruneAiDailyHits()
  assert.equal(aiDailyHits.has('1999-01-01:1.1.1.1'), false)
  assert.equal(aiDailyHits.has(`${today}:2.2.2.2`), true)
  aiDailyHits.clear()
})

function wait(socket, event, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, onEvent)
      reject(new Error(`timeout waiting for ${event}`))
    }, timeoutMs)
    function onEvent(payload) {
      clearTimeout(timer)
      resolve(payload)
    }
    socket.once(event, onEvent)
  })
}

test('disabled Cards online mode rejects create_room', async () => {
  process.env.FEATURE_CARDS_ONLINE = '0'
  const httpServer = http.createServer()
  let io
  try {
    io = initWebSocket(httpServer, { corsOrigin: true })
    await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve))
    const url = `http://127.0.0.1:${httpServer.address().port}`
    const socket = ioc(url, { transports: ['websocket'], forceNew: true, reconnection: false })
    await wait(socket, 'connect')
    socket.emit('create_room', { playerName: 'Ana' })
    const err = await wait(socket, 'error')
    assert.match(String(err), /desligado neste servidor/)
    socket.disconnect()
    wsTest.resetInMemoryRooms()
  } finally {
    delete process.env.FEATURE_CARDS_ONLINE
    if (io) await new Promise((resolve) => io.close(resolve))
    if (httpServer.listening) await new Promise((resolve) => httpServer.close(resolve))
  }
})
