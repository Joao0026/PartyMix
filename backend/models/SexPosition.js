const mongoose = require('mongoose');

const sexPositionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  difficulty: { type: String, enum: ['facil','medio','dificil'], default: 'medio' }
}, { timestamps: true });

module.exports = mongoose.model('SexPosition', sexPositionSchema);
