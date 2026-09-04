const mongoose = require('mongoose');
const s = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  difficulty: { type: String, enum: ['facil','medio','dificil'], default: 'medio' },
  tip: { type: String, default: '' },
}, { timestamps: true });
module.exports = mongoose.model('SexPosition', s);
