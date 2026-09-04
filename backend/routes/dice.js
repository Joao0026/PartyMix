const router = require('express').Router();
const requireAdmin = require('../middleware/requireAdmin');
const D = require('../models/DiceOption');
const { asyncRoute, oneOf, mongoId } = require('../lib/validate');

router.get('/', asyncRoute(async (req, res) => {
  const filter = {}
  if (req.query.dice_type) filter.dice_type = oneOf(req.query.dice_type, ['body_part', 'action'], { field: 'dice_type' })
  res.json(await D.find(filter))
}))

router.get('/roll', asyncRoute(async (req, res) => {
  const [bp, ac] = await Promise.all([D.find({ dice_type: 'body_part' }), D.find({ dice_type: 'action' })]);
  const r = a => a[Math.floor(Math.random() * a.length)];
  res.json({ body_part: r(bp), action: r(ac) });
}))

router.post('/', requireAdmin, asyncRoute(async (req, res) => {
  const dice_type = oneOf(req.body.dice_type, ['body_part', 'action'], { field: 'dice_type', required: true })
  const text = typeof req.body.text === 'string' ? req.body.text.replace(/<[^>]*>/g, '').trim().slice(0, 80) : ''
  if (!text) return res.status(400).json({ error: 'text é obrigatório' })
  res.status(201).json(await new D({ dice_type, text }).save());
}))

router.delete('/:id', requireAdmin, asyncRoute(async (req, res) => {
  await D.findByIdAndDelete(mongoId(req.params.id));
  res.json({ deleted: true });
}))

module.exports = router;
