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

app.get('/api/health', (req, res) => {
  if (isProd) return res.json({ status: 'ok' })
  res.json({
    status: 'ok',
    db:   mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    groq: !!process.env.GROQ_API_KEY,
    ws:   true,
  })
})

const { initWebSocket } = require('./websocket')
initWebSocket(server, { corsOrigin: socketIoCorsOrigin() })

const PORT      = process.env.PORT || 3001
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/partymix'

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected')
    server.listen(PORT, () => console.log(`🚀 Server + WebSocket on http://localhost:${PORT}`))
  })
  .catch(err => { console.error('❌ MongoDB error:', err); process.exit(1) })
