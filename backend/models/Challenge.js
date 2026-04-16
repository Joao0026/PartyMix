const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
  text: { type: String, required: true },
  category: {
    type: String,
    enum: ['mimica','desenho','palavra','acao','verdade','consequencia','cultura','desporto','musica','cinema','erotico','dados'],
    required: true
  },
  mode_type: { type: String, enum: ['couple','friends','family','all'], required: true },
  difficulty: { type: String, enum: ['facil','medio','dificil'], default: 'medio' },
  sips_penalty: { type: Number, default: 2 },
  time_limit: { type: Number, default: 60 },
  is_ongoing: { type: Boolean, default: false },
  ongoing_rounds: { type: Number, default: 0 },
  ongoing_instruction: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Challenge', challengeSchema);
