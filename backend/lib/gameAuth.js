const crypto = require('crypto')

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const ROOM_CODE_LEN = 6
const MAX_ROOMS = 400
const ROOM_TTL_MS = 4 * 60 * 60 * 1000
const EMPTY_ROOM_TTL_MS = 30 * 60 * 1000
const MAX_DECK_CARDS = 400
const MAX_CARD_TEXT = 300

function generateRoomCode() {
  const bytes = crypto.randomBytes(ROOM_CODE_LEN)
  let out = ''
  for (let i = 0; i < ROOM_CODE_LEN; i += 1) {
    out += ROOM_CODE_ALPHABET[bytes[i] % ROOM_CODE_ALPHABET.length]
  }
  return out
}

function allocRoomCode(maps) {
  const lists = Array.isArray(maps) ? maps : [maps]
  for (let i = 0; i < 24; i += 1) {
    const code = generateRoomCode()
    if (lists.every((map) => !map[code])) return code
  }
  return null
}

function generatePlayerToken() {
  return crypto.randomBytes(24).toString('hex')
}

function generateHostSecret() {
  return crypto.randomBytes(24).toString('hex')
}

function tokensEqual(a, b) {
  const x = Buffer.from(String(a || ''), 'utf8')
  const y = Buffer.from(String(b || ''), 'utf8')
  if (x.length === 0 || x.length !== y.length) return false
  return crypto.timingSafeEqual(x, y)
}

function normalizePlayerName(name) {
  return String(name || '')
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .slice(0, 20)
}

function touchRoom(room) {
  if (room) room.touchedAt = Date.now()
  return room
}

function isInPlay(p) {
  return Boolean(p?.id && !p.disconnected && !p.sittingOut)
}

function publicPlayers(players, extra = {}) {
  return (players || []).map((p) => ({
    name: p.name,
    disconnected: Boolean(p.disconnected),
    sittingOut: Boolean(p.sittingOut),
    ...(p.score != null ? { score: p.score } : {}),
    ...extra,
  }))
}

function findConnectedPlayer(room, socketId) {
  return (room?.players || []).find((p) => p.id === socketId && !p.disconnected) || null
}

function socketSeatedIn(room, socketId) {
  return Boolean(findConnectedPlayer(room, socketId))
}

function markSocketDisconnected(room, socketId) {
  const player = (room?.players || []).find((p) => p.id === socketId)
  if (!player) return null
  player.disconnected = true
  player.previousSocketId = socketId
  player.id = null
  return player
}

function detachSocketFromRooms(rooms, socketId, exceptCode = null) {
  const skip = exceptCode ? String(exceptCode).toUpperCase() : null
  const affected = []
  for (const [code, room] of Object.entries(rooms || {})) {
    if (skip && code === skip) continue
    if (markSocketDisconnected(room, socketId)) affected.push(room)
  }
  return affected
}

function firstInPlayIdx(room) {
  return (room?.players || []).findIndex((p) => isInPlay(p))
}

function dropDisconnectedPlayers(room) {
  if (!Array.isArray(room?.players)) return
  const juizName = room.players[room.juizIdx]?.name
  const hostName = room.host
  const next = room.players.filter((p) => p.id && !p.disconnected)
  if (next.length === room.players.length) return
  room.players = next
  if (juizName != null) {
    const idx = room.players.findIndex((p) => p.name === juizName)
    room.juizIdx = idx >= 0 ? idx : Math.max(0, firstInPlayIdx(room))
  }
  if (hostName) {
    const host = room.players.find((p) => p.name === hostName)
    if (host) {
      room.host = host.name
      if (host.id) room.hostId = host.id
    } else if (room.players[0]) {
      room.host = room.players[0].name
      room.hostId = room.players[0].id
    }
  }
}

function authorizeRejoin(room, { playerName, playerToken, socketId }) {
  const name = normalizePlayerName(playerName)
  if (!room || !name) return { ok: false, error: 'Sala não encontrada' }
  const existing = room.players.find((p) => p.name === name)
  if (!existing) return { ok: false, error: 'Não estavas nesta sala' }
  if (!tokensEqual(existing.token, playerToken)) return { ok: false, error: 'Sessão inválida' }
  const seated = findConnectedPlayer(room, socketId)
  if (seated && seated.name !== name) return { ok: false, error: 'Já estás nesta sala' }
  if (!existing.disconnected && existing.id && existing.id !== socketId) {
    return { ok: false, error: 'Este jogador ainda está ligado' }
  }
  return { ok: true, player: existing }
}

