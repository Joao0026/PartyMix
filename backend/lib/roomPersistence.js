const mongoose = require('mongoose')
const RoomSnapshot = require('../models/RoomSnapshot')
const { currentEpoch, adoptStartedAt } = require('./runtime')

const ROOM_TTL_MS = 4 * 60 * 60 * 1000
const MAX_PAYLOAD_CHARS = 1_500_000
const DROP_KEYS = new Set([
  'disconnectTimer', 'timer', 'interval', 'timeout',
  '_idleTimeout', '_idlePrev', '_idleNext', '_idleStart',
])

function cloneRoom(room) {
  if (!room || typeof room !== 'object') return null
  try {
    return JSON.parse(JSON.stringify(room, (key, value) => {
      if (DROP_KEYS.has(key)) return undefined
      if (typeof value === 'function' || typeof value === 'symbol') return undefined
      if (value instanceof Map || value instanceof Set) return undefined
      return value
    }))
  } catch {
    return null
  }
}

function reviveRoom(payload) {
  const room = cloneRoom(payload)
  if (!room) return null
  if (Array.isArray(room.players)) {
    room.players = room.players.map((player) => ({
      ...player,
      id: null,
      disconnected: true,
      pendingDisconnect: false,
    }))
  }
  if (room.hostId) room.hostId = null
  return room
}

function dbReady() {
  return mongoose.connection.readyState === 1
}

async function saveSnapshots(maps) {
  if (!dbReady()) return { saved: 0 }
  const epoch = currentEpoch()
  const keep = []
  let saved = 0
  for (const [game, rooms] of Object.entries(maps || {})) {
    const codes = []
    for (const room of Object.values(rooms || {})) {
      const code = String(room?.code || '').toUpperCase()
      if (!code) continue
      const payload = cloneRoom(room)
      if (!payload) continue
      const size = JSON.stringify(payload).length
      if (size > MAX_PAYLOAD_CHARS) continue
      codes.push(code)
      keep.push(RoomSnapshot.findOneAndUpdate(
        { game, code },
        { game, code, epoch, payload },
        { upsert: true },
      ))
      saved += 1
    }
    keep.push(RoomSnapshot.deleteMany({ game, code: { $nin: codes } }))
  }
  await Promise.all(keep)
  return { saved }
}

async function restoreSnapshots(maps) {
  if (!dbReady()) return { restored: 0 }
  const cutoff = new Date(Date.now() - ROOM_TTL_MS)
  const rows = await RoomSnapshot.find({ updatedAt: { $gt: cutoff } }).lean()
  if (!rows.length) return { restored: 0 }
  const newest = rows.reduce((best, row) => (
    !best || new Date(row.updatedAt) > new Date(best.updatedAt) ? row : best
  ), null)
  if (newest?.epoch) adoptStartedAt(newest.epoch)
  let restored = 0
  for (const row of rows) {
    const bucket = maps?.[row.game]
    if (!bucket || bucket[row.code]) continue
    const room = reviveRoom(row.payload)
    if (!room) continue
    room.code = row.code
    bucket[row.code] = room
    restored += 1
  }
  return { restored }
}

function startRoomAutosave(getMaps) {
  const timer = setInterval(() => {
    saveSnapshots(getMaps()).catch((err) => {
      console.error('Falha ao gravar salas:', err?.message || err)
    })
  }, 20_000)
  if (typeof timer.unref === 'function') timer.unref()
  return timer
}

module.exports = {
  cloneRoom,
  reviveRoom,
  saveSnapshots,
  restoreSnapshots,
  startRoomAutosave,
}
