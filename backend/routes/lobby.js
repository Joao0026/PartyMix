const router = require('express').Router();
const Lobby = require('../models/Lobby');
const { asyncRoute, cleanString, jsonWithinLimit, roomCode } = require('../lib/validate');
const { allocRoomCode, generateHostSecret, tokensEqual } = require('../lib/gameAuth');

const MAX_LOBBY_PLAYERS = 15

router.post('/create', asyncRoute(async (req, res) => {
  const host = cleanString(req.body.host, { field: 'host', max: 50, required: true });
  let code
  for (let i = 0; i < 12; i += 1) {
    const candidate = allocRoomCode({})
    if (candidate && !(await Lobby.findOne({ code: candidate }))) {
      code = candidate
      break
    }
  }
  if (!code) return res.status(503).json({ error: 'Não foi possível criar lobby' })
  const hostToken = generateHostSecret()
  const lobby = await new Lobby({ code, host, hostToken, players: [{ name: host }] }).save();
  res.status(201).json({
    code: lobby.code,
    host: lobby.host,
    status: lobby.status,
    players: lobby.players,
    hostToken,
  });
}));

function publicLobby(lobby) {
  return {
    code: lobby.code,
    host: lobby.host,
    players: lobby.players,
    status: lobby.status,
  }
}

router.get('/:code', asyncRoute(async (req, res) => {
  const lobby = await Lobby.findOne({ code: roomCode(req.params.code), status: 'waiting' });
  if (!lobby) return res.status(404).json({ error: 'Lobby não encontrado' });
  res.json(publicLobby(lobby));
}));

router.post('/:code/join', asyncRoute(async (req, res) => {
  const code = roomCode(req.params.code);
  const name = cleanString(req.body.name, { field: 'name', max: 50, required: true });
  const lobby = await Lobby.findOneAndUpdate(
    {
      code,
      status: 'waiting',
      'players.name': { $ne: name },
      $expr: { $lt: [{ $size: '$players' }, MAX_LOBBY_PLAYERS] },
    },
    { $push: { players: { name } } },
    { new: true }
  );
  if (!lobby) {
    const existing = await Lobby.findOne({ code, status: 'waiting' });
    if (!existing) return res.status(404).json({ error: 'Lobby não encontrado' });
    if (existing.players.some((p) => p.name === name)) {
      return res.status(400).json({ error: 'Nome já em uso' });
    }
    return res.status(400).json({ error: 'Lobby cheio' });
  }
  res.json(publicLobby(lobby));
}));

router.post('/:code/start', asyncRoute(async (req, res) => {
  const lobby = await Lobby.findOne({ code: roomCode(req.params.code) });
  if (!lobby) return res.status(404).json({ error: 'Lobby não encontrado' });
  if (!tokensEqual(lobby.hostToken, req.body.hostToken)) {
    return res.status(403).json({ error: 'Só o host pode iniciar' });
  }
  if (lobby.status !== 'waiting') {
    return res.status(400).json({ error: 'O jogo já está a decorrer' });
  }
  lobby.status = 'playing'
  lobby.gameData = jsonWithinLimit(req.body.gameData, { field: 'gameData' })
  await lobby.save()
  res.json(publicLobby(lobby));
}));

module.exports = router;
