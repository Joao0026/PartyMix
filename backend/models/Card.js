const mongoose = require('mongoose');
const s = new mongoose.Schema({
  text: { type: String, required: true },
  category: { type: String, enum: ['geral','adulto','cultura','absurdo','regra','beber','desafio','poder','sorte','legenda','meme'], default: 'geral' },
  is_black: { type: Boolean, default: false },
  mode_type: { type: String, default: 'cards' },
  pack: { type: String, default: 'base' },
  image: { type: String, default: '' },
  civil_word: { type: String, default: '' },
  undercover_word: { type: String, default: '' },
  audience: { type: String, enum: ['family','adult','all',''], default: '' }
}, { timestamps: true });
module.exports = mongoose.model('Card', s);
