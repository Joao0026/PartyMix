const mongoose = require('mongoose')

const s = new mongoose.Schema({
  pack: { type: String, required: true, maxlength: 60 },
  name: { type: String, default: '' },
  description: { type: String, default: '' },
  premium: { type: Boolean, default: false },
  intensity: { type: String, default: 'moderada', maxlength: 30 },
  ageRating: { type: String, default: '18+', maxlength: 10 },
  teaser: { type: String, default: '', maxlength: 180 },
  decks: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true })

s.index({ pack: 1 }, { unique: true })

module.exports = mongoose.model('DrinkPack', s)
