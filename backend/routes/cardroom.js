const router = require('express').Router();
const CardRoom = require('../models/CardRoom');
const Card = require('../models/Card');
const {
  asyncRoute,
  cleanString,
  intInRange,
  mongoId,
  mongoIdList,
  oneOf,
  roomCode,
} = require('../lib/validate');

const GAME_TYPES = ['dare','truth','drinking','trivia'];

// Generate a unique 4-character alphanumeric code
function genCode() { 
  return Math.random().toString(36).substring(2, 6).toUpperCase(); 
}

// Create a new card room
router.post('/create', asyncRoute(async (req, res) => {
  const creator = cleanString(req.body.creator, { field: 'creator', max: 50, required: true });
  const creatorId = cleanString(req.body.creatorId, { field: 'creatorId', max: 80, required: true });

  let code, exists;
  do { 
    code = genCode(); 
    exists = await CardRoom.findOne({ code }); 
  } while (exists);

  const room = await new CardRoom({ 
    code, 
    creator,
    creatorId,
    title: cleanString(req.body.title, { field: 'title', max: 80, defaultValue: 'Custom Cards Game' }),
    maxPoints: intInRange(req.body.maxPoints, { field: 'maxPoints', min: 1, max: 100, defaultValue: 21 }),
    maxPlayers: intInRange(req.body.maxPlayers, { field: 'maxPlayers', min: 2, max: 20, defaultValue: 8 }),
    gameType: oneOf(req.body.gameType, GAME_TYPES, { field: 'gameType', defaultValue: 'dare' }),
    selectedCards: mongoIdList(req.body.selectedCards),
    players: [{ id: creatorId, name: creator, isJury: false }]
  }).save();

  res.status(201).json({ code: room.code, roomId: room._id });
}));

// Get room info by code
router.get('/:code', asyncRoute(async (req, res) => {
  const room = await CardRoom.findOne({ 
    code: roomCode(req.params.code),
    status: { $ne: 'finished' }
  });
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json(room);
}));

// Join a room
router.post('/:code/join', asyncRoute(async (req, res) => {
    const playerId = cleanString(req.body.playerId, { field: 'playerId', max: 80, required: true });
    const playerName = cleanString(req.body.playerName, { field: 'playerName', max: 50, required: true });
    const code = roomCode(req.params.code);

    const room = await CardRoom.findOne({ code, status: 'waiting' });
    if (!room) return res.status(404).json({ error: 'Room not found or already started' });
    if (room.players.length >= room.maxPlayers) return res.status(400).json({ error: 'Room is full' });
    
    // Check if player already joined
    const existing = room.players.find(p => p.id === playerId);
    if (existing) return res.json(room);

    room.players.push({ id: playerId, name: playerName, isJury: false });
    await room.save();
    res.json(room);
}));

// Update room settings (creator only)
router.put('/:code/settings', asyncRoute(async (req, res) => {
    const creatorId = cleanString(req.body.creatorId, { field: 'creatorId', max: 80, required: true });
    const code = roomCode(req.params.code);

    const room = await CardRoom.findOne({ code });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.creatorId !== creatorId) return res.status(403).json({ error: 'Only creator can update settings' });
    if (room.status !== 'waiting') return res.status(400).json({ error: 'Cannot modify room during game' });

    if (req.body.maxPoints !== undefined) room.maxPoints = intInRange(req.body.maxPoints, { field: 'maxPoints', min: 1, max: 100, defaultValue: room.maxPoints });
    if (req.body.maxPlayers !== undefined) room.maxPlayers = intInRange(req.body.maxPlayers, { field: 'maxPlayers', min: 2, max: 20, defaultValue: room.maxPlayers });
    if (req.body.gameType) room.gameType = oneOf(req.body.gameType, GAME_TYPES, { field: 'gameType' });
    if (req.body.selectedCards) room.selectedCards = mongoIdList(req.body.selectedCards);

    await room.save();
    res.json(room);
}));

// Set jury members (creator only)
router.post('/:code/jury', asyncRoute(async (req, res) => {
    const creatorId = cleanString(req.body.creatorId, { field: 'creatorId', max: 80, required: true });
    const juryIds = Array.isArray(req.body.juryIds)
      ? req.body.juryIds.map((id) => cleanString(id, { field: 'juryId', max: 80 })).filter(Boolean).slice(0, 20)
      : [];
    const code = roomCode(req.params.code);

    const room = await CardRoom.findOne({ code });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.creatorId !== creatorId) return res.status(403).json({ error: 'Only creator can set jury' });

    // Reset jury flags then set selected players as jury
    room.players.forEach(p => p.isJury = false);
    room.players.forEach(p => {
      if (juryIds.includes(p.id)) p.isJury = true;
    });

    await room.save();
    res.json(room);
}));

// Start the game
router.post('/:code/start', asyncRoute(async (req, res) => {
    const creatorId = cleanString(req.body.creatorId, { field: 'creatorId', max: 80, required: true });
    const code = roomCode(req.params.code);

    const room = await CardRoom.findOne({ code });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.creatorId !== creatorId) return res.status(403).json({ error: 'Only creator can start game' });
    if (room.players.length < 2) return res.status(400).json({ error: 'Need at least 2 players' });

    room.status = 'playing';
    room.currentRound = 1;
    room.currentPlayer = room.players[0].id;
    await room.save();

    res.json(room);
}));

// Record a round result
router.post('/:code/result', asyncRoute(async (req, res) => {
    const playerId = cleanString(req.body.playerId, { field: 'playerId', max: 80, required: true });
    const cardId = req.body.cardId ? mongoId(req.body.cardId, 'cardId') : undefined;
    const result = cleanString(req.body.result, { field: 'result', max: 40, defaultValue: 'completed' });
    const pointsEarned = intInRange(req.body.pointsEarned, { field: 'pointsEarned', min: -20, max: 20, defaultValue: 0 });
    const code = roomCode(req.params.code);

    const room = await CardRoom.findOne({ code });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.status !== 'playing') return res.status(400).json({ error: 'Game not in progress' });

    // Update player points
    const player = room.players.find(p => p.id === playerId);
    if (player) {
      player.points = Math.max(0, (player.points || 0) + (pointsEarned || 0));
    }

    // Record in history
    room.history.push({
      round: room.currentRound,
      player: playerId,
      cardId,
      result,
      pointsEarned
    });

    // Check for victory condition
    if (player && player.points >= room.maxPoints) {
      room.status = 'finished';
      room.gameData = { winner: playerId, winnerName: player.name };
    } else {
      // Move to next player
      const currentIdx = room.players.findIndex(p => p.id === playerId);
      const nextIdx = (currentIdx + 1) % room.players.length;
      room.currentPlayer = room.players[nextIdx].id;
      room.currentRound += 1;
    }

    await room.save();
    res.json(room);
}));

// Leave a room
router.post('/:code/leave', asyncRoute(async (req, res) => {
    const playerId = cleanString(req.body.playerId, { field: 'playerId', max: 80, required: true });
    const code = roomCode(req.params.code);

    const room = await CardRoom.findOne({ code });
    if (!room) return res.status(404).json({ error: 'Room not found' });

    room.players = room.players.filter(p => p.id !== playerId);

    // If creator left, end the game
    if (room.creatorId === playerId) {
      room.status = 'finished';
    }

    await room.save();
    res.json(room);
}));

// Get room history
router.get('/:code/history', asyncRoute(async (req, res) => {
  const room = await CardRoom.findOne({ code: roomCode(req.params.code) });
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json(room.history);
}));

module.exports = router;
