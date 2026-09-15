const assert = require('node:assert/strict')
const test = require('node:test')
const http = require('node:http')
const { io: ioc } = require('socket.io-client')

const { initWebSocket, _test: wsTest } = require('../websocket')
const { amRooms } = require('../lib/aldeiaMixSocket')
const { mmRooms } = require('../lib/mememixSocket')
const Card = require('../models/Card')

Card.find = () => ({ lean: async () => [] })

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

function connect(url) {
  return ioc(url, { transports: ['websocket'], forceNew: true, reconnection: false })
}

async function online(url) {
  const socket = connect(url)
  await wait(socket, 'connect')
  return socket
}

function deck() {
  return {
    black: ['____ um.', '____ dois.', '____ três.', '____ quatro.', '____ cinco.'],
    white: Array.from({ length: 14 }, (_, i) => `carta-${i}`),
  }
}

function clearMaps() {
  wsTest.resetInMemoryRooms()
  for (const key of Object.keys(amRooms)) delete amRooms[key]
  for (const key of Object.keys(mmRooms)) delete mmRooms[key]
}

let httpServer
let io
let url

test.before(async () => {
  httpServer = http.createServer()
  io = initWebSocket(httpServer, { corsOrigin: true })
  await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve))
  url = `http://127.0.0.1:${httpServer.address().port}`
})

test.after(async () => {
  if (io) await new Promise((resolve) => io.close(resolve))
  if (httpServer?.listening) {
    await new Promise((resolve) => httpServer.close(resolve))
  }
})

test.beforeEach(clearMaps)

test('P2 same socket cannot occupy two seats in a Cards room', async () => {
  const socket = await online(url)
  socket.emit('create_room', { playerName: 'Ana' })
  const created = await wait(socket, 'room_created')
  socket.emit('join_room', { code: created.code, playerName: 'Bruno' })
  const err = await wait(socket, 'error')
  assert.match(String(err), /Já estás nesta sala/)
  socket.disconnect()
})

test('P1 Aldeia narrator disconnect does not hand role map to a living player', async () => {
  const host = await online(url)
  const p2 = await online(url)
  const p3 = await online(url)
  const p4 = await online(url)

  host.emit('am_create_room', { playerName: 'Host' })
  const created = await wait(host, 'am_room_created')
  const code = created.code

  p2.emit('am_join_room', { code, playerName: 'Ana' })
  p3.emit('am_join_room', { code, playerName: 'Bruno' })
  p4.emit('am_join_room', { code, playerName: 'Carla' })
  await Promise.all([wait(p2, 'am_room_joined'), wait(p3, 'am_room_joined'), wait(p4, 'am_room_joined')])

  host.emit('am_start_game', { code })
  await wait(host, 'am_game_started')

  const room = amRooms[code]
  const juizIdx = room.juizIdx
  const juizName = room.players[juizIdx].name
  const juizSocket = [host, p2, p3, p4].find((s, i) => {
    const names = ['Host', 'Ana', 'Bruno', 'Carla']
    return names[i] === juizName
  }) || host

  let leaked = false
  for (const s of [host, p2, p3, p4]) {
    if (s === juizSocket) continue
    s.on('am_narrator_state', (payload) => {
      if (payload?.roleByIdx) leaked = true
    })
  }

  juizSocket.disconnect()
  await new Promise((r) => setTimeout(r, 80))

  assert.equal(amRooms[code].juizIdx, juizIdx)
  assert.equal(leaked, false)
  assert.equal(amRooms[code].players[juizIdx].disconnected, true)

  for (const s of [host, p2, p3, p4]) {
    if (s.connected) s.disconnect()
  }
})

test('P3 MemeMix rejoin with a bad upload token does not steal the seat', async () => {
  const socket = await online(url)
  socket.emit('mm_create_room', { playerName: 'Ana' })
  const created = await wait(socket, 'mm_room_created')
  const { code, playerToken } = created
  socket.disconnect()
  await new Promise((r) => setTimeout(r, 50))

  const attacker = await online(url)
  attacker.emit('mm_rejoin_room', {
    code,
    playerName: 'Ana',
    playerToken,
    uploadToken: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
  })
  const err = await wait(attacker, 'error')
  assert.match(String(err), /Sessão inválida/)
  const player = mmRooms[code].players.find((p) => p.name === 'Ana')
  assert.equal(player.disconnected, true)
  assert.notEqual(player.id, attacker.id)
  attacker.disconnect()
})

