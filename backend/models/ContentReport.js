const mongoose = require('mongoose')
const { REPORT_KINDS, REPORT_REASONS, REPORT_STATUSES, REPORT_TTL_MS } = require('../lib/ugcPolicy')

const s = new mongoose.Schema({
  reportId: { type: String, required: true, unique: true },
  kind: { type: String, enum: REPORT_KINDS, required: true },
  targetId: { type: String, required: true, maxlength: 80 },
  reason: { type: String, enum: REPORT_REASONS, required: true },
  details: { type: String, default: '', maxlength: 400 },
  status: { type: String, enum: REPORT_STATUSES, default: 'pending' },
  roomHash: { type: String, default: '', maxlength: 24 },
  reporterHash: { type: String, default: '', maxlength: 24 },
  createdAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date, default: null },
}, { timestamps: false })

s.index({ status: 1, createdAt: -1 })
s.index({ kind: 1, targetId: 1 })
s.index({ createdAt: 1 }, { expireAfterSeconds: Math.ceil(REPORT_TTL_MS / 1000) })

module.exports = mongoose.model('ContentReport', s)
