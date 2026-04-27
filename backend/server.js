const express  = require('express')
const mongoose = require('mongoose')
const cors     = require('cors')
require('dotenv').config()

const app = express()
app.use(cors({ origin: '*' }))
app.use(express.json())

// Existing routes
app.use('/api/challenges', require('./routes/challenges'))
app.use('/api/cards',      require('./routes/cards'))
app.use('/api/dice',       require('./routes/dice'))
app.use('/api/lobby',      require('./routes/lobby'))
app.use('/api/positions',  require('./routes/positions'))

// New routes
app.use('/api/ai',         require('./routes/ai'))
app.use('/api/community',  require('./routes/community'))

app.get('/api/health', (req, res) => res.json({
  status: 'ok',
  db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  groq: !!process.env.GROQ_API_KEY,
}))

const PORT      = process.env.PORT || 3001
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/partymix'

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected')
    app.listen(PORT, () => console.log(`🚀 Server on http://localhost:${PORT}`))
  })
  .catch(err => { console.error('❌ MongoDB error:', err); process.exit(1) })
