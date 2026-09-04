const router = require('express').Router();
const CardRoom = require('../models/CardRoom');
const {
  asyncRoute,
  cleanString,
  intInRange,
  mongoId,
  mongoIdList,
  oneOf,
  roomCode,
} = require('../lib/validate');
const { allocRoomCode, generateHostSecret, generatePlayerToken, tokensEqual } = require('../lib/gameAuth');
const { cardroomPointsForResult } = require('../lib/contentSafety');

const GAME_TYPES = ['dare','truth','drinking','trivia'];

function publicRoom(room) {
  const o = typeof room.toObject === 'function' ? room.toObject() : { ...room }
  delete o.hostToken
  delete o.creatorId
  o.players = (o.players || []).map((p) => ({
    id: p.id,
    name: p.name,
    isJury: p.isJury,
    points: p.points,
    joinedAt: p.joinedAt,
  }))
  return o
}

function requireHost(room, token) {
  return tokensEqual(room.hostToken, token)
}

router.post('/create', asyncRoute(async (req, res) => {
  const creator = cleanString(req.body.creator, { field: 'creator', max: 50, required: true });
  let code
  for (let i = 0; i < 12; i += 1) {
    const candidate = allocRoomCode({})
    if (candidate && !(await CardRoom.findOne({ code: candidate }))) {
      code = candidate
      break
    }
  }
  if (!code) return res.status(503).json({ error: 'Não foi possível criar sala' })

  const creatorId = generatePlayerToken()
  const hostToken = generateHostSecret()
  const playerToken = generatePlayerToken()

  const room = await new CardRoom({
    code,
    creator,
    creatorId,
    hostToken,
    title: cleanString(req.body.title, { field: 'title', max: 80, defaultValue: 'Custom Cards Game' }),
    maxPoints: intInRange(req.body.maxPoints, { field: 'maxPoints', min: 1, max: 100, defaultValue: 21 }),
    maxPlayers: intInRange(req.body.maxPlayers, { field: 'maxPlayers', min: 2, max: 20, defaultValue: 8 }),
    gameType: oneOf(req.body.gameType, GAME_TYPES, { field: 'gameType', defaultValue: 'dare' }),
    selectedCards: mongoIdList(req.body.selectedCards),
    players: [{ id: creatorId, token: playerToken, name: creator, isJury: false }]
  }).save();

  res.status(201).json({ code: room.code, roomId: room._id, hostToken, playerToken, playerId: creatorId });
}));

router.get('/:code', asyncRoute(async (req, res) => {
  const room = await CardRoom.findOne({
    code: roomCode(req.params.code),
    status: { $ne: 'finished' }
  });
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json(publicRoom(room));
}));

router.post('/:code/join', asyncRoute(async (req, res) => {
    const playerName = cleanString(req.body.playerName, { field: 'playerName', max: 50, required: true });
    const code = roomCode(req.params.code);

    const room = await CardRoom.findOne({ code, status: 'waiting' });
    if (!room) return res.status(404).json({ error: 'Room not found or already started' });
    if (room.players.length >= room.maxPlayers) return res.status(400).json({ error: 'Room is full' });

    const playerId = generatePlayerToken()
    const playerToken = generatePlayerToken()
    room.players.push({ id: playerId, token: playerToken, name: playerName, isJury: false });
    await room.save();
    res.json({ ...publicRoom(room), playerToken, playerId });
}));

router.put('/:code/settings', asyncRoute(async (req, res) => {
    const hostToken = cleanString(req.body.hostToken, { field: 'hostToken', max: 80, required: true });
    const code = roomCode(req.params.code);

    const room = await CardRoom.findOne({ code });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (!requireHost(room, hostToken)) return res.status(403).json({ error: 'Only creator can update settings' });
    if (room.status !== 'waiting') return res.status(400).json({ error: 'Cannot modify room during game' });

    if (req.body.maxPoints !== undefined) room.maxPoints = intInRange(req.body.maxPoints, { field: 'maxPoints', min: 1, max: 100, defaultValue: room.maxPoints });
    if (req.body.maxPlayers !== undefined) room.maxPlayers = intInRange(req.body.maxPlayers, { field: 'maxPlayers', min: 2, max: 20, defaultValue: room.maxPlayers });
    if (req.body.gameType) room.gameType = oneOf(req.body.gameType, GAME_TYPES, { field: 'gameType' });
    if (req.body.selectedCards) room.selectedCards = mongoIdList(req.body.selectedCards);

    await room.save();
    res.json(publicRoom(room));
}));

