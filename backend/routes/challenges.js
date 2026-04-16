const router = require('express').Router();
const Challenge = require('../models/Challenge');

// GET all with filters
router.get('/', async (req, res) => {
  try {
    const { category, mode_type, difficulty, limit } = req.query;
    const filter = {};
    if (category) filter.category = { $in: category.split(',') };
    if (mode_type) filter.mode_type = { $in: [mode_type, 'all'] };
    if (difficulty) filter.difficulty = difficulty;
    let query = Challenge.find(filter);
    if (limit) query = query.limit(parseInt(limit));
    const challenges = await query;
    res.json(challenges);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET random challenge
router.get('/random', async (req, res) => {
  try {
    const { category, mode_type } = req.query;
    const filter = {};
    if (category) filter.category = { $in: category.split(',') };
    if (mode_type) filter.mode_type = { $in: [mode_type, 'all'] };
    const count = await Challenge.countDocuments(filter);
    const random = Math.floor(Math.random() * count);
    const challenge = await Challenge.findOne(filter).skip(random);
    res.json(challenge);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST create
router.post('/', async (req, res) => {
  try {
    const challenge = new Challenge(req.body);
    await challenge.save();
    res.status(201).json(challenge);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    await Challenge.findByIdAndDelete(req.params.id);
    res.json({ deleted: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
