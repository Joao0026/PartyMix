const router = require('express').Router()
const DrinkPack = require('../models/DrinkPack')
const { asyncRoute, cleanString } = require('../lib/validate')

router.get('/packs', asyncRoute(async (req, res) => {
  const rows = await DrinkPack.find({}, { pack: 1, name: 1, description: 1 }).sort({ pack: 1 })
  res.json(rows.map((row) => ({
    pack: row.pack,
    name: row.name || row.pack,
    description: row.description || '',
    deckIds: Object.keys(row.decks || {}),
  })))
}))

router.get('/decks', asyncRoute(async (req, res) => {
  const packId = cleanString(req.query.pack, { defaultValue: 'base', max: 60 }) || 'base'
  const row = await DrinkPack.findOne({ pack: packId })
  if (!row) return res.status(404).json({ error: 'Pack não encontrado. Corre npm run seed:packs.' })
  const categories = Object.entries(row.decks || {}).map(([id, deck]) => ({
    id,
    label: deck.label || id,
    desc: deck.desc || '',
    premium: !!deck.premium,
    cards: Array.isArray(deck.cards) ? deck.cards : [],
  }))
  res.json({
    pack: row.pack,
    name: row.name,
    description: row.description,
    categories,
  })
}))

module.exports = router
