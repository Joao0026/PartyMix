/** Sessões MemeMix — tokens upload + pastas temporárias */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const UPLOAD_ROOT = path.join(__dirname, '../../uploads/mememix')
const tokens = new Map()
const TOKEN_TTL_MS = 6 * 60 * 60 * 1000

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function roomDir(code) {
  return path.join(UPLOAD_ROOT, String(code).toUpperCase())
}

function createUploadToken(roomCode, socketId, playerName) {
  const token = crypto.randomBytes(24).toString('hex')
  tokens.set(token, {
    roomCode: String(roomCode).toUpperCase(),
    socketId,
    playerName: String(playerName || '').slice(0, 20),
    createdAt: Date.now(),
  })
  return token
}

function updateTokenSocketId(token, socketId) {
  const row = tokens.get(String(token || ''))
  if (!row) return false
  row.socketId = socketId
  row.createdAt = Date.now()
  return true
}

function verifyUploadToken(token, roomCode) {
  const row = tokens.get(String(token || ''))
  if (!row) return null
  if (Date.now() - row.createdAt > TOKEN_TTL_MS) {
    tokens.delete(token)
    return null
  }
  if (String(roomCode).toUpperCase() !== row.roomCode) return null
  return row
}

function revokeTokensForRoom(roomCode) {
  const code = String(roomCode).toUpperCase()
  for (const [token, row] of tokens.entries()) {
    if (row.roomCode === code) tokens.delete(token)
  }
}

function destroyMemeMixSession(code) {
  revokeTokensForRoom(code)
  const dir = roomDir(code)
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

function cleanupOrphanUploads(activeCodes) {
  ensureDir(UPLOAD_ROOT)
  const active = new Set([...activeCodes].map((c) => String(c).toUpperCase()))
  for (const name of fs.readdirSync(UPLOAD_ROOT)) {
    if (!active.has(name.toUpperCase())) {
      fs.rmSync(path.join(UPLOAD_ROOT, name), { recursive: true, force: true })
    }
  }
}

function saveMemeImage(roomCode, buffer, ext = '.webp') {
  const dir = roomDir(roomCode)
  ensureDir(dir)
  const id = crypto.randomBytes(8).toString('hex')
  const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext.toLowerCase()) ? ext.toLowerCase() : '.webp'
  const filename = `${id}${safeExt}`
  fs.writeFileSync(path.join(dir, filename), buffer)
  return { id, filename, url: `/api/mememix/rooms/${String(roomCode).toUpperCase()}/memes/${id}${safeExt}` }
}

function getMemeFilePath(roomCode, filename) {
  const base = path.basename(filename)
  const full = path.join(roomDir(roomCode), base)
  if (!full.startsWith(roomDir(roomCode))) return null
  if (!fs.existsSync(full)) return null
  return full
}

function deleteMemeImage(roomCode, memeId) {
  const id = String(memeId || '').trim()
  if (!id) return false
  const dir = roomDir(roomCode)
  if (!fs.existsSync(dir)) return false
  const safeId = id.replace(/[^a-f0-9]/gi, '')
  let deleted = false
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith(safeId)) {
      fs.unlinkSync(path.join(dir, name))
      deleted = true
    }
  }
  return deleted
}

module.exports = {
  UPLOAD_ROOT,
  ensureDir,
  createUploadToken,
  updateTokenSocketId,
  verifyUploadToken,
  destroyMemeMixSession,
  cleanupOrphanUploads,
  saveMemeImage,
  getMemeFilePath,
  deleteMemeImage,
  roomDir,
}
