const mongoose = require('mongoose');

const s = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  creator: { type: String, required: true },
  creatorId: { type: String, required: true },
  title: { type: String, default: 'Custom Cards Game' },
  maxPoints: { type: Number, default: 21, min: 1, max: 100 },
  maxPlayers: { type: Number, default: 8, min: 2, max: 20 },
  gameType: { 
    type: String, 
    enum: ['dare','truth','drinking','trivia'], 
    default: 'dare' 
  },
  players: [{
    id: String,
    name: String,
    isJury: { type: Boolean, default: false },
    points: { type: Number, default: 0 },
    joinedAt: { type: Date, default: Date.now }
  }],
  status: { 
    type: String, 
    enum: ['waiting','playing','finished'], 
    default: 'waiting' 
  },
  currentRound: { type: Number, default: 0 },
  currentPlayer: { type: String, default: null },
  gameData: { type: mongoose.Schema.Types.Mixed, default: {} },
  selectedCards: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Card' }],
  history: [{
    round: Number,
    player: String,
    cardId: mongoose.Schema.Types.ObjectId,
    result: String,
    pointsEarned: Number,
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

// Auto-delete rooms after 24 hours
s.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('CardRoom', s);
