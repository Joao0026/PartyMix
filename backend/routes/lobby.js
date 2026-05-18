const router = require('express').Router();
const Lobby = require('../models/Lobby');
const { asyncRoute, cleanString, jsonWithinLimit, roomCode } = require('../lib/validate');

function genCode() { return Math.random().toString(36).substring(2, 6).toUpperCase(); }

router.post('/create', asyncRoute(async (req, res) => {
  const host = cleanString(req.body.host, { field: 'host', max: 50, required: true });
  let code, exists;
  do { code = genCode(); exists = await Lobby.findOne({ code }); } while (exists);
  const lobby = await new Lobby({ code, host, players: [{ name: host }] }).save();
  res.status(201).json(lobby);
}));

router.get('/:code', asyncRoute(async (req, res) => {
  const lobby = await Lobby.findOne({ code: roomCode(req.params.code), status: 'waiting' });
  if (!lobby) return res.status(404).json({ error: 'Lobby não encontrado' });
  res.json(lobby);
}));

router.post('/:code/join', asyncRoute(async (req, res) => {
  const code = roomCode(req.params.code);
  const name = cleanString(req.body.name, { field: 'name', max: 50, required: true });
  const lobby = await Lobby.findOneAndUpdate(
    { code, status: 'waiting' },
    { $push: { players: { name } } },
    { new: true }
  );
  if (!lobby) return res.status(404).json({ error: 'Lobby não encontrado' });
  res.json(lobby);
}));

router.post('/:code/start', asyncRoute(async (req, res) => {
  const lobby = await Lobby.findOneAndUpdate(
    { code: roomCode(req.params.code) },
    { status: 'playing', gameData: jsonWithinLimit(req.body.gameData, { field: 'gameData' }) },
    { new: true }
  );
  if (!lobby) return res.status(404).json({ error: 'Lobby não encontrado' });
  res.json(lobby);
}));

module.exports = router;
