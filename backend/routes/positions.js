const router = require('express').Router();
const requireAdmin = require('../middleware/requireAdmin');
const P = require('../models/SexPosition');
const { asyncRoute, cleanString, mongoId, oneOf } = require('../lib/validate');

router.get('/', asyncRoute(async (req, res) => {
  res.json(await P.find());
}));

router.get('/random', asyncRoute(async (req, res) => {
  const c = await P.countDocuments();
  if (!c) return res.status(404).json({ error: 'Sem posições' });
  res.json(await P.findOne().skip(Math.floor(Math.random() * c)));
}));

router.post('/', requireAdmin, asyncRoute(async (req, res) => {
  const payload = {
    name: cleanString(req.body.name, { field: 'name', max: 80, required: true }),
    description: cleanString(req.body.description, { field: 'description', max: 400, required: true }),
    difficulty: oneOf(req.body.difficulty, ['facil', 'medio', 'dificil'], { field: 'difficulty', defaultValue: 'medio' }),
    tip: cleanString(req.body.tip, { field: 'tip', max: 300, defaultValue: '' }),
  };
  res.status(201).json(await new P(payload).save());
}));

router.delete('/:id', requireAdmin, asyncRoute(async (req, res) => {
  await P.findByIdAndDelete(mongoId(req.params.id));
  res.json({ deleted: true });
}));

module.exports = router;