test('P4 MemeMix reveal ignores leftover submissions from disconnected players', async () => {
  const { allExpectedHaveSubmitted } = require('../lib/mememixSocket')
  const room = {
    juizIdx: 0,
    players: [
      { id: 'j', name: 'Juiz', disconnected: false },
      { id: null, name: 'Ana', disconnected: true },
      { id: 'b', name: 'Bruno', disconnected: false },
      { id: 'c', name: 'Carla', disconnected: false },
    ],
    submissions: { a: { text: 'old' }, b: { text: 'ok' } },
  }
  assert.equal(allExpectedHaveSubmitted(room), false)
})

test('P5 Cards start while playing is rejected; second start does not reshuffle', async () => {
  const host = await online(url)
  const guest = await online(url)
  host.emit('create_room', { playerName: 'Ana' })
  const created = await wait(host, 'room_created')
  guest.emit('join_room', { code: created.code, playerName: 'Bruno' })
  await wait(guest, 'room_joined')

  host.emit('start_game', { code: created.code, cardData: deck() })
  await wait(host, 'game_started')
  const firstBlack = wsTest.rooms[created.code].blackCard

  host.emit('start_game', { code: created.code, cardData: deck() })
  const err = await wait(host, 'error')
  assert.match(String(err), /já está a decorrer/)
  assert.equal(wsTest.rooms[created.code].blackCard, firstBlack)
  host.disconnect()
  guest.disconnect()
})

test('P5 MW join is blocked while the room is starting', async () => {
  const host = await online(url)
  host.emit('mw_create_room', {
    playerName: 'Host',
    settings: { wordPacks: ['sala'], customPairs: [{ civil: 'Casa', undercover: 'Apartamento' }], numMW: 1, numUndercover: 0 },
  })
  const created = await wait(host, 'mw_room_created')
  wsTest.mwRooms[created.code].status = 'starting'
  const guest = await online(url)
  guest.emit('mw_join_room', { code: created.code, playerName: 'Ana' })
  const err = await wait(guest, 'error')
  assert.match(String(err), /Jogo já começou/)
  host.disconnect()
  guest.disconnect()
})

test('P5 MM start while already starting/playing is rejected', async () => {
  const host = await online(url)
  const guest = await online(url)
  host.emit('mm_create_room', {
    playerName: 'Ana',
    settings: { legendaMode: 'escritas', includeOfficialMemes: false },
  })
  const created = await wait(host, 'mm_room_created')
  guest.emit('mm_join_room', { code: created.code, playerName: 'Bruno' })
  await wait(guest, 'mm_room_joined')
  mmRooms[created.code].memes = [
    { id: '1', url: `/api/mememix/rooms/${created.code}/memes/1` },
    { id: '2', url: `/api/mememix/rooms/${created.code}/memes/2` },
    { id: '3', url: `/api/mememix/rooms/${created.code}/memes/3` },
  ]

  host.emit('mm_start_game', { code: created.code })
  await wait(host, 'mm_game_started')
  const firstJuiz = mmRooms[created.code].juizIdx
  host.emit('mm_start_game', { code: created.code })
  const err = await wait(host, 'error')
  assert.match(String(err), /já está a decorrer/)
  assert.equal(mmRooms[created.code].juizIdx, firstJuiz)
  host.disconnect()
  guest.disconnect()
})

test('P5 MW start while already starting/playing is rejected', async () => {
  const host = await online(url)
  const a = await online(url)
  const b = await online(url)
  host.emit('mw_create_room', {
    playerName: 'Host',
    settings: { wordPacks: ['sala'], customPairs: [{ civil: 'Casa', undercover: 'Apartamento' }], numMW: 1, numUndercover: 0 },
  })
  const created = await wait(host, 'mw_room_created')
  a.emit('mw_join_room', { code: created.code, playerName: 'Ana' })
  b.emit('mw_join_room', { code: created.code, playerName: 'Bruno' })
  await Promise.all([wait(a, 'mw_room_joined'), wait(b, 'mw_room_joined')])

  host.emit('mw_start_game', { code: created.code })
  await wait(host, 'mw_game_started')
  host.emit('mw_start_game', { code: created.code })
  const err = await wait(host, 'error')
  assert.match(String(err), /já está a decorrer/)
  host.disconnect()
  a.disconnect()
  b.disconnect()
})

