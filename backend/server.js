// PartyMix API + WebSocket server
const express  = require('express')
const mongoose = require('mongoose')
const cors     = require('cors')
const http     = require('http')
require('dotenv').config()

const { expressCorsOptions, socketIoCorsOrigin, parseList } = require('./lib/corsOrigins')
const { aiLimiter, aiDailyLimiter, communityWriteLimiter, lobbyWriteLimiter } = require('./middleware/rateLimits')
const { weakSecret } = require('./lib/gameAuth')
const { currentEpoch } = require('./lib/runtime')
const { restoreSnapshots, saveSnapshots, startRoomAutosave } = require('./lib/roomPersistence')
const { blockMinors } = require('./lib/ageCookie')

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
}

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
const json1mb = express.json({ limit: '1mb' })
app.use((req, res, next) => {
  if (req.path.startsWith('/api/mememix')) return next()
  return json1mb(req, res, next)
})

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
app.use('/api/observe', require('./routes/observe'))

app.get('/api/health', async (req, res) => {
  const maps = getRoomMaps()
  const body = {
    status: 'ok',
    uptimeSec: Math.round(process.uptime()),
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    rooms: Object.values(maps).reduce((n, bucket) => n + Object.keys(bucket || {}).length, 0),
  }
  if (!isProd) {
    body.groq = !!process.env.GROQ_API_KEY
    body.ws = true
    body.epoch = currentEpoch()
  }
  try {
    const ObserveEvent = require('./models/ObserveEvent')
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    body.drinkEnds7d = await ObserveEvent.countDocuments({ type: 'drink_end', at: { $gte: since } })
  } catch {
    body.drinkEnds7d = null
  }
  res.json(body)
})

const { initWebSocket, getRoomMaps, markRoomsDurable } = require('./websocket')

let shuttingDown = false
function shutdown() {
  if (shuttingDown) return
  shuttingDown = true
  saveSnapshots(getRoomMaps())
    .catch(() => {})
    .finally(() => {
      server.close(() => process.exit(0))
      setTimeout(() => process.exit(0), 4000).unref()
    })
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

const PORT      = process.env.PORT || 3001
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/partymix'

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB connected')
    const restored = await restoreSnapshots(getRoomMaps()).catch((err) => {
      console.error('Falha ao restaurar salas:', err?.message || err)
      return { restored: 0 }
    })
    if (restored.restored) console.log(`Salas restauradas: ${restored.restored}`)
    markRoomsDurable(true)
    initWebSocket(server, { corsOrigin: socketIoCorsOrigin() })
    startRoomAutosave(getRoomMaps)
    server.listen(PORT, () => console.log(`🚀 Server + WebSocket on http://localhost:${PORT}`))
  })
  .catch(err => { console.error('❌ MongoDB error:', err); process.exit(1) })
