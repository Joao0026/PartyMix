const router = require('express').Router();
const Card = require('../models/Card');

router.get('/', async (req, res) => {
  try {
    const { is_black, category } = req.query;
    const filter = {};
    if (is_black !== undefined) filter.is_black = is_black === 'true';
    if (category) filter.category = category;
    const cards = await Card.find(filter);
    res.json(cards);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const card = new Card(req.body);
    await card.save();
    res.status(201).json(card);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await Card.findByIdAndDelete(req.params.id);
    res.json({ deleted: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
