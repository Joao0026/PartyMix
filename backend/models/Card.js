const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  text: { type: String, required: true },
  category: { type: String, enum: ['geral','adulto','cultura','absurdo'], default: 'geral' },
  is_black: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Card', cardSchema);
