const router = require('express').Router();
const requireAdmin = require('../middleware/requireAdmin');
const Challenge = require('../models/Challenge');

router.get('/', async (req, res) => {
  try {
    const { category, mode_type, difficulty } = req.query;
    const f = {};
    if (category)  f.category  = { $in: category.split(',') };
    if (mode_type) f.mode_type = { $in: [mode_type, 'all'] };
    if (difficulty) f.difficulty = difficulty;
    res.json(await Challenge.find(f));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/random', async (req, res) => {
  try {
    const { category, mode_type } = req.query;
    const f = {};
    if (category)  f.category  = { $in: category.split(',') };
    if (mode_type) f.mode_type = { $in: [mode_type, 'all'] };
    const count = await Challenge.countDocuments(f);
    if (!count) return res.status(404).json({ error: 'No challenges found' });
    res.json(await Challenge.findOne(f).skip(Math.floor(Math.random() * count)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', requireAdmin, async (req, res) => {
  try { res.status(201).json(await new Challenge(req.body).save()); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try { await Challenge.findByIdAndDelete(req.params.id); res.json({ deleted: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
