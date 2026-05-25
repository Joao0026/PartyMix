const mongoose = require('mongoose')

const s = new mongoose.Schema({
  pack: { type: String, required: true, maxlength: 60 },
  name: { type: String, default: '' },
  description: { type: String, default: '' },
  decks: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true })

s.index({ pack: 1 }, { unique: true })

module.exports = mongoose.model('DrinkPack', s)
