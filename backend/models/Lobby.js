const mongoose = require('mongoose');
const s = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  host: { type: String, required: true },
  players: [{ name: String, joinedAt: { type: Date, default: Date.now } }],
  status: { type: String, enum: ['waiting','playing','finished'], default: 'waiting' },
  gameData: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });
s.index({ createdAt: 1 }, { expireAfterSeconds: 7200 });
module.exports = mongoose.model('Lobby', s);