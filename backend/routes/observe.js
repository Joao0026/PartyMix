const router = require('express').Router()
const requireAdmin = require('../middleware/requireAdmin')
const ObserveEvent = require('../models/ObserveEvent')
const { asyncRoute, cleanString, intInRange, oneOf } = require('../lib/validate')
const { observeLimiter } = require('../middleware/rateLimits')

const TYPES = ['drink_end', 'client_error']

router.post('/', observeLimiter, asyncRoute(async (req, res) => {
  const type = oneOf(req.body?.type, TYPES, { field: 'type', required: true })
  const doc = { type }
  if (type === 'drink_end') {
    doc.turns = intInRange(req.body?.turns, { field: 'turns', min: 0, max: 5000, defaultValue: 0 })
    doc.players = intInRange(req.body?.players, { field: 'players', min: 0, max: 20, defaultValue: 0 })
  } else {
    doc.message = cleanString(req.body?.message, { field: 'message', max: 180, defaultValue: 'erro' })
  }
  await new ObserveEvent(doc).save()
  res.status(202).json({ ok: true })
}))

router.get('/summary', requireAdmin, asyncRoute(async (_req, res) => {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const [drinkEnds, errors] = await Promise.all([
    ObserveEvent.countDocuments({ type: 'drink_end', at: { $gte: since } }),
    ObserveEvent.find({ type: 'client_error', at: { $gte: since } })
      .sort({ at: -1 })
      .limit(8)
      .select({ message: 1, at: 1, _id: 0 })
      .lean(),
  ])
  res.json({ drinkEnds, errors })
}))

module.exports = router
