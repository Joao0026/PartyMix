// PartyMix API + WebSocket server
const express  = require('express')
const mongoose = require('mongoose')
const cors     = require('cors')
const http     = require('http')
require('dotenv').config()

const { expressCorsOptions, socketIoCorsOrigin, parseList } = require('./lib/corsOrigins')
const { aiLimiter, aiDailyLimiter, communityWriteLimiter, lobbyWriteLimiter } = require('./middleware/rateLimits')
const { weakSecret } = require('./lib/gameAuth')
const { blockMinors } = require('./lib/ageCookie')
const { healthPayload, readyPayload } = require('./lib/health')
const { onlineFlags } = require('./lib/featureFlags')
const { WS_POLICY, assertSingleInstance, stickyCookieHeader } = require('./lib/wsPolicy')
const { initSentry, installCrashReporting, log } = require('./lib/observability')
const { ensureIndexes, purgeExpiredGameDocs } = require('./lib/mongoMaintenance')

const isProd = process.env.NODE_ENV === 'production'
if (isProd) {
  if (weakSecret(process.env.ADMIN_PASSWORD, { min: 12 }) || weakSecret(process.env.JWT_SECRET, { min: 32 })) {
    console.error('ADMIN_PASSWORD (>=12) e JWT_SECRET (>=32) têm de ser fortes em produção.')
    process.exit(1)
  }
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI é obrigatório em produção.')
    process.exit(1)
  }
  if (parseList().length === 0) {
    console.error('CORS_ORIGINS é obrigatório em produção (origens do frontend, sem wildcard).')
    process.exit(1)
  }
  const wsOk = assertSingleInstance()
  if (!wsOk.ok) {
    console.error(wsOk.error)
    process.exit(1)
  }
}

initSentry()
installCrashReporting()

const app    = express()
const server = http.createServer(app)

if (isProd) {
  app.set('trust proxy', 1)
}

let helmet
try { helmet = require('helmet') } catch { helmet = null }
if (helmet) {
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'no-referrer' },
  }))
}

app.use(cors(expressCorsOptions()))
app.use((req, res, next) => {
  res.append('Set-Cookie', stickyCookieHeader())
  next()
})
app.use(express.json({ limit: '1mb' }))

app.use('/api/age', require('./routes/age'))
app.use('/api/admin', require('./routes/admin'))
app.use('/api/challenges', require('./routes/challenges'))
app.use('/api/drink', blockMinors, require('./routes/drink'))
app.use('/api/cards', blockMinors, require('./routes/cards'))
app.use('/api/dice', blockMinors, require('./routes/dice'))
app.use('/api/lobby', blockMinors, lobbyWriteLimiter, require('./routes/lobby'))
app.use('/api/cardroom', blockMinors, lobbyWriteLimiter, require('./routes/cardroom'))
app.use('/api/positions', blockMinors, require('./routes/positions'))
app.use('/api/ai', blockMinors, aiDailyLimiter, aiLimiter, require('./routes/ai'))
app.use('/api/community', communityWriteLimiter, require('./routes/community'))
app.use('/api/mememix', blockMinors, require('./routes/mememix'))
app.use('/api/mister', blockMinors, require('./routes/mister'))

const { initWebSocket, memoryRoomStats } = require('./websocket')
initWebSocket(server, { corsOrigin: socketIoCorsOrigin() })

app.get('/api/health', (_req, res) => {
  res.json(healthPayload())
})

app.get('/api/ready', (_req, res) => {
  const body = readyPayload(memoryRoomStats())
  res.status(body.ready ? 200 : 503).json(body)
})

app.get('/api/features', (_req, res) => {
  res.json({
    wsPolicy: WS_POLICY,
    roomsEphemeral: true,
    online: onlineFlags(),
  })
})

const PORT      = process.env.PORT || 3001
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/partymix'

mongoose.connect(MONGO_URI)
  .then(async () => {
    try { await ensureIndexes() } catch (err) { log('error', { event: 'mongo_indexes_failed', message: String(err.message || err).slice(0, 160) }) }
    try {
      const purged = await purgeExpiredGameDocs()
      log('info', { event: 'mongo_purge', ...purged })
    } catch (err) {
      log('error', { event: 'mongo_purge_failed', message: String(err.message || err).slice(0, 160) })
    }
    const purgeTimer = setInterval(() => {
      purgeExpiredGameDocs().then((purged) => log('info', { event: 'mongo_purge', ...purged })).catch(() => {})
    }, 60 * 60 * 1000)
    if (typeof purgeTimer.unref === 'function') purgeTimer.unref()
    log('info', { event: 'mongo_connected' })
    server.listen(PORT, () => log('info', { event: 'server_listen', port: Number(PORT) }))
  })
  .catch((err) => {
    log('error', { event: 'mongo_connect_failed', message: String(err.message || err).slice(0, 160) })
    process.exit(1)
  })
