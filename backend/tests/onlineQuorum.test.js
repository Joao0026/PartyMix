const test = require('node:test')
const assert = require('node:assert/strict')

const { _test: websocketHelpers } = require('../websocket')
const { _test: aldeiaHelpers } = require('../lib/aldeiaMixSocket')
const { isAuthorizedMemeViewer } = require('../lib/mememixSocket')
const { isValidNightPick } = require('../lib/aldeiaMix')

test('Mister White quorum ignores grace-period players', () => {
  const room = {
    players: [
      { id: 'a', disconnected: false },
      { id: 'b', disconnected: false, pendingDisconnect: true },
      { id: 'c', disconnected: false },
    ],
    eliminated: [],
    votes: { a: 2 },
  }
  assert.equal(websocketHelpers.connectedMwActiveCount(room), 2)
  assert.equal(websocketHelpers.connectedMwVotesCast(room), 1)
})

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

test('AldeiaMix ends when one wolf remains against one villager', () => {
  const { checkEndCondition } = require('../lib/aldeiaMix')
  const roles = [
    { name: 'Narrador', role: 'narrador', isNarrator: true },
    { name: 'Ana', role: 'lobo' },
    { name: 'Bruno', role: 'aldeao' },
    { name: 'Carla', role: 'vidente' },
  ]
  assert.equal(checkEndCondition(roles, []), null)
  assert.equal(checkEndCondition(roles, [3]), 'lobos_win')
  assert.equal(checkEndCondition(roles, [1]), 'aldeoes_win')
  const twoWolves = [
    { name: 'Narrador', role: 'narrador', isNarrator: true },
    { name: 'Ana', role: 'lobo' },
    { name: 'Bruno', role: 'lobo' },
    { name: 'Carla', role: 'aldeao' },
  ]
  assert.equal(checkEndCondition(twoWolves, []), null)
  assert.equal(checkEndCondition(twoWolves, [3]), 'lobos_win')
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

test('AldeiaMix reveal advances when the last unreadied player is on grace', () => {
  const events = []
  const io = { to: () => ({ emit: (event, payload) => events.push({ event, payload }) }) }
  const room = {
    players: [
      { id: 'n', name: 'Narrador', disconnected: false },
      { id: 'a', name: 'Ana', disconnected: false },
      { id: 'b', name: 'Bruno', disconnected: false, pendingDisconnect: true },
    ],
    juizIdx: 0,
    roles: [
      { name: 'Narrador', role: 'narrador' },
      { name: 'Ana', role: 'aldeao' },
      { name: 'Bruno', role: 'lobo' },
    ],
    eliminated: [],
    status: 'reveal',
    revealReady: ['Ana'],
    settings: {},
  }
  aldeiaHelpers.afterAldeiaPlayerAway(io, room, 'ABC123')
  assert.equal(room.status, 'night')
  assert.equal(room.nightStep, 'sleep')
  assert.equal(aldeiaHelpers.playingReadyTotal(room), 1)
})

test('AldeiaMix day quorum ignores grace-period players', () => {
  const room = {
    players: [
      { id: 'n', name: 'Narrador', disconnected: false },
      { id: 'a', name: 'Ana', disconnected: false },
      { id: 'b', name: 'Bruno', disconnected: false, pendingDisconnect: true },
      { id: 'c', name: 'Carla', disconnected: false },
    ],
    roles: [
      { name: 'Narrador', role: 'narrador' },
      { name: 'Ana', role: 'aldeao' },
      { name: 'Bruno', role: 'lobo' },
      { name: 'Carla', role: 'aldeao' },
    ],
    eliminated: [],
    dayVotes: { Ana: 2 },
  }
  assert.deepEqual(aldeiaHelpers.aliveVoters(room).map((p) => p.name), ['Ana', 'Carla'])
  assert.equal(aldeiaHelpers.countValidVotes(room), 1)
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

test('MemeMix reveal shows captions in a locked shuffled order', () => {
  const { publicCaptionSubmissions, lockRevealOrder } = require('../lib/mememixSocket')
  const room = {
    juizIdx: 0,
    revealed: true,
    revealOrder: ['c', 'a', 'b'],
    players: [
      { id: 'j', name: 'Juiz', disconnected: false },
      { id: 'a', name: 'Ana', disconnected: false },
      { id: 'b', name: 'Bruno', disconnected: false },
      { id: 'c', name: 'Carla', disconnected: false },
    ],
    submissions: {
      a: { text: 'primeira' },
      b: { text: 'segunda' },
      c: { text: 'terceira' },
    },
  }
  assert.deepEqual(publicCaptionSubmissions(room).map((row) => row.text), ['terceira', 'primeira', 'segunda'])
  lockRevealOrder(room)
  assert.deepEqual(room.revealOrder, ['c', 'a', 'b'])
})

test('MemeMix reveal ignores leftover juiz captions and waits for the others', () => {
  const { liveCaptionCount, shouldRevealMemeRound, memePlayersExpected } = require('../lib/mememixSocket')
  const room = {
    juizIdx: 1,
    currentMeme: { id: 'm1' },
    revealed: false,
    players: [
      { id: 'a', name: 'Ana', disconnected: false },
      { id: 'b', name: 'Bruno', disconnected: false },
      { id: 'c', name: 'Carla', disconnected: false },
      { id: 'd', name: 'Diogo', disconnected: false },
    ],
    submissions: {
      b: { text: 'sou juiz agora' },
      a: { text: 'ana' },
    },
  }
  assert.equal(memePlayersExpected(room).length, 3)
  assert.equal(liveCaptionCount(room), 1)
  assert.equal(shouldRevealMemeRound(room), false)
  room.submissions.c = { text: 'carla' }
  room.submissions.d = { text: 'diogo' }
  assert.equal(liveCaptionCount(room), 3)
  assert.equal(shouldRevealMemeRound(room), true)
})

test('MemeMix expected submissions skip sitting-out players', () => {
  const { memePlayersExpected, skipPendingMemePlayers } = require('../lib/mememixSocket')
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
  assert.equal(skipPendingMemePlayers(room), 2)
  assert.equal(room.players[2].sittingOut, true)
  assert.equal(room.players[3].sittingOut, true)
  assert.equal(memePlayersExpected(room).length, 1)
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

test('Drink TV snapshot is read-only shaped and size limited', () => {
  const state = websocketHelpers.sanitizeDrinkTvState({
    phase: 'playing',
    turn: 7.9,
    reader: '<b>Ana</b>',
    card: {
      type: 'house',
      emoji: '🏠',
      title: 'Carta da casa',
      text: 'x'.repeat(900),
      choices: ['A', 'B', 'C', 'D', 'E'],
      secretMission: 'não pode sair',
    },
    activeDecks: Array.from({ length: 40 }, (_, index) => `deck-${index}`),
    rules: ['Sem nomes próprios'],
    hostToken: 'não pode sair',
  })

  assert.equal(state.turn, 7)
  assert.equal(state.card.text.length, 700)
  assert.equal(state.card.choices.length, 4)
  assert.equal(state.activeDecks.length, 30)
  assert.equal('secretMission' in state.card, false)
  assert.equal('hostToken' in state, false)
})
