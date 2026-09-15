/** Sessões MemeMix — tokens upload + pastas temporárias */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const UPLOAD_ROOT = path.join(__dirname, '../../uploads/mememix')
const tokens = new Map()
const TOKEN_TTL_MS = 6 * 60 * 60 * 1000
const VIEW_TTL_SEC = 15 * 60

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function roomDir(code) {
  return path.join(UPLOAD_ROOT, String(code).toUpperCase())
}

function viewSecret() {
  return process.env.JWT_SECRET || process.env.MEMEMIX_VIEW_SECRET || 'dev-mememix-view'
}

function signMemeView(roomCode, filename) {
  const exp = Math.floor(Date.now() / 1000) + VIEW_TTL_SEC
  const code = String(roomCode).toUpperCase()
  const file = path.basename(String(filename || ''))
  const msg = `${code}|${file}|${exp}`
  const sig = crypto.createHmac('sha256', viewSecret()).update(msg).digest('hex').slice(0, 32)
  return { exp, sig, file }
}

function verifyMemeView(roomCode, filename, exp, sig) {
  const expNum = Number(exp)
  if (!Number.isFinite(expNum) || expNum < Math.floor(Date.now() / 1000)) return false
  const expected = signMemeView(roomCode, filename)
  // re-sign with same exp
  const code = String(roomCode).toUpperCase()
  const file = path.basename(String(filename || ''))
  const msg = `${code}|${file}|${expNum}`
  const want = crypto.createHmac('sha256', viewSecret()).update(msg).digest('hex').slice(0, 32)
  const a = Buffer.from(String(sig || ''), 'utf8')
  const b = Buffer.from(want, 'utf8')
  if (a.length !== b.length || a.length === 0) return false
  return crypto.timingSafeEqual(a, b)
}

function memeViewUrl(roomCode, filename) {
  const { exp, sig, file } = signMemeView(roomCode, filename)
  return `/api/mememix/rooms/${String(roomCode).toUpperCase()}/memes/${file}?exp=${exp}&sig=${sig}`
}

function detectImageKind(buffer) {
  if (!buffer || buffer.length < 12) return null
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return '.jpg'
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return '.png'
  if (buffer.slice(0, 4).toString('ascii') === 'RIFF' && buffer.slice(8, 12).toString('ascii') === 'WEBP') return '.webp'
  return null
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

function rotateUploadToken(oldToken, socketId) {
  const row = tokens.get(String(oldToken || ''))
  if (!row) return null
  tokens.delete(String(oldToken))
  return createUploadToken(row.roomCode, socketId || row.socketId, row.playerName)
}

function updateTokenSocketId(token, socketId) {
  const row = tokens.get(String(token || ''))
  if (!row) return false
  row.socketId = socketId
  row.createdAt = Date.now()
  return true
}

function revokeUploadToken(token) {
  return tokens.delete(String(token || ''))
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

function cleanupStaleUploads(maxAgeMs = TOKEN_TTL_MS) {
  ensureDir(UPLOAD_ROOT)
  const now = Date.now()
  for (const name of fs.readdirSync(UPLOAD_ROOT)) {
    const full = path.join(UPLOAD_ROOT, name)
    let st
    try { st = fs.statSync(full) } catch { continue }
    if (now - st.mtimeMs > maxAgeMs) {
      fs.rmSync(full, { recursive: true, force: true })
    }
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
  rotateUploadToken,
  revokeUploadToken,
  verifyUploadToken,
  destroyMemeMixSession,
  cleanupOrphanUploads,
  cleanupStaleUploads,
  saveMemeImage,
  getMemeFilePath,
  deleteMemeImage,
  roomDir,
  memeViewUrl,
  verifyMemeView,
  detectImageKind,
}
