const mongoose = require('mongoose');

const lobbySchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  host: { type: String, required: true },
  players: [{ name: String, joinedAt: { type: Date, default: Date.now } }],
  status: { type: String, enum: ['waiting','playing','finished'], default: 'waiting' },
  gameData: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

lobbySchema.index({ createdAt: 1 }, { expireAfterSeconds: 7200 }); // TTL 2h

module.exports = mongoose.model('Lobby', lobbySchema);