test('P6 Aldeia and MemeMix rooms survive the last disconnect', async () => {
  const am = await online(url)
  am.emit('am_create_room', { playerName: 'Ana' })
  const amCreated = await wait(am, 'am_room_created')
  am.disconnect()
  await new Promise((r) => setTimeout(r, 50))
  assert.ok(amRooms[amCreated.code])
  assert.equal(amRooms[amCreated.code].players[0].disconnected, true)

  const mm = await online(url)
  mm.emit('mm_create_room', { playerName: 'Ana' })
  const mmCreated = await wait(mm, 'mm_room_created')
  mm.disconnect()
  await new Promise((r) => setTimeout(r, 50))
  assert.ok(mmRooms[mmCreated.code])
  assert.equal(mmRooms[mmCreated.code].players[0].disconnected, true)
})

test('P8 Cards pick_winner rejects self, unrevealed, and double pick', async () => {
  const host = await online(url)
  const guest = await online(url)
  host.emit('create_room', { playerName: 'Ana' })
  const created = await wait(host, 'room_created')
  guest.emit('join_room', { code: created.code, playerName: 'Bruno' })
  await wait(guest, 'room_joined')
  host.emit('start_game', { code: created.code, cardData: deck() })
  await wait(host, 'game_started')

  const room = wsTest.rooms[created.code]
  const czar = room.players[room.czarIdx]
  const czarSocket = czar.name === 'Ana' ? host : guest
  const other = czar.name === 'Ana' ? guest : host
  const otherName = czar.name === 'Ana' ? 'Bruno' : 'Ana'

  czarSocket.emit('pick_winner', { code: created.code, winnerId: otherName })
  await new Promise((r) => setTimeout(r, 40))
  assert.equal(room.roundWinner, null)

  const submitter = other
  const handEvent = wait(submitter, 'your_hand')
  submitter.emit('submit_card', { code: created.code, cardText: room.hands[otherName][0] })
  await handEvent

  czarSocket.emit('reveal_cards', { code: created.code })
  await wait(czarSocket, 'cards_revealed')

  czarSocket.emit('pick_winner', { code: created.code, winnerId: czar.name })
  await new Promise((r) => setTimeout(r, 40))
  assert.equal(room.roundWinner, null)

  czarSocket.emit('pick_winner', { code: created.code, winnerId: otherName })
  await wait(czarSocket, 'round_ended')
  assert.equal(room.roundWinner, otherName)
  const score = room.players.find((p) => p.name === otherName).score
  czarSocket.emit('pick_winner', { code: created.code, winnerId: otherName })
  await new Promise((r) => setTimeout(r, 40))
  assert.equal(room.players.find((p) => p.name === otherName).score, score)

  host.disconnect()
  guest.disconnect()
})

test('P14 mw_eliminate cannot pick an arbitrary target', async () => {
  const host = await online(url)
  const a = await online(url)
  const b = await online(url)
  host.emit('mw_create_room', {
    playerName: 'Host',
    settings: { wordPacks: ['sala'], customPairs: [{ civil: 'Sol', undercover: 'Lua' }], numMW: 1, numUndercover: 0 },
  })
  const created = await wait(host, 'mw_room_created')
  a.emit('mw_join_room', { code: created.code, playerName: 'Ana' })
  b.emit('mw_join_room', { code: created.code, playerName: 'Bruno' })
  await Promise.all([wait(a, 'mw_room_joined'), wait(b, 'mw_room_joined')])
  host.emit('mw_start_game', { code: created.code })
  await wait(host, 'mw_game_started')

  const room = wsTest.mwRooms[created.code]
  const before = [...(room.eliminated || [])]
  host.emit('mw_eliminate', { code: created.code, targetOrigIdx: 2 })
  await new Promise((r) => setTimeout(r, 40))
  assert.equal(room.status, 'reveal')
  assert.deepEqual(room.eliminated || [], before)

  host.disconnect()
  a.disconnect()
  b.disconnect()
})

test('P10 Aldeia out-of-range votes are ignored', async () => {
  const { _test: aldeia } = require('../lib/aldeiaMixSocket')
  const room = {
    juizIdx: 0,
    roles: [
      { name: 'Narrador', role: 'narrador' },
      { name: 'Ana', role: 'aldeao' },
    ],
    eliminated: [],
  }
  assert.equal(aldeia.isAlivePlayingTarget(room, 99), false)
  assert.equal(aldeia.isAlivePlayingTarget(room, 0), false)
  assert.equal(aldeia.isAlivePlayingTarget(room, 1), true)
})
