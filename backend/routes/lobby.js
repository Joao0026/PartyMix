const router = require('express').Router();
const Lobby = require('../models/Lobby');

function genCode() { return Math.random().toString(36).substring(2, 6).toUpperCase(); }

router.post('/create', async (req, res) => {
  try {
    let code, exists;
    do { code = genCode(); exists = await Lobby.findOne({ code }); } while (exists);
    const lobby = await new Lobby({ code, host: req.body.host, players: [{ name: req.body.host }] }).save();
    res.status(201).json(lobby);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:code', async (req, res) => {
  try {
    const lobby = await Lobby.findOne({ code: req.params.code.toUpperCase(), status: 'waiting' });
    if (!lobby) return res.status(404).json({ error: 'Lobby não encontrado' });
    res.json(lobby);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:code/join', async (req, res) => {
  try {
    const lobby = await Lobby.findOneAndUpdate(
      { code: req.params.code.toUpperCase(), status: 'waiting' },
      { $push: { players: { name: req.body.name } } },
      { new: true }
    );
    if (!lobby) return res.status(404).json({ error: 'Lobby não encontrado' });
    res.json(lobby);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:code/start', async (req, res) => {
  try {
    const lobby = await Lobby.findOneAndUpdate(
      { code: req.params.code.toUpperCase() },
      { status: 'playing', gameData: req.body.gameData || {} },
      { new: true }
    );
    res.json(lobby);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
