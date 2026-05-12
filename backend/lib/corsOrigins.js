/**
 * CORS allowlist from CORS_ORIGINS (comma-separated full origins, e.g. https://app.netlify.app).
 * Production without CORS_ORIGINS blocks unknown browser origins (set Render env before deploy).
 * Development without CORS_ORIGINS allows localhost / private LAN for Vite + mobile testing.
 */

function parseList() {
  return (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function isPrivateLanOrigin(origin) {
  return (
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin) ||
    /^https?:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/i.test(origin) ||
    /^https?:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/i.test(origin) ||
    /^https?:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}(:\d+)?$/i.test(origin)
  )
}

function expressCorsOptions() {
  const list = parseList()
  const isProd = process.env.NODE_ENV === 'production'

  return {
    origin(origin, cb) {
      if (!origin) return cb(null, true)
      if (list.length > 0) return cb(null, list.includes(origin))
      if (isProd) {
        console.warn('[CORS] CORS_ORIGINS empty in production — refusing unknown origins')
        return cb(null, false)
      }
      return cb(null, isPrivateLanOrigin(origin))
    },
  }
}

/** Socket.IO: array of origins, or true in dev when list empty (LAN regex not supported here). */
function socketIoCorsOrigin() {
  const list = parseList()
  if (list.length > 0) return list
  if (process.env.NODE_ENV === 'production') return false
  return true
}

module.exports = { expressCorsOptions, socketIoCorsOrigin, parseList }
