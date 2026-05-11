const router = require('express').Router();
const CardRoom = require('../models/CardRoom');
const Card = require('../models/Card');

// Generate a unique 4-character alphanumeric code
function genCode() { 
  return Math.random().toString(36).substring(2, 6).toUpperCase(); 
}

// Create a new card room
router.post('/create', async (req, res) => {
  try {
    const { creator, creatorId, title, maxPoints, maxPlayers, gameType, selectedCards } = req.body;
    
    if (!creator || !creatorId) {
      return res.status(400).json({ error: 'Creator information required' });
    }

    let code, exists;
    do { 
      code = genCode(); 
      exists = await CardRoom.findOne({ code }); 
    } while (exists);

    const room = await new CardRoom({ 
      code, 
      creator,
      creatorId,
      title,
      maxPoints: maxPoints || 21,
      maxPlayers: maxPlayers || 8,
      gameType: gameType || 'dare',
      selectedCards: selectedCards || [],
      players: [{ id: creatorId, name: creator, isJury: false }]
    }).save();

    res.status(201).json({ code: room.code, roomId: room._id });
  } catch (e) { 
    res.status(500).json({ error: e.message }); 
  }
});

// Get room info by code
router.get('/:code', async (req, res) => {
  try {
    const room = await CardRoom.findOne({ 
      code: req.params.code.toUpperCase(),
      status: { $ne: 'finished' }
    });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json(room);
  } catch (e) { 
    res.status(500).json({ error: e.message }); 
  }
});

// Join a room
router.post('/:code/join', async (req, res) => {
  try {
    const { playerId, playerName } = req.body;
    const code = req.params.code.toUpperCase();

    const room = await CardRoom.findOne({ code, status: 'waiting' });
    if (!room) return res.status(404).json({ error: 'Room not found or already started' });
    if (room.players.length >= room.maxPlayers) return res.status(400).json({ error: 'Room is full' });
    
    // Check if player already joined
    const existing = room.players.find(p => p.id === playerId);
    if (existing) return res.json(room);

    room.players.push({ id: playerId, name: playerName, isJury: false });
    await room.save();
    res.json(room);
  } catch (e) { 
    res.status(500).json({ error: e.message }); 
  }
});

// Update room settings (creator only)
router.put('/:code/settings', async (req, res) => {
  try {
    const { creatorId, maxPoints, maxPlayers, gameType, selectedCards } = req.body;
    const code = req.params.code.toUpperCase();

    const room = await CardRoom.findOne({ code });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.creatorId !== creatorId) return res.status(403).json({ error: 'Only creator can update settings' });
    if (room.status !== 'waiting') return res.status(400).json({ error: 'Cannot modify room during game' });

    if (maxPoints) room.maxPoints = Math.max(1, Math.min(100, maxPoints));
    if (maxPlayers) room.maxPlayers = Math.max(2, Math.min(20, maxPlayers));
    if (gameType) room.gameType = gameType;
    if (selectedCards) room.selectedCards = selectedCards;

    await room.save();
    res.json(room);
  } catch (e) { 
    res.status(500).json({ error: e.message }); 
  }
});

// Set jury members (creator only)
router.post('/:code/jury', async (req, res) => {
  try {
    const { creatorId, juryIds } = req.body;
    const code = req.params.code.toUpperCase();

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
  } catch (e) { 
    res.status(500).json({ error: e.message }); 
  }
});

// Start the game
router.post('/:code/start', async (req, res) => {
  try {
    const { creatorId } = req.body;
    const code = req.params.code.toUpperCase();

    const room = await CardRoom.findOne({ code });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.creatorId !== creatorId) return res.status(403).json({ error: 'Only creator can start game' });
    if (room.players.length < 2) return res.status(400).json({ error: 'Need at least 2 players' });

    room.status = 'playing';
    room.currentRound = 1;
    room.currentPlayer = room.players[0].id;
    await room.save();

    res.json(room);
  } catch (e) { 
    res.status(500).json({ error: e.message }); 
  }
});

// Record a round result
router.post('/:code/result', async (req, res) => {
  try {
    const { playerId, cardId, result, pointsEarned } = req.body;
    const code = req.params.code.toUpperCase();

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
      pointsEarned: pointsEarned || 0
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
  } catch (e) { 
    res.status(500).json({ error: e.message }); 
  }
});

// Leave a room
router.post('/:code/leave', async (req, res) => {
  try {
    const { playerId } = req.body;
    const code = req.params.code.toUpperCase();

    const room = await CardRoom.findOne({ code });
    if (!room) return res.status(404).json({ error: 'Room not found' });

    room.players = room.players.filter(p => p.id !== playerId);

    // If creator left, end the game
    if (room.creatorId === playerId) {
      room.status = 'finished';
    }

    await room.save();
    res.json(room);
  } catch (e) { 
    res.status(500).json({ error: e.message }); 
  }
});

// Get room history
router.get('/:code/history', async (req, res) => {
  try {
    const room = await CardRoom.findOne({ code: req.params.code.toUpperCase() });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json(room.history);
  } catch (e) { 
    res.status(500).json({ error: e.message }); 
  }
});

module.exports = router;
