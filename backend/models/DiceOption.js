const mongoose = require('mongoose');

const diceOptionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  dice_type: { type: String, enum: ['body_part','action'], required: true }
}, { timestamps: true });

module.exports = mongoose.model('DiceOption', diceOptionSchema);
