const mongoose = require('mongoose')

const s = new mongoose.Schema({
  game: { type: String, required: true, maxlength: 24 },
  code: { type: String, required: true, maxlength: 12 },
  epoch: { type: Number, required: true },
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true })

s.index({ game: 1, code: 1 }, { unique: true })
s.index({ updatedAt: 1 }, { expireAfterSeconds: 4 * 60 * 60 })

module.exports = mongoose.model('RoomSnapshot', s)
