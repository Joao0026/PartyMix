const express  = require('express')
const mongoose = require('mongoose')
const cors     = require('cors')
const http     = require('http')
require('dotenv').config()

const { expressCorsOptions, socketIoCorsOrigin } = require('./lib/corsOrigins')
const { aiLimiter, communityWriteLimiter } = require('./middleware/rateLimits')

const app    = express()
const server = http.createServer(app) // Use http server for Socket.io

// Render / proxies: correct client IP for rate-limit and logs
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1)
}

app.use(cors(expressCorsOptions()))
app.use(express.json({ limit: '1mb' }))

app.use('/api/admin', require('./routes/admin'))

// Existing routes
app.use('/api/challenges', require('./routes/challenges'))
app.use('/api/drink', require('./routes/drink'))
app.use('/api/cards',      require('./routes/cards'))
app.use('/api/dice',       require('./routes/dice'))
app.use('/api/lobby',      require('./routes/lobby'))
app.use('/api/cardroom',   require('./routes/cardroom'))
app.use('/api/positions',  require('./routes/positions'))
app.use('/api/ai',         aiLimiter, require('./routes/ai'))
app.use('/api/community',  communityWriteLimiter, require('./routes/community'))

app.get('/api/health', (req, res) => res.json({
  status: 'ok',
  db:   mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  groq: !!process.env.GROQ_API_KEY,
  ws:   true,
}))

// Init WebSocket (same allowlist as HTTP CORS when CORS_ORIGINS is set)
const { initWebSocket } = require('./websocket')
initWebSocket(server, { corsOrigin: socketIoCorsOrigin() })

const PORT      = process.env.PORT || 3001
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/partymix'

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected')
    // Use server.listen instead of app.listen for WebSocket support
    server.listen(PORT, () => console.log(`🚀 Server + WebSocket on http://localhost:${PORT}`))
  })
  .catch(err => { console.error('❌ MongoDB error:', err); process.exit(1) })
