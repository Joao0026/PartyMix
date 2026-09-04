const crypto = require('crypto')
const { badRequest } = require('./validate')

const VOTER_ID_RE = /^[A-Za-z0-9_-]{20,80}$/
const COOKIE = 'pm_vid'

function parseCookie(header, name) {
  const raw = String(header || '')
  const parts = raw.split(';')
  for (const part of parts) {
    const [k, ...rest] = part.trim().split('=')
    if (k === name) return decodeURIComponent(rest.join('=') || '')
  }
  return ''
}

function setVoterCookie(res, voterId) {
  const secure = process.env.NODE_ENV === 'production'
  const sameSite = secure ? 'None' : 'Lax'
  const flags = [
    `${COOKIE}=${encodeURIComponent(voterId)}`,
    'HttpOnly',
    'Path=/',
    'Max-Age=31536000',
    `SameSite=${sameSite}`,
  ]
  if (secure) flags.push('Secure')
  res.append('Set-Cookie', flags.join('; '))
}

function resolveVoterId(req, res) {
  const fromCookie = parseCookie(req.headers.cookie, COOKIE)
  if (VOTER_ID_RE.test(fromCookie)) return fromCookie

  if (process.env.NODE_ENV !== 'production') {
    const raw = req.body?.voterId ?? req.body?.voter_id ?? req.headers['x-voter-id']
    const voterId = typeof raw === 'string' ? raw.trim() : ''
    if (VOTER_ID_RE.test(voterId)) {
      setVoterCookie(res, voterId)
      return voterId
    }
  }

  const id = crypto.randomBytes(16).toString('hex')
  setVoterCookie(res, id)
  return id
}

function normalizeVoterId(body = {}, headers = {}) {
  const raw = body.voterId ?? body.voter_id ?? headers['x-voter-id']
  const voterId = typeof raw === 'string' ? raw.trim() : ''
  if (!VOTER_ID_RE.test(voterId)) {
    throw badRequest('voterId is invalid')
  }
  return voterId
}

function voteUpdate(voterId) {
  return {
    filter: { voters: { $ne: voterId } },
    update: {
      $addToSet: { voters: voterId },
      $inc: { votes: 1 },
    },
  }
}

function unvoteUpdate(voterId) {
  return {
    filter: { voters: voterId, votes: { $gt: 0 } },
    update: {
      $pull: { voters: voterId },
      $inc: { votes: -1 },
    },
  }
}

module.exports = {
  normalizeVoterId,
  resolveVoterId,
  unvoteUpdate,
  voteUpdate,
  VOTER_ID_RE,
}
