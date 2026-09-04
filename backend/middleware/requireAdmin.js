const jwt = require('jsonwebtoken')
const crypto = require('crypto')

const revoked = new Map()

function pruneRevoked() {
  const now = Date.now()
  for (const [jti, exp] of revoked.entries()) {
    if (exp <= now) revoked.delete(jti)
  }
}

function revokeJti(jti, expMs) {
  if (!jti) return
  revoked.set(jti, Number(expMs) || Date.now() + 12 * 60 * 60 * 1000)
}

function isRevoked(jti) {
  if (!jti) return true
  pruneRevoked()
  const exp = revoked.get(jti)
  if (exp == null) return false
  if (exp <= Date.now()) {
    revoked.delete(jti)
    return false
  }
  return true
}

function bearerToken(req) {
  const h = req.headers.authorization || ''
  const m = h.match(/^Bearer\s+(.+)$/i)
  return m ? m[1] : null
}

function verifyAdminToken(token) {
  const secret = process.env.JWT_SECRET
  if (!secret || !token) return null
  try {
    const payload = jwt.verify(token, secret)
    if (payload.role !== 'admin') return null
    if (isRevoked(payload.jti)) return null
    return payload
  } catch {
    return null
  }
}

function peekAdmin(req) {
  return verifyAdminToken(bearerToken(req))
}

function signAdminToken() {
  const secret = process.env.JWT_SECRET
  if (!secret) return null
  const jti = crypto.randomUUID()
  const token = jwt.sign({ role: 'admin', jti }, secret, { expiresIn: '12h' })
  return { token, jti }
}

function requireAdmin(req, res, next) {
  const h = req.headers.authorization || ''
  const m = h.match(/^Bearer\s+(.+)$/i)
  if (!m) return res.status(401).json({ error: 'Unauthorized' })

  const secret = process.env.JWT_SECRET
  if (!secret) return res.status(503).json({ error: 'JWT_SECRET not configured on server' })

  const payload = verifyAdminToken(m[1])
  if (!payload) return res.status(401).json({ error: 'Invalid or expired token' })
  req.admin = payload
  next()
}

module.exports = requireAdmin
module.exports.peekAdmin = peekAdmin
module.exports.signAdminToken = signAdminToken
module.exports.revokeJti = revokeJti
module.exports.verifyAdminToken = verifyAdminToken
