const router = require('express').Router();
const P = require('../models/SexPosition');
router.get('/', async (req, res) => { try { res.json(await P.find()); } catch (e) { res.status(500).json({ error: e.message }); } });
router.get('/random', async (req, res) => {
  try { const c = await P.countDocuments(); res.json(await P.findOne().skip(Math.floor(Math.random() * c))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/', async (req, res) => { try { res.status(201).json(await new P(req.body).save()); } catch (e) { res.status(400).json({ error: e.message }); } });
router.delete('/:id', async (req, res) => { try { await P.findByIdAndDelete(req.params.id); res.json({ deleted: true }); } catch (e) { res.status(500).json({ error: e.message }); } });
module.exports = router;
