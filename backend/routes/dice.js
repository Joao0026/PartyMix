const router = require('express').Router();
const DiceOption = require('../models/DiceOption');

router.get('/', async (req, res) => {
  try {
    const { dice_type } = req.query;
    const filter = dice_type ? { dice_type } : {};
    const options = await DiceOption.find(filter);
    res.json(options);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/roll', async (req, res) => {
  try {
    const [bodyParts, actions] = await Promise.all([
      DiceOption.find({ dice_type: 'body_part' }),
      DiceOption.find({ dice_type: 'action' })
    ]);
    const rand = arr => arr[Math.floor(Math.random() * arr.length)];
    res.json({ body_part: rand(bodyParts), action: rand(actions) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const option = new DiceOption(req.body);
    await option.save();
    res.status(201).json(option);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await DiceOption.findByIdAndDelete(req.params.id);
    res.json({ deleted: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
