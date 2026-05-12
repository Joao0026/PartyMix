const router = require('express').Router();
const requireAdmin = require('../middleware/requireAdmin');
const Card = require('../models/Card');
router.get('/', async (req, res) => {
  try {
    const f = {};
    if (req.query.is_black !== undefined) f.is_black = req.query.is_black === 'true';
    if (req.query.category) f.category = req.query.category;
    res.json(await Card.find(f));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/', requireAdmin, async (req, res) => {
  try { res.status(201).json(await new Card(req.body).save()); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
router.delete('/:id', requireAdmin, async (req, res) => {
  try { await Card.findByIdAndDelete(req.params.id); res.json({ deleted: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
module.exports = router;
