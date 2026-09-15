const test = require('node:test')
const assert = require('node:assert/strict')

const { _test: websocketHelpers } = require('../websocket')
const { _test: aldeiaHelpers } = require('../lib/aldeiaMixSocket')
const { isAuthorizedMemeViewer } = require('../lib/mememixSocket')
const { isValidNightPick } = require('../lib/aldeiaMix')

test('Mister White quorum ignores disconnected and eliminated players', () => {
  const room = {
    players: [
      { id: 'a', disconnected: false },
      { id: null, disconnected: true },
      { id: 'c', disconnected: false },
    ],
    eliminated: [2],
    votes: { a: 1, oldB: 0, c: 0 },
  }

  assert.equal(websocketHelpers.connectedMwActiveCount(room), 1)
  assert.equal(websocketHelpers.connectedMwVotesCast(room), 1)
})

test('AldeiaMix dead players cannot vote or be voted', () => {
  const room = {
    players: [
      { id: 'n', name: 'Narrador', disconnected: false },
      { id: 'a', name: 'Ana', disconnected: false },
      { id: 'b', name: 'Bruno', disconnected: false },
      { id: 'c', name: 'Carla', disconnected: false },
    ],
    roles: [
      { name: 'Narrador', role: 'narrador' },
      { name: 'Ana', role: 'aldeao' },
      { name: 'Bruno', role: 'lobo' },
      { name: 'Carla', role: 'aldeao' },
    ],
    eliminated: [2],
    dayVotes: { Ana: 2, Bruno: 1, Carla: 1 },
  }

  assert.deepEqual(aldeiaHelpers.aliveVoters(room).map((p) => p.name), ['Ana', 'Carla'])
  assert.equal(aldeiaHelpers.countValidVotes(room), 2)
  assert.deepEqual(aldeiaHelpers.connectedDayVotes(room), { Ana: 2, Carla: 1 })

  const { computeVoteCounts } = require('../lib/aldeiaMix')
  assert.deepEqual(computeVoteCounts(aldeiaHelpers.connectedDayVotes(room), room.roles, room.eliminated), { 1: 1 })
})

test('AldeiaMix day quorum and votes only include connected players', () => {
  const room = {
    players: [
      { id: 'n', name: 'Narrador', disconnected: false },
      { id: 'a', name: 'Ana', disconnected: false },
      { id: null, name: 'Bruno', disconnected: true },
      { id: 'c', name: 'Carla', disconnected: false },
    ],
    roles: [
      { name: 'Narrador', role: 'narrador' },
      { name: 'Ana', role: 'aldeao' },
      { name: 'Bruno', role: 'lobo' },
      { name: 'Carla', role: 'aldeao' },
    ],
    eliminated: [],
    dayVotes: { Ana: 2, Bruno: 1, Carla: 2 },
  }

  assert.deepEqual(aldeiaHelpers.aliveVoters(room).map((p) => p.name), ['Ana', 'Carla'])
  assert.equal(aldeiaHelpers.countValidVotes(room), 2)
  assert.deepEqual(aldeiaHelpers.connectedDayVotes(room), { Ana: 2, Carla: 2 })
})

test('Cards promotes connected host and czar', () => {
  const room = {
    host: 'Ana',
    czarIdx: 0,
    players: [
      { id: null, name: 'Ana', disconnected: true },
      { id: 'b', name: 'Bruno', disconnected: false },
      { id: 'c', name: 'Carla', disconnected: false },
    ],
    submissions: { Bruno: { text: 'carta' }, Carla: { text: 'outra' } },
  }

  assert.equal(websocketHelpers.promoteCardsHostIfNeeded(room), true)
  assert.equal(room.host, 'Bruno')
  assert.equal(websocketHelpers.ensureConnectedCardsCzar(room), true)
  assert.equal(room.czarIdx, 1)
  assert.equal(room.submissions.Bruno, undefined)
})

test('Mister White promotes the first connected player and keeps the new host after old host rejoins', () => {
  const room = {
    host: 'Ana',
    hostId: 'old-a',
    players: [
      { id: null, name: 'Ana', disconnected: true },
      { id: 'b', name: 'Bruno', disconnected: false },
      { id: 'c', name: 'Carla', disconnected: false },
    ],
  }

  assert.equal(websocketHelpers.promoteMwHostIfNeeded(room), true)
  assert.equal(room.host, 'Bruno')
  assert.equal(room.hostId, 'b')

  room.players[0].id = 'new-a'
  room.players[0].disconnected = false
  assert.equal(websocketHelpers.promoteMwHostIfNeeded(room), false)
  assert.equal(room.host, 'Bruno')
  assert.equal(room.hostId, 'b')
})

test('MemeMix image access requires the token owner to be connected on the same socket', () => {
  const room = {
    players: [
      { id: 'socket-a', name: 'Ana', disconnected: false },
      { id: null, name: 'Bruno', disconnected: true },
    ],
  }

  assert.equal(isAuthorizedMemeViewer(room, { socketId: 'socket-a', playerName: 'Ana' }), true)
  assert.equal(isAuthorizedMemeViewer(room, { socketId: 'old-a', playerName: 'Ana' }), false)
  assert.equal(isAuthorizedMemeViewer(room, { socketId: 'socket-a', playerName: 'Bruno' }), false)
  assert.equal(isAuthorizedMemeViewer(room, { socketId: 'old-b', playerName: 'Bruno' }), false)
})

