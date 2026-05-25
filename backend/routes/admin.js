const router = require('express').Router()
const jwt = require('jsonwebtoken')
const requireAdmin = require('../middleware/requireAdmin')
const CommunitySubmission = require('../models/CommunitySubmission')
const Card = require('../models/Card')
const Challenge = require('../models/Challenge')
const DrinkPack = require('../models/DrinkPack')
const { importPackObject, listPackNames, exportPackObject } = require('../lib/packImport')
const { asyncRoute, cleanString, mongoId, oneOf } = require('../lib/validate')

router.post('/login', (req, res) => {
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) {
    return res.status(503).json({ error: 'ADMIN_PASSWORD not configured on server' })
  }
  const secret = process.env.JWT_SECRET
  if (!secret) {
    return res.status(503).json({ error: 'JWT_SECRET not configured on server' })
  }

  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  if (password !== adminPassword) {
    return res.status(401).json({ error: 'Invalid password' })
  }

  const token = jwt.sign({ role: 'admin' }, secret, { expiresIn: '12h' })
  res.json({ token })
})

router.get('/packs', requireAdmin, asyncRoute(async (req, res) => {
  const names = await listPackNames()
  const drinkRows = await DrinkPack.find({}, { pack: 1, name: 1 }).lean()
  const drinkMap = Object.fromEntries(drinkRows.map((r) => [r.pack, r.name]))
  res.json(names.map((pack) => ({
    pack,
    name: drinkMap[pack] || pack,
    hasDrinkDecks: !!drinkMap[pack],
  })))
}))

router.get('/packs/:pack/export', requireAdmin, asyncRoute(async (req, res) => {
  const pack = cleanString(req.params.pack, { field: 'pack', max: 60, required: true })
  const doc = await exportPackObject(pack)
  if (!doc.categories && !doc.decks && !doc.white && !doc.black) {
    return res.status(404).json({ error: 'Pack vazio ou inexistente' })
  }
  res.json(doc)
}))

router.post('/import-pack', requireAdmin, asyncRoute(async (req, res) => {
  const pack = req.body?.pack || req.body
  if (!pack || typeof pack !== 'object' || Array.isArray(pack)) {
    return res.status(400).json({ error: 'Pack JSON inválido' })
  }

  const result = await importPackObject(pack)
  res.json(result)
}))

router.post('/community/:id/meta', requireAdmin, asyncRoute(async (req, res) => {
  const pack = cleanString(req.body.pack, { field: 'pack', max: 60 })
  const audience = oneOf(req.body.audience, ['family','adult','all',''], { field: 'audience', defaultValue: '' })

  const sub = await CommunitySubmission.findByIdAndUpdate(
    mongoId(req.params.id),
    { pack, audience },
    { new: true }
  )
  if (!sub) return res.status(404).json({ error: 'Not found' })

  const update = { pack, audience }
  if (sub.linkedCardId) await Card.findByIdAndUpdate(sub.linkedCardId, update)
  if (sub.linkedChallengeId) await Challenge.findByIdAndUpdate(sub.linkedChallengeId, update)

  res.json(sub)
}))

module.exports = router
