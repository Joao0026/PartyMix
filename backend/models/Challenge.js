const mongoose = require('mongoose');
const s = new mongoose.Schema({
  text: { type: String, required: true },
  category: { type: String, enum: ['telepatia','perguntas','desenho','mimica','proibido','caos','palavra','acao','verdade','consequencia','cultura','desporto','musica','cinema','erotico','romantico','picante','roleplay','casal_pergunta','dados','impostor'], required: true },
  correct_question: { type: String, default: '' },
  wrong_question: { type: String, default: '' },
  mode_type: { type: String, enum: ['couple','friends','family','all'], required: true },
  difficulty: { type: String, enum: ['facil','medio','dificil'], default: 'medio' },
  answer: { type: String, default: '' },
  choices: [{ type: String }],
  forbiddenWords: [{ type: String }],
  sips_penalty: { type: Number, default: 2 },
  time_limit: { type: Number, default: 0 },
  is_ongoing: { type: Boolean, default: false },
  ongoing_rounds: { type: Number, default: 0 },
  ongoing_instruction: { type: String, default: '' },
  pack: { type: String, default: 'base' },
  audience: { type: String, enum: ['family','adult','all',''], default: '' }
}, { timestamps: true });
module.exports = mongoose.model('Challenge', s);