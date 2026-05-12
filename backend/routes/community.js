const router = require('express').Router()
const requireAdmin = require('../middleware/requireAdmin')
const CommunitySubmission = require('../models/CommunitySubmission')
const Card = require('../models/Card')
const Challenge = require('../models/Challenge')

// GET /api/community?status=pending&mode=friends&page=1
router.get('/', async (req, res) => {
  try {
    const { status, mode, submissionType, page = 1, limit = 50 } = req.query
    const filter = {}
    if (status)         filter.status = status
    if (mode)           filter.mode = mode
    if (submissionType) filter.submissionType = submissionType

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const [items, total] = await Promise.all([
      CommunitySubmission.find(filter).sort({ votes: -1, createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      CommunitySubmission.countDocuments(filter),
    ])
    res.json({ items, total, page: parseInt(page) })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/community — submit a card or idea
router.post('/', async (req, res) => {
  try {
    const { submissionType, mode, cardType, isBlack, text, ideaType, author } = req.body
    if (!text?.trim()) return res.status(400).json({ error: 'Text required' })

    const sub = await new CommunitySubmission({
      submissionType, mode, cardType,
      isBlack: Boolean(isBlack),
      text: text.trim(),
      ideaType, author: author || 'Anónimo',
    }).save()

    res.status(201).json(sub)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

// POST /api/community/:id/vote
router.post('/:id/vote', async (req, res) => {
  try {
    const sub = await CommunitySubmission.findByIdAndUpdate(
      req.params.id,
      { $inc: { votes: 1 } },
      { new: true }
    )
    if (!sub) return res.status(404).json({ error: 'Not found' })

    // Auto-approve when votes reach threshold
    if (sub.votes >= 25 && sub.status === 'pending') {
      sub.status = 'approved'
      await sub.save()
    }

    res.json(sub)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/community/:id/approve — admin manually approves + creates real card/challenge
router.post('/:id/approve', requireAdmin, async (req, res) => {
  try {
    const sub = await CommunitySubmission.findById(req.params.id)
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
        }).save()
        sub.linkedCardId = linked._id
      } else {
        // Create a Challenge document
        const categoryMap = {
          mimica:'mimica', desenho:'desenho', palavra:'palavra',
          acao:'acao', verdade:'verdade', consequencia:'consequencia',
          cultura:'cultura', desporto:'desporto', musica:'musica', cinema:'cinema',
          erotico:'erotico', roleplay:'erotico', quiz:'casal_pergunta',
          beber:'acao', regra:'acao', desafio:'acao', poder:'acao', sorte:'acao',
        }
        linked = await new Challenge({
          text:        sub.text,
          category:    categoryMap[sub.cardType] || 'acao',
          mode_type:   sub.mode === 'couple' ? 'couple' : sub.mode === 'family' ? 'family' : 'friends',
          difficulty:  'medio',
          sips_penalty: 2,
        }).save()
        sub.linkedChallengeId = linked._id
      }
    }

    sub.status = 'approved'
    await sub.save()

    res.json({ message: 'Approved and added to game', sub, linked })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/community/:id/reject
router.post('/:id/reject', requireAdmin, async (req, res) => {
  try {
    const sub = await CommunitySubmission.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected' },
      { new: true }
    )
    if (!sub) return res.status(404).json({ error: 'Not found' })
    res.json(sub)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// DELETE /api/community/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await CommunitySubmission.findByIdAndDelete(req.params.id)
    res.json({ deleted: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/community/stats — for admin dashboard
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const [pending, approved, rejected, total] = await Promise.all([
      CommunitySubmission.countDocuments({ status: 'pending' }),
      CommunitySubmission.countDocuments({ status: 'approved' }),
      CommunitySubmission.countDocuments({ status: 'rejected' }),
      CommunitySubmission.countDocuments(),
    ])
    res.json({ pending, approved, rejected, total })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router
