const router = require('express').Router()
const DrinkPack = require('../models/DrinkPack')
const { asyncRoute, cleanString } = require('../lib/validate')
const { putBoard, getBoard, normalizeCode } = require('../lib/drinkDisplay')

router.get('/packs', asyncRoute(async (req, res) => {
  const rows = await DrinkPack.find({}, {
    pack: 1,
    name: 1,
    description: 1,
    premium: 1,
    intensity: 1,
    ageRating: 1,
    teaser: 1,
  }).sort({ premium: 1, pack: 1 })
  res.json(rows.map((row) => ({
    pack: row.pack,
    name: row.name || row.pack,
    description: row.description || '',
    premium: false,
    intensity: row.intensity || 'moderada',
    ageRating: row.ageRating || '18+',
    teaser: row.teaser || '',
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
    premium: false,
    intensity: row.intensity || 'moderada',
    ageRating: row.ageRating || '18+',
    categories,
  })
}))

router.get('/tv/:code', asyncRoute(async (req, res) => {
  const code = normalizeCode(req.params.code)
  const row = getBoard(code)
  if (!row) return res.status(404).json({ error: 'Ecrã não encontrado' })
  res.json(row)
}))

router.post('/tv/:code', asyncRoute(async (req, res) => {
  const code = normalizeCode(req.params.code)
  if (code.length < 4) return res.status(400).json({ error: 'Código inválido' })
  const row = putBoard(code, {
    card: req.body?.card,
    readerName: cleanString(req.body?.readerName, { max: 40 }),
    turnCount: req.body?.turnCount,
    rules: req.body?.rules,
  })
  if (!row) return res.status(400).json({ error: 'Código inválido' })
  res.json(row)
}))

module.exports = router
