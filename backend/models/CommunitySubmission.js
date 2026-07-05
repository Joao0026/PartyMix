const mongoose = require('mongoose')

const s = new mongoose.Schema({
  submissionType: { type: String, enum: ['card', 'idea'], required: true },
  // Card fields
  mode:     { type: String, enum: ['friends','family','couple','drink','cards','mister','mememix'] },
  cardType: { type: String },
  isBlack:  { type: Boolean, default: false },
  text:     { type: String, required: true, maxlength: 300 },
  answer:   { type: String, maxlength: 200 },
  choices:  [{ type: String, maxlength: 120 }],
  forbiddenWords: [{ type: String, maxlength: 40 }],
  secretMission: { type: String, maxlength: 300 },
  correctQuestion: { type: String, maxlength: 200 },
  wrongQuestion: { type: String, maxlength: 200 },
  civilWord: { type: String, maxlength: 80 },
  undercoverWord: { type: String, maxlength: 80 },
  drinkSpecialType: { type: String, enum: ['agent','impostor','alliance','miniboss',''], default: '' },
  // Idea fields
  ideaType: { type: String, enum: ['mode','minigame','feature','other'] },
  // Common
  votes:    { type: Number, default: 0 },
  status:   { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
  author:   { type: String, default: 'Anónimo', maxlength: 50 },
  pack:     { type: String, default: '', maxlength: 60 },
  audience: { type: String, enum: ['family','adult','all',''], default: '' },
  // When approved, link to the actual card/challenge created
  linkedCardId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Card' },
  linkedChallengeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge' },
}, { timestamps: true })

// Auto-index for fast queries
s.index({ status: 1, votes: -1 })
s.index({ submissionType: 1, mode: 1 })

module.exports = mongoose.model('CommunitySubmission', s)
