const router = require('express').Router();
const SexPosition = require('../models/SexPosition');

router.get('/', async (req, res) => {
  try {
    const positions = await SexPosition.find();
    res.json(positions);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/random', async (req, res) => {
  try {
    const count = await SexPosition.countDocuments();
    const position = await SexPosition.findOne().skip(Math.floor(Math.random() * count));
    res.json(position);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const position = new SexPosition(req.body);
    await position.save();
    res.status(201).json(position);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await SexPosition.findByIdAndDelete(req.params.id);
    res.json({ deleted: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
