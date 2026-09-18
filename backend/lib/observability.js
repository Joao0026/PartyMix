const crypto = require('crypto')

const EVENTS = [
  'room_created',
  'game_started',
  'game_completed',
  'rejoin_failed',
  'socket_disconnect_reason',
  'error_code',
  'ugc_reported',
  'ugc_reviewed',
]

const recent = []
const MAX_RECENT = 250
let writer = (line) => console.log(line)
let sentry = null

function hashRoom(code, env = process.env) {
  const raw = String(code || '').toUpperCase()
  if (!raw) return undefined
  const salt = env.ROOM_HASH_SALT || env.JWT_SECRET || 'dev-room-hash'
  return crypto.createHash('sha256').update(`${salt}:${raw}`).digest('hex').slice(0, 12)
}

function errorCode(message) {
  const m = String(message || '')
  if (/Sala não encontrada/i.test(m)) return 'room_not_found'
  if (/Sessão inválida/i.test(m)) return 'invalid_session'
  if (/Já estás nesta sala/i.test(m)) return 'already_seated'
  if (/já está a decorrer|Jogo já começou/i.test(m)) return 'game_in_progress'
  if (/Nome já em uso/i.test(m)) return 'name_taken'
  if (/desligado neste servidor|indisponível/i.test(m)) return 'mode_disabled'
  if (/Demasiados pedidos/i.test(m)) return 'rate_limited'
  if (/Jogador não encontrado/i.test(m)) return 'player_not_found'
  return 'error'
}

function sanitizeRecord(rec = {}) {
  const out = { ts: new Date().toISOString(), ...rec }
  if (rec.roomCode && !rec.roomHash) out.roomHash = hashRoom(rec.roomCode)
  delete out.roomCode
  delete out.playerName
  delete out.playerToken
  delete out.uploadToken
  delete out.hostToken
  delete out.token
  return out
}

function log(level, rec = {}) {
  const row = sanitizeRecord({ level, ...rec })
  writer(JSON.stringify(row))
  return row
}

function track(event, rec = {}) {
  const row = sanitizeRecord({ level: 'info', event, ...rec })
  recent.push(row)
  if (recent.length > MAX_RECENT) recent.shift()
  writer(JSON.stringify(row))
  return row
}

function trackRoom(event, mode, room, extra = {}) {
  return track(event, {
    mode,
    roomHash: hashRoom(room?.code),
    playerCount: Array.isArray(room?.players) ? room.players.length : undefined,
    ...extra,
  })
}

function trackRejoinFailed(mode, room, message) {
  return track('rejoin_failed', {
    mode,
    errorCode: errorCode(message),
    roomHash: hashRoom(room?.code),
  })
}

function wrapSocketErrors(socket) {
  const orig = socket.emit.bind(socket)
  socket.emit = (ev, ...args) => {
    if (ev === 'error') {
      track('error_code', { errorCode: errorCode(args[0]) })
    }
    return orig(ev, ...args)
  }
}

function recentEvents() {
  return recent.slice()
}

function resetEvents() {
  recent.length = 0
}

function setWriter(fn) {
  const prev = writer
  writer = typeof fn === 'function' ? fn : prev
  return () => { writer = prev }
}

function initSentry(env = process.env) {
  const dsn = String(env.SENTRY_DSN || '').trim()
  if (!dsn) return null
  try {
    const Sentry = require('@sentry/node')
    Sentry.init({
      dsn,
      environment: env.NODE_ENV || 'development',
      tracesSampleRate: 0,
    })
    sentry = Sentry
    log('info', { event: 'sentry_ready' })
    return Sentry
  } catch {
    log('error', { event: 'sentry_unavailable', errorCode: 'sentry_unavailable' })
    return null
  }
}

function captureException(err) {
  log('error', {
    event: 'process_crash',
    errorCode: 'uncaught',
    message: String(err?.message || err || 'unknown').slice(0, 200),
  })
  try { sentry?.captureException(err) } catch { /* ignore */ }
}

function installCrashReporting() {
  if (process.env.NODE_TEST_CONTEXT) return
  if (process.env.PARTYMIX_NO_CRASH_HOOKS === '1') return
  process.on('unhandledRejection', (err) => captureException(err))
  process.on('uncaughtException', (err) => {
    captureException(err)
    const flush = sentry?.flush?.(2000)
    Promise.resolve(flush).finally(() => process.exit(1))
  })
}

module.exports = {
  EVENTS,
  hashRoom,
  errorCode,
  log,
  track,
  trackRoom,
  trackRejoinFailed,
  wrapSocketErrors,
  recentEvents,
  resetEvents,
  setWriter,
  initSentry,
  captureException,
  installCrashReporting,
}
