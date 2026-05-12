const jwt = require('jsonwebtoken')

module.exports = function requireAdmin(req, res, next) {
  const h = req.headers.authorization || ''
  const m = h.match(/^Bearer\s+(.+)$/i)
  if (!m) return res.status(401).json({ error: 'Unauthorized' })

  const secret = process.env.JWT_SECRET
  if (!secret) return res.status(503).json({ error: 'JWT_SECRET not configured on server' })

  try {
    const payload = jwt.verify(m[1], secret)
    if (payload.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
    req.admin = true
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}