router.post('/:code/jury', asyncRoute(async (req, res) => {
    const hostToken = cleanString(req.body.hostToken, { field: 'hostToken', max: 80, required: true });
    const juryIds = Array.isArray(req.body.juryIds)
      ? req.body.juryIds.map((id) => cleanString(id, { field: 'juryId', max: 80 })).filter(Boolean).slice(0, 20)
      : [];
    const code = roomCode(req.params.code);

    const room = await CardRoom.findOne({ code });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (!requireHost(room, hostToken)) return res.status(403).json({ error: 'Only creator can set jury' });

    room.players.forEach(p => p.isJury = false);
    room.players.forEach(p => {
      if (juryIds.includes(p.id)) p.isJury = true;
    });

    await room.save();
    res.json(publicRoom(room));
}));

router.post('/:code/start', asyncRoute(async (req, res) => {
    const hostToken = cleanString(req.body.hostToken, { field: 'hostToken', max: 80, required: true });
    const code = roomCode(req.params.code);

    const room = await CardRoom.findOne({ code });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (!requireHost(room, hostToken)) return res.status(403).json({ error: 'Only creator can start game' });
    if (room.players.length < 2) return res.status(400).json({ error: 'Need at least 2 players' });

    room.status = 'playing';
    room.currentRound = 1;
    room.currentPlayer = room.players[0].id;
    await room.save();

    res.json(publicRoom(room));
}));

router.post('/:code/result', asyncRoute(async (req, res) => {
    const playerToken = cleanString(req.body.playerToken, { field: 'playerToken', max: 80, required: true });
    const cardId = req.body.cardId ? mongoId(req.body.cardId, 'cardId') : undefined;
    const result = oneOf(req.body.result, ['completed', 'skipped', 'failed', 'success', 'win'], { field: 'result', defaultValue: 'completed' });
    const pointsEarned = cardroomPointsForResult(result);
    const code = roomCode(req.params.code);

    const room = await CardRoom.findOne({ code });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.status !== 'playing') return res.status(400).json({ error: 'Game not in progress' });

    const player = room.players.find(p => tokensEqual(p.token, playerToken));
    if (!player) return res.status(403).json({ error: 'Jogador inválido' });

    player.points = Math.max(0, (player.points || 0) + (pointsEarned || 0));

    room.history.push({
      round: room.currentRound,
      player: player.id,
      cardId,
      result,
      pointsEarned
    });

    if (player.points >= room.maxPoints) {
      room.status = 'finished';
      room.gameData = { winner: player.id, winnerName: player.name };
    } else {
      const currentIdx = room.players.findIndex(p => p.id === player.id);
      const nextIdx = (currentIdx + 1) % room.players.length;
      room.currentPlayer = room.players[nextIdx].id;
      room.currentRound += 1;
    }

    await room.save();
    res.json(publicRoom(room));
}));

router.post('/:code/leave', asyncRoute(async (req, res) => {
    const playerToken = cleanString(req.body.playerToken, { field: 'playerToken', max: 80, required: true });
    const code = roomCode(req.params.code);

    const room = await CardRoom.findOne({ code });
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const player = room.players.find(p => tokensEqual(p.token, playerToken));
    if (!player) return res.status(403).json({ error: 'Jogador inválido' });

    room.players = room.players.filter(p => p.id !== player.id);
    if (room.creatorId === player.id) {
      room.status = 'finished';
    }

    await room.save();
    res.json(publicRoom(room));
}));

router.get('/:code/history', asyncRoute(async (req, res) => {
  const room = await CardRoom.findOne({ code: roomCode(req.params.code) });
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json(room.history);
}));

module.exports = router;