function isHostSocket(room, socketId) {
  const actor = findConnectedPlayer(room, socketId)
  return Boolean(actor && room.host === actor.name)
}

function roomsAtCapacity(map) {
  return Object.keys(map || {}).length >= MAX_ROOMS
}

function sanitizeDeck(arr, { max = MAX_DECK_CARDS, maxLen = MAX_CARD_TEXT } = {}) {
  if (!Array.isArray(arr)) return []
  return arr
    .slice(0, max)
    .map((card) => String(card ?? '').replace(/<[^>]*>/g, '').trim().slice(0, maxLen))
    .filter(Boolean)
}

function guessMatchesWord(guess, word) {
  const g = String(guess || '').toLowerCase().trim()
  const w = String(word || '').toLowerCase().trim()
  return g.length > 0 && g === w
}

function cardsInHand(hand, submitted) {
  const available = [...(hand || [])]
  for (const card of submitted) {
    const idx = available.indexOf(card)
    if (idx < 0) return false
    available.splice(idx, 1)
  }
  return true
}

function removeCardsFromHand(hand, submitted) {
  const next = [...(hand || [])]
  for (const card of submitted) {
    const idx = next.indexOf(card)
    if (idx >= 0) next.splice(idx, 1)
  }
  return next
}

function createSocketRateLimiter({ windowMs = 10_000, max = 50 } = {}) {
  const hits = new Map()
  function prune(now = Date.now()) {
    for (const [id, times] of hits) {
      const fresh = (times || []).filter((t) => now - t < windowMs)
      if (!fresh.length) hits.delete(id)
      else hits.set(id, fresh)
    }
    return hits.size
  }
  function allow(socketId) {
    const now = Date.now()
    const prev = hits.get(socketId) || []
    const fresh = prev.filter((t) => now - t < windowMs)
    if (!fresh.length) hits.delete(socketId)
    if (fresh.length >= max) {
      hits.set(socketId, fresh)
      return false
    }
    fresh.push(now)
    hits.set(socketId, fresh)
    return true
  }
  allow.prune = prune
  allow.size = () => hits.size
  const timer = setInterval(() => prune(), Math.max(windowMs, 30_000))
  if (typeof timer.unref === 'function') timer.unref()
  return allow
}

function startRoomGc(rooms, { onDestroy } = {}) {
  const timer = setInterval(() => {
    const now = Date.now()
    const entries = Object.entries(rooms)
    for (const [code, room] of entries) {
      const touched = room.touchedAt || 0
      const connected = (room.players || []).some((p) => p.id && !p.disconnected)
      const expired = now - touched > ROOM_TTL_MS
      const emptyExpired = !connected && now - touched > EMPTY_ROOM_TTL_MS
      if (expired || emptyExpired) {
        try { onDestroy?.(room) } catch { /* ignore */ }
        delete rooms[code]
      }
    }
    const left = Object.entries(rooms)
    if (left.length > MAX_ROOMS) {
      left.sort((a, b) => (a[1].touchedAt || 0) - (b[1].touchedAt || 0))
      const overflow = left.length - MAX_ROOMS
      for (let i = 0; i < overflow; i += 1) {
        try { onDestroy?.(left[i][1]) } catch { /* ignore */ }
        delete rooms[left[i][0]]
      }
    }
  }, 60_000)
  if (typeof timer.unref === 'function') timer.unref()
  return timer
}

function weakSecret(value, { min = 12, banned = ['change-me'] } = {}) {
  const v = String(value || '')
  if (v.length < min) return true
  const lower = v.toLowerCase()
  return banned.some((b) => lower === b || lower.includes(b))
}

module.exports = {
  MAX_ROOMS,
  ROOM_CODE_LEN,
  allocRoomCode,
  authorizeRejoin,
  cardsInHand,
  createSocketRateLimiter,
  detachSocketFromRooms,
  dropDisconnectedPlayers,
  findConnectedPlayer,
  firstInPlayIdx,
  generateHostSecret,
  isInPlay,
  generatePlayerToken,
  generateRoomCode,
  guessMatchesWord,
  isHostSocket,
  markSocketDisconnected,
  normalizePlayerName,
  publicPlayers,
  removeCardsFromHand,
  roomsAtCapacity,
  sanitizeDeck,
  socketSeatedIn,
  startRoomGc,
  tokensEqual,
  touchRoom,
  weakSecret,
}
