const router = require('express').Router()
const Card = require('../models/Card')
const { asyncRoute } = require('../lib/validate')

router.get('/pairs', asyncRoute(async (req, res) => {
  const rows = await Card.find({ mode_type: 'mister', pack: 'community' }).sort({ createdAt: -1 }).lean()
  const pairs = rows
    .filter((r) => r.civil_word && r.undercover_word)
    .map((r) => ({
      civil: r.civil_word,
      undercover: r.undercover_word,
      difficulty: 'normal',
    }))
  res.json({ pairs })
}))

module.exports = router
