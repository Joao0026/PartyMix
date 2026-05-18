const router = require('express').Router()
const requireAdmin = require('../middleware/requireAdmin')
const CommunitySubmission = require('../models/CommunitySubmission')
const Card = require('../models/Card')
const Challenge = require('../models/Challenge')
const { asyncRoute, bool, cleanString, intInRange, mongoId, oneOf } = require('../lib/validate')

const SUBMISSION_TYPES = ['card', 'idea']
const MODES = ['friends','family','couple','drink','cards']
const IDEA_TYPES = ['mode','minigame','feature','other']
const CARD_TYPES = ['telepatia','perguntas','desenho','mimica','proibido','caos','beber','regra','desafio','duelo','poder','sorte','romantico','picante','verdade','acao','roleplay','quiz','geral']

// GET /api/community?status=pending&mode=friends&page=1
router.get('/', asyncRoute(async (req, res) => {
  const { status, mode, submissionType } = req.query
  const page = intInRange(req.query.page, { field: 'page', min: 1, max: 1000, defaultValue: 1 })
  const limit = intInRange(req.query.limit, { field: 'limit', min: 1, max: 100, defaultValue: 50 })
  const filter = {}
  if (status) filter.status = oneOf(status, ['pending','approved','rejected'], { field: 'status' })
  if (mode) filter.mode = oneOf(mode, MODES, { field: 'mode' })
  if (submissionType) filter.submissionType = oneOf(submissionType, SUBMISSION_TYPES, { field: 'submissionType' })

  const skip = (page - 1) * limit
  const [items, total] = await Promise.all([
    CommunitySubmission.find(filter).sort({ votes: -1, createdAt: -1 }).skip(skip).limit(limit),
    CommunitySubmission.countDocuments(filter),
  ])
  res.json({ items, total, page })
}))

// POST /api/community — submit a card or idea
router.post('/', asyncRoute(async (req, res) => {
  const submissionType = oneOf(req.body.submissionType, SUBMISSION_TYPES, { field: 'submissionType', required: true })
  const payload = {
    submissionType,
    mode: oneOf(req.body.mode, MODES, { field: 'mode', defaultValue: submissionType === 'card' ? 'friends' : undefined }),
    cardType: oneOf(req.body.cardType, CARD_TYPES, { field: 'cardType', defaultValue: 'geral' }),
    isBlack: bool(req.body.isBlack),
    text: cleanString(req.body.text, { field: 'text', max: 300, required: true }),
    answer: cleanString(req.body.answer, { field: 'answer', max: 200 }),
    choices: Array.isArray(req.body.choices)
      ? req.body.choices.map((choice) => cleanString(choice, { field: 'choice', max: 120 })).filter(Boolean).slice(0, 4)
      : [],
    forbiddenWords: Array.isArray(req.body.forbiddenWords)
      ? req.body.forbiddenWords.map((w) => cleanString(w, { field: 'forbiddenWord', max: 40 })).filter(Boolean).slice(0, 5)
      : [],
    ideaType: oneOf(req.body.ideaType, IDEA_TYPES, { field: 'ideaType', defaultValue: submissionType === 'idea' ? 'other' : undefined }),
    author: cleanString(req.body.author, { field: 'author', max: 50, defaultValue: 'Anónimo' }),
    pack: cleanString(req.body.pack, { field: 'pack', max: 60 }),
    audience: oneOf(req.body.audience, ['family','adult','all',''], { field: 'audience', defaultValue: '' }),
  }

  const sub = await new CommunitySubmission(payload).save()
  res.status(201).json(sub)
}))

// POST /api/community/:id/vote
router.post('/:id/vote', asyncRoute(async (req, res) => {
  const sub = await CommunitySubmission.findByIdAndUpdate(
    mongoId(req.params.id),
    { $inc: { votes: 1 } },
    { new: true }
  )
  if (!sub) return res.status(404).json({ error: 'Not found' })

  res.json(sub)
}))

// POST /api/community/:id/approve — admin manually approves + creates real card/challenge
router.post('/:id/approve', requireAdmin, asyncRoute(async (req, res) => {
    const sub = await CommunitySubmission.findById(mongoId(req.params.id))
    if (!sub) return res.status(404).json({ error: 'Not found' })
    if (sub.status === 'approved') return res.json({ message: 'Already approved', sub })

    let linked = null

    if (sub.submissionType === 'card') {
      if (sub.mode === 'cards') {
        // Create a Card document
        linked = await new Card({
          text:      sub.text,
          category:  sub.cardType || 'geral',
          is_black:  sub.isBlack,
          mode_type: 'cards',
          pack:      sub.pack || 'community',
          audience:  sub.audience || '',
        }).save()
        sub.linkedCardId = linked._id
      } else {
        // Create a Challenge document
        const categoryMap = {
          telepatia:'telepatia', perguntas:'perguntas', proibido:'proibido',
          mimica:'mimica', desenho:'desenho', palavra:'palavra', caos:'caos',
          acao:'acao', verdade:'verdade', consequencia:'consequencia',
          cultura:'cultura', desporto:'desporto', musica:'musica', cinema:'cinema',
          romantico:'romantico', picante:'picante', erotico:'picante', roleplay:'roleplay', quiz:'casal_pergunta',
          beber:'acao', regra:'consequencia', desafio:'acao', duelo:'acao', poder:'acao', sorte:'consequencia',
        }
        linked = await new Challenge({
          text:        sub.text,
          category:    categoryMap[sub.cardType] || 'acao',
          mode_type:   sub.mode === 'couple' ? 'couple' : sub.mode === 'family' ? 'family' : 'friends',
          answer:      sub.answer || '',
          choices:     sub.choices || [],
          forbiddenWords: sub.forbiddenWords || [],
          difficulty:  'medio',
          sips_penalty: 2,
          pack:        sub.pack || 'community',
          audience:    sub.audience || '',
        }).save()
        sub.linkedChallengeId = linked._id
      }
    }

    sub.status = 'approved'
    await sub.save()

    res.json({ message: 'Approved and added to game', sub, linked })
}))

// POST /api/community/:id/reject
router.post('/:id/reject', requireAdmin, asyncRoute(async (req, res) => {
  const sub = await CommunitySubmission.findByIdAndUpdate(
    mongoId(req.params.id),
    { status: 'rejected' },
    { new: true }
  )
  if (!sub) return res.status(404).json({ error: 'Not found' })
  res.json(sub)
}))

// DELETE /api/community/:id
router.delete('/:id', requireAdmin, asyncRoute(async (req, res) => {
  await CommunitySubmission.findByIdAndDelete(mongoId(req.params.id))
  res.json({ deleted: true })
}))

// GET /api/community/stats — for admin dashboard
router.get('/stats', requireAdmin, asyncRoute(async (req, res) => {
  const [pending, approved, rejected, total] = await Promise.all([
    CommunitySubmission.countDocuments({ status: 'pending' }),
    CommunitySubmission.countDocuments({ status: 'approved' }),
    CommunitySubmission.countDocuments({ status: 'rejected' }),
    CommunitySubmission.countDocuments(),
  ])
  res.json({ pending, approved, rejected, total })
}))

module.exports = router
