const mongoose = require('mongoose');
const s = new mongoose.Schema({
  text: { type: String, required: true },
  category: { type: String, enum: ['geral','adulto','cultura','absurdo','regra','beber','desafio','poder','sorte'], default: 'geral' },
  is_black: { type: Boolean, default: false },
  mode_type: { type: String, default: 'cards' }
}, { timestamps: true });
module.exports = mongoose.model('Card', s);