test('Cards skip pending sits out missing submitters and ignores them in the quorum', () => {
  const room = {
    czarIdx: 0,
    players: [
      { id: 'a', name: 'Ana', disconnected: false },
      { id: 'b', name: 'Bruno', disconnected: false },
      { id: 'c', name: 'Carla', disconnected: false },
      { id: 'd', name: 'Diogo', disconnected: false, sittingOut: false },
    ],
    submissions: { Bruno: { text: 'carta' } },
  }

  assert.equal(websocketHelpers.skipPendingCardsPlayers(room), 2)
  assert.equal(room.players[2].sittingOut, true)
  assert.equal(room.players[3].sittingOut, true)
  assert.deepEqual(websocketHelpers.cardsNonCzarInPlay(room).map((p) => p.name), ['Bruno'])
})

test('MemeMix expected submissions skip sitting-out players', () => {
  const { memePlayersExpected, skipPendingMemePlayers, allExpectedHaveSubmitted } = require('../lib/mememixSocket')
  const room = {
    juizIdx: 0,
    players: [
      { id: 'j', name: 'Juiz', disconnected: false },
      { id: 'a', name: 'Ana', disconnected: false },
      { id: 'b', name: 'Bruno', disconnected: false },
      { id: 'c', name: 'Carla', disconnected: false },
    ],
    submissions: { a: { text: 'lol' } },
  }

  assert.equal(memePlayersExpected(room).length, 3)
  assert.equal(allExpectedHaveSubmitted(room), false)
  assert.equal(skipPendingMemePlayers(room), 2)
  assert.equal(room.players[2].sittingOut, true)
  assert.equal(room.players[3].sittingOut, true)
  assert.equal(memePlayersExpected(room).length, 1)
  assert.equal(allExpectedHaveSubmitted(room), true)
})

test('MemeMix reveal ignores leftover submissions from disconnected players', () => {
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

test('AldeiaMix day votes reject out-of-range targets', () => {
  const { _test: aldeiaHelpers } = require('../lib/aldeiaMixSocket')
  const room = {
    juizIdx: 0,
    roles: [
      { name: 'Narrador', role: 'narrador' },
      { name: 'Ana', role: 'aldeao' },
      { name: 'Bruno', role: 'lobo' },
    ],
    eliminated: [],
  }
  assert.equal(aldeiaHelpers.isAlivePlayingTarget(room, 1), true)
  assert.equal(aldeiaHelpers.isAlivePlayingTarget(room, 0), false)
  assert.equal(aldeiaHelpers.isAlivePlayingTarget(room, 99), false)
  assert.equal(aldeiaHelpers.isAlivePlayingTarget(room, -1), false)
})

test('AldeiaMix night picks skip self-kill and self-investigate', () => {
  assert.equal(isValidNightPick('wolfTarget', 'lobo'), false)
  assert.equal(isValidNightPick('wolfTarget', 'aldeao'), true)
  assert.equal(isValidNightPick('wolfTarget', 'curandeira'), true)
  assert.equal(isValidNightPick('medicTarget', 'curandeira'), true)
  assert.equal(isValidNightPick('medicTarget', 'lobo'), true)
  assert.equal(isValidNightPick('medicTarget', 'narrador'), false)
  assert.equal(isValidNightPick('sheriffTarget', 'vidente'), false)
  assert.equal(isValidNightPick('sheriffTarget', 'lobo'), true)
})

test('MemeMix upload auth requires a connected named seat', () => {
  const { isAuthorizedMemeViewer } = require('../lib/mememixSocket')
  const room = {
    players: [
      { id: 'sock-1', name: 'Ana', disconnected: false },
      { id: null, name: 'Bruno', disconnected: true },
    ],
  }
  assert.equal(isAuthorizedMemeViewer(room, { socketId: 'sock-1', playerName: 'Ana' }), true)
  assert.equal(isAuthorizedMemeViewer(room, { socketId: 'sock-1', playerName: 'Bruno' }), false)
  assert.equal(isAuthorizedMemeViewer(room, { socketId: 'old', playerName: 'Bruno' }), false)
  assert.equal(isAuthorizedMemeViewer(room, { socketId: 'sock-1' }), false)
})

test('AldeiaMix isJuiz never treats a living playing role as narrator', () => {
  const { _test: aldeiaHelpers } = require('../lib/aldeiaMixSocket')
  const room = {
    juizIdx: 1,
    players: [
      { id: 'n', name: 'Narrador', disconnected: false },
      { id: 'w', name: 'Lobo', disconnected: false },
    ],
    roles: [
      { name: 'Narrador', role: 'narrador' },
      { name: 'Lobo', role: 'lobo' },
    ],
  }
  assert.equal(aldeiaHelpers.isJuiz(room, 'w'), false)
  room.juizIdx = 0
  assert.equal(aldeiaHelpers.isJuiz(room, 'n'), true)
  room.players[0].disconnected = true
  room.players[0].id = null
  assert.equal(aldeiaHelpers.isJuiz(room, 'n'), false)
})
