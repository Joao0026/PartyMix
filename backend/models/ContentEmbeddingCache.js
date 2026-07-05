const mongoose = require('mongoose')

const s = new mongoose.Schema({
  textHash: { type: String, required: true, unique: true, index: true },
  embedText: { type: String, required: true },
  embedding: { type: [Number], required: true },
  model: { type: String, default: 'nomic-embed-text-v1.5' },
}, { timestamps: true })

module.exports = mongoose.model('ContentEmbeddingCache', s)
