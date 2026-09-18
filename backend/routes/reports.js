const router = require('express').Router()
const requireAdmin = require('../middleware/requireAdmin')
const { asyncRoute, oneOf, cleanString } = require('../lib/validate')
const { REVIEW_ACTIONS } = require('../lib/ugcPolicy')
const { listReports, pendingCount, reviewReport } = require('../lib/ugcStore')
const { forceRemoveMemeFromRoom, mmRooms } = require('../lib/mememixSocket')
const CommunitySubmission = require('../models/CommunitySubmission')
const { track } = require('../lib/observability')

router.get('/', requireAdmin, asyncRoute(async (req, res) => {
  const status = req.query.status
    ? oneOf(req.query.status, ['pending', 'dismissed', 'hidden', 'removed', 'all'], { field: 'status' })
    : 'pending'
  const items = listReports({ status: status === 'all' ? undefined : status })
  res.json({ items, pending: pendingCount() })
}))

router.get('/stats', requireAdmin, asyncRoute(async (_req, res) => {
  res.json({ pending: pendingCount() })
}))

router.post('/:id/review', requireAdmin, asyncRoute(async (req, res) => {
  const action = oneOf(req.body?.action, REVIEW_ACTIONS, { field: 'action', required: true })
  const result = reviewReport(req.params.id, action)
  if (!result.ok) return res.status(400).json({ error: result.error })

  if (result.remove && result.kind === 'community') {
    try {
      await CommunitySubmission.findByIdAndUpdate(result.targetId, { status: 'rejected' })
    } catch { /* optional */ }
  }
  if (result.remove && result.kind === 'mememix') {
    for (const room of Object.values(mmRooms)) {
      if ((room.memes || []).some((m) => m.id === result.targetId)) {
        forceRemoveMemeFromRoom(room.code, result.targetId)
      }
    }
  }

  track('ugc_reviewed', { errorCode: `ugc_${result.report.status}` })
  res.json(result)
}))

router.post('/:id/note', requireAdmin, asyncRoute(async (req, res) => {
  cleanString(req.body?.note, { field: 'note', max: 200 })
  res.json({ ok: true })
}))

module.exports = router
