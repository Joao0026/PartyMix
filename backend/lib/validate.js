const mongoose = require('mongoose')

function badRequest(message) {
  const error = new Error(message)
  error.status = 400
  return error
}

function stripHtml(value) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
}

function cleanString(value, { field = 'value', max = 100, required = false, defaultValue = '' } = {}) {
  const cleaned = stripHtml(value).trim().slice(0, max)
  if (required && !cleaned) throw badRequest(`${field} is required`)
  return cleaned || defaultValue
}

function oneOf(value, allowed, { field = 'value', required = false, defaultValue } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw badRequest(`${field} is required`)
    return defaultValue
  }
  if (!allowed.includes(value)) throw badRequest(`${field} is invalid`)
  return value
}

function bool(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue
  if (typeof value === 'boolean') return value
  if (value === 'true') return true
  if (value === 'false') return false
  return Boolean(value)
}

function intInRange(value, { field = 'value', min = 0, max = 100, defaultValue = min } = {}) {
  const n = Number.parseInt(value, 10)
  if (!Number.isFinite(n)) return defaultValue
  return Math.max(min, Math.min(max, n))
}

function roomCode(value) {
  const code = cleanString(value, { field: 'code', max: 12, required: true }).toUpperCase()
  if (!/^[A-Z0-9]{4,12}$/.test(code)) throw badRequest('code is invalid')
  return code
}

function mongoId(value, field = 'id') {
  if (!mongoose.Types.ObjectId.isValid(value)) throw badRequest(`${field} is invalid`)
  return value
}

function mongoIdList(value, { max = 100 } = {}) {
  if (!Array.isArray(value)) return []
  return value.filter((id) => mongoose.Types.ObjectId.isValid(id)).slice(0, max)
}

function jsonWithinLimit(value, { field = 'payload', maxBytes = 12000, defaultValue = {} } = {}) {
  const data = value && typeof value === 'object' ? value : defaultValue
  if (Buffer.byteLength(JSON.stringify(data), 'utf8') > maxBytes) {
    throw badRequest(`${field} is too large`)
  }
  return data
}

function asyncRoute(handler) {
  return async (req, res) => {
    try {
      await handler(req, res)
    } catch (e) {
      res.status(e.status || 500).json({ error: e.message })
    }
  }
}

module.exports = {
  asyncRoute,
  badRequest,
  bool,
  cleanString,
  intInRange,
  jsonWithinLimit,
  mongoId,
  mongoIdList,
  oneOf,
  roomCode,
  stripHtml,
}
