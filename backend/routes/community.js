const router = require('express').Router()
const requireAdmin = require('../middleware/requireAdmin')
const CommunitySubmission = require('../models/CommunitySubmission')
const Card = require('../models/Card')
const Challenge = require('../models/Challenge')
const { appendDrinkCommunityCard } = require('../lib/communityDrink')
const { appendMisterCommunityPair, appendMememixCommunityLegenda } = require('../lib/communityMister')
const { invalidateCommunityPairsCache } = require('../lib/misterWhite')
const { auditSubmissionWarnings } = require('../lib/contentAudit')
const { asyncRoute, bool, cleanString, intInRange, mongoId, oneOf } = require('../lib/validate')

const SUBMISSION_TYPES = ['card', 'idea']
const MODES = ['friends','family','couple','drink','cards','mister','mememix']
const IDEA_TYPES = ['mode','minigame','feature','other']
const CARD_TYPES = ['telepatia','perguntas','desenho','mimica','proibido','caos','waterfall','eununca','regras','desafios','cadeia','historia','provavel','bluff','maldicao','duelo','poder','preferias','picante','extreme','especiais','agent','alliance','miniboss','impostor','romantico','verdade','acao','roleplay','quiz','geral','legenda','par','beber','regra','desafio','preferencia','sorte','azar']

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
  const mode = oneOf(req.body.mode, MODES, { field: 'mode', defaultValue: submissionType === 'card' ? 'friends' : undefined })
  const civilWord = cleanString(req.body.civilWord, { field: 'civilWord', max: 80 })
  const undercoverWord = cleanString(req.body.undercoverWord, { field: 'undercoverWord', max: 80 })
  let text = cleanString(req.body.text, { field: 'text', max: 300, required: false })

  if (submissionType === 'card') {
    if (mode === 'mister') {
      if (!civilWord || !undercoverWord) {
        return res.status(400).json({ error: 'Mister White: indica palavra civil e palavra undercover' })
      }
      text = text || `${civilWord} · ${undercoverWord}`
    }
    if (!text) {
      return res.status(400).json({ error: 'text é obrigatório' })
    }
  } else if (!text) {
    return res.status(400).json({ error: 'text é obrigatório' })
  }

  const payload = {
    submissionType,
    mode,
    cardType: oneOf(req.body.cardType, CARD_TYPES, { field: 'cardType', defaultValue: mode === 'mememix' ? 'legenda' : mode === 'mister' ? 'par' : 'geral' }),
    isBlack: bool(req.body.isBlack),
    text,
    answer: cleanString(req.body.answer, { field: 'answer', max: 200 }),
    choices: Array.isArray(req.body.choices)
      ? req.body.choices.map((choice) => cleanString(choice, { field: 'choice', max: 120 })).filter(Boolean).slice(0, 4)
      : [],
    forbiddenWords: Array.isArray(req.body.forbiddenWords)
      ? req.body.forbiddenWords.map((w) => cleanString(w, { field: 'forbiddenWord', max: 40 })).filter(Boolean).slice(0, 5)
      : [],
    secretMission: cleanString(req.body.secretMission, { field: 'secretMission', max: 300 }),
    correctQuestion: cleanString(req.body.correctQuestion, { field: 'correctQuestion', max: 200 }),
    wrongQuestion: cleanString(req.body.wrongQuestion, { field: 'wrongQuestion', max: 200 }),
    civilWord,
    undercoverWord,
    drinkSpecialType: oneOf(req.body.drinkSpecialType, ['agent','impostor','alliance','miniboss',''], { field: 'drinkSpecialType', defaultValue: '' }),
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

// POST /api/community/:id/unvote
router.post('/:id/unvote', asyncRoute(async (req, res) => {
  const sub = await CommunitySubmission.findById(mongoId(req.params.id))
  if (!sub) return res.status(404).json({ error: 'Not found' })

  sub.votes = Math.max(0, (sub.votes || 0) - 1)
  await sub.save()
  res.json(sub)
}))

// POST /api/community/:id/approve — admin manually approves + creates real card/challenge
router.post('/:id/approve', requireAdmin, asyncRoute(async (req, res) => {
    const sub = await CommunitySubmission.findById(mongoId(req.params.id))
    if (!sub) return res.status(404).json({ error: 'Not found' })
    if (sub.status === 'approved') return res.json({ message: 'Already approved', sub })

    let linked = null
    let warnings = []

    if (sub.submissionType === 'card') {
      warnings = await auditSubmissionWarnings(sub, { semantic: true }).catch(() => [])

      if (sub.mode === 'cards') {
        linked = await new Card({
          text:      sub.text,
          category:  sub.cardType || 'geral',
          is_black:  sub.isBlack,
          mode_type: 'cards',
          pack:      sub.pack || 'community',
          audience:  sub.audience || '',
        }).save()
        sub.linkedCardId = linked._id
      } else if (sub.mode === 'drink') {
        const drinkResult = await appendDrinkCommunityCard(sub, {
          drinkPackId: sub.pack && sub.pack !== 'community' ? sub.pack : 'base',
        })
        linked = { type: 'drink', deck: 'comunidade', ...drinkResult }
      } else if (sub.mode === 'mister') {
        const misterResult = await appendMisterCommunityPair(sub)
        linked = { type: 'mister', ...misterResult }
        if (misterResult.card) sub.linkedCardId = misterResult.card._id
        invalidateCommunityPairsCache()
      } else if (sub.mode === 'mememix') {
        const mmResult = await appendMememixCommunityLegenda(sub)
        linked = { type: 'mememix', ...mmResult }
        if (mmResult.card) sub.linkedCardId = mmResult.card._id
      } else {
        const categoryMap = {
          telepatia:'telepatia', perguntas:'perguntas', proibido:'proibido',
          mimica:'mimica', desenho:'desenho', palavra:'palavra', caos:'caos', impostor:'impostor',
          acao:'acao', verdade:'verdade', consequencia:'consequencia',
          cultura:'cultura', desporto:'desporto', musica:'musica', cinema:'cinema',
          romantico:'romantico', picante:'picante', erotico:'picante', roleplay:'roleplay', quiz:'casal_pergunta',
          beber:'acao', regra:'consequencia', desafio:'acao', duelo:'acao', poder:'acao', sorte:'consequencia',
        }
        const isImpostor = sub.cardType === 'impostor'
        linked = await new Challenge({
          text:        isImpostor ? (sub.correctQuestion || sub.text) : sub.text,
          category:    isImpostor ? 'impostor' : (categoryMap[sub.cardType] || 'acao'),
          correct_question: isImpostor ? (sub.correctQuestion || sub.text || '') : '',
          wrong_question:   isImpostor ? (sub.wrongQuestion || '') : '',
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

    res.json({ message: 'Approved and added to game', sub, linked, warnings })
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
