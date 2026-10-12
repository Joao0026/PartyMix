const mongoose = require('mongoose')

const s = new mongoose.Schema({
  type: { type: String, required: true, maxlength: 40 },
  turns: { type: Number },
  players: { type: Number },
  message: { type: String, maxlength: 180 },
  at: { type: Date, default: Date.now },
})

s.index({ at: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 })
s.index({ type: 1, at: -1 })

module.exports = mongoose.model('ObserveEvent', s)
