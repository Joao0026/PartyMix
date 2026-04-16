const router = require('express').Router();
const Lobby = require('../models/Lobby');

function generateCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

router.post('/create', async (req, res) => {
  try {
    const { host } = req.body;
    let code, exists;
    do {
      code = generateCode();
      exists = await Lobby.findOne({ code });
    } while (exists);
    const lobby = new Lobby({ code, host, players: [{ name: host }] });
    await lobby.save();
    res.status(201).json(lobby);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:code', async (req, res) => {
  try {
    const lobby = await Lobby.findOne({ code: req.params.code.toUpperCase(), status: 'waiting' });
    if (!lobby) return res.status(404).json({ error: 'Lobby não encontrado' });
    res.json(lobby);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:code/join', async (req, res) => {
  try {
    const { name } = req.body;
    const lobby = await Lobby.findOneAndUpdate(
      { code: req.params.code.toUpperCase(), status: 'waiting' },
      { $push: { players: { name } } },
      { new: true }
    );
    if (!lobby) return res.status(404).json({ error: 'Lobby não encontrado' });
    res.json(lobby);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:code/start', async (req, res) => {
  try {
    const lobby = await Lobby.findOneAndUpdate(
      { code: req.params.code.toUpperCase() },
      { status: 'playing', gameData: req.body.gameData || {} },
      { new: true }
    );
    res.json(lobby);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
