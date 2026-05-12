const express  = require('express')
const mongoose = require('mongoose')
const cors     = require('cors')
const http     = require('http')
require('dotenv').config()

const app    = express()
const server = http.createServer(app) // Use http server for Socket.io

app.use(cors({ origin: '*' }))
app.use(express.json())

app.use('/api/admin', require('./routes/admin'))

// Existing routes
app.use('/api/challenges', require('./routes/challenges'))
app.use('/api/cards',      require('./routes/cards'))
app.use('/api/dice',       require('./routes/dice'))
app.use('/api/lobby',      require('./routes/lobby'))
app.use('/api/cardroom',   require('./routes/cardroom'))
app.use('/api/positions',  require('./routes/positions'))
app.use('/api/ai',         require('./routes/ai'))
app.use('/api/community',  require('./routes/community'))

app.get('/api/health', (req, res) => res.json({
  status: 'ok',
  db:   mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  groq: !!process.env.GROQ_API_KEY,
  ws:   true,
}))

// Init WebSocket
const { initWebSocket } = require('./websocket')
initWebSocket(server)

const PORT      = process.env.PORT || 3001
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/partymix'

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected')
    // Use server.listen instead of app.listen for WebSocket support
    server.listen(PORT, () => console.log(`🚀 Server + WebSocket on http://localhost:${PORT}`))
  })
  .catch(err => { console.error('❌ MongoDB error:', err); process.exit(1) })
