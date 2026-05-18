const router = require('express').Router();
const requireAdmin = require('../middleware/requireAdmin');
const Card = require('../models/Card');
const { asyncRoute, bool, cleanString, mongoId, oneOf } = require('../lib/validate');

const CARD_CATEGORIES = ['geral','adulto','cultura','absurdo','regra','beber','desafio','poder','sorte'];
const AUDIENCES = ['family','adult','all',''];

router.get('/', asyncRoute(async (req, res) => {
  const f = {};
  if (req.query.is_black !== undefined) f.is_black = bool(req.query.is_black);
  if (req.query.category) f.category = oneOf(req.query.category, CARD_CATEGORIES, { field: 'category' });
  res.json(await Card.find(f));
}));

router.post('/', requireAdmin, asyncRoute(async (req, res) => {
  const payload = {
    text: cleanString(req.body.text, { field: 'text', max: 300, required: true }),
    category: oneOf(req.body.category, CARD_CATEGORIES, { field: 'category', defaultValue: 'geral' }),
    is_black: bool(req.body.is_black),
    mode_type: cleanString(req.body.mode_type, { field: 'mode_type', max: 30, defaultValue: 'cards' }),
    pack: cleanString(req.body.pack, { field: 'pack', max: 60, defaultValue: 'base' }),
    audience: oneOf(req.body.audience, AUDIENCES, { field: 'audience', defaultValue: '' }),
  };
  res.status(201).json(await new Card(payload).save());
}));

router.delete('/:id', requireAdmin, asyncRoute(async (req, res) => {
  await Card.findByIdAndDelete(mongoId(req.params.id));
  res.json({ deleted: true });
}));
module.exports = router;
