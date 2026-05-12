const router = require('express').Router();
const requireAdmin = require('../middleware/requireAdmin');
const D = require('../models/DiceOption');
router.get('/', async (req, res) => { try { res.json(await D.find(req.query.dice_type ? { dice_type: req.query.dice_type } : {})); } catch (e) { res.status(500).json({ error: e.message }); } });
router.get('/roll', async (req, res) => {
  try {
    const [bp, ac] = await Promise.all([D.find({ dice_type: 'body_part' }), D.find({ dice_type: 'action' })]);
    const r = a => a[Math.floor(Math.random() * a.length)];
    res.json({ body_part: r(bp), action: r(ac) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/', requireAdmin, async (req, res) => { try { res.status(201).json(await new D(req.body).save()); } catch (e) { res.status(400).json({ error: e.message }); } });
router.delete('/:id', requireAdmin, async (req, res) => { try { await D.findByIdAndDelete(req.params.id); res.json({ deleted: true }); } catch (e) { res.status(500).json({ error: e.message }); } });
module.exports = router;
