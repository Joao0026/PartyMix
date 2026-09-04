const COOKIE = 'pm_age'
const VALUES = new Set(['18', 'under'])

function parseCookie(header, name) {
  const raw = String(header || '')
  const parts = raw.split(';')
  for (const part of parts) {
    const [k, ...rest] = part.trim().split('=')
    if (k === name) return decodeURIComponent(rest.join('=') || '')
  }
  return ''
}

function readAge(req) {
  const fromCookie = parseCookie(req.headers.cookie, COOKIE)
  if (VALUES.has(fromCookie)) return fromCookie
  const header = String(req.headers['x-partymix-age'] || '').trim()
  if (header === 'under') return 'under'
  return null
}

function isUnder18(req) {
  return readAge(req) === 'under'
}

function cookieFlags(value, maxAge) {
  const secure = process.env.NODE_ENV === 'production'
  const sameSite = secure ? 'None' : 'Lax'
  const flags = [
    `${COOKIE}=${encodeURIComponent(value)}`,
    'HttpOnly',
    'Path=/',
    `Max-Age=${maxAge}`,
    `SameSite=${sameSite}`,
  ]
  if (secure) flags.push('Secure')
  return flags.join('; ')
}

function setAgeCookie(res, value) {
  if (!VALUES.has(value)) return
  res.append('Set-Cookie', cookieFlags(value, 31536000))
}

function clearAgeCookie(res) {
  res.append('Set-Cookie', cookieFlags('', 0))
}

function blockMinors(req, res, next) {
  if (isUnder18(req)) {
    return res.status(403).json({
      error: 'Conteúdo só para maiores de 18 anos.',
      code: 'AGE_RESTRICTED',
    })
  }
  return next()
}

module.exports = {
  COOKIE,
  readAge,
  isUnder18,
  setAgeCookie,
  clearAgeCookie,
  blockMinors,
}
