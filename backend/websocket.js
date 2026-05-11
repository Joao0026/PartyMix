// backend/websocket.js — Socket.io for multi-device Cards mode
// Add this to your server.js:
//   const { initWebSocket } = require('./websocket')
//   const server = require('http').createServer(app)
//   initWebSocket(server)
//   server.listen(PORT, ...)  // replace app.listen with server.listen

const { Server } = require('socket.io')

// In-memory game rooms (resets on server restart — acceptable for party game)
const rooms = {}

function initWebSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET','POST'] }
  })

  io.on('connection', (socket) => {

    // ── CREATE ROOM ──────────────────────────────────────────
    socket.on('create_room', ({ playerName, packs }) => {
      const code = Math.random().toString(36).substring(2,6).toUpperCase()
      rooms[code] = {
        code,
        host:      playerName,
        players:   [{ id:socket.id, name:playerName, score:0 }],
        packs:     packs || ['base'],
        status:    'waiting', // waiting | playing | ended
        czarIdx:   0,
        round:     0,
        blackCard: null,
        whiteDeck: [],
        blackDeck: [],
        hands:     {}, // { socketId: [cards] }
        submissions:{},// { socketId: cardText }
        revealed:  false,
        roundWinner: null,
      }
      socket.join(code)
      socket.emit('room_created', { code, room: sanitize(rooms[code]) })
    })

    // ── JOIN ROOM ─────────────────────────────────────────────
    socket.on('join_room', ({ code, playerName }) => {
      const room = rooms[code.toUpperCase()]
      if (!room) { socket.emit('error', 'Sala não encontrada'); return }
      if (room.status !== 'waiting') { socket.emit('error', 'Jogo já começou'); return }
      if (room.players.find(p=>p.name===playerName)) { socket.emit('error', 'Nome já em uso'); return }

      room.players.push({ id:socket.id, name:playerName, score:0 })
      socket.join(code.toUpperCase())
      socket.emit('room_joined', { code:code.toUpperCase(), room:sanitize(room) })
      io.to(code.toUpperCase()).emit('room_updated', sanitize(room))
    })

    // ── START GAME (host only) ────────────────────────────────
    socket.on('start_game', ({ code, cardData }) => {
      const room = rooms[code]
      if (!room) return
      if (room.players[0].id !== socket.id) { socket.emit('error','Só o host pode iniciar'); return }
      if (room.players.length < 2) { socket.emit('error','Precisas de pelo menos 2 jogadores'); return }

      // cardData = { black:[...], white:[...] } sent from frontend
      const { black, white } = cardData
      const shuffled = arr => arr.sort(()=>Math.random()-0.5)

      room.blackDeck = shuffled([...black])
      room.whiteDeck = shuffled([...white])
      room.status    = 'playing'
      room.round     = 1
      room.czarIdx   = 0

      // Deal 7 white cards to each player
      room.players.forEach(p => {
        room.hands[p.id] = room.whiteDeck.splice(0, 7)
      })
      room.blackCard = room.blackDeck.shift()
      room.submissions = {}
      room.revealed   = false
      room.roundWinner= null

      io.to(code).emit('game_started', buildGameState(room, io))
      io.to(code).emit('room_updated', sanitize(room))
      // Send each player their hand privately
      room.players.forEach(p => {
        io.to(p.id).emit('your_hand', room.hands[p.id] || [])
      })
    })

    // ── SUBMIT CARD ───────────────────────────────────────────
    socket.on('submit_card', ({ code, cardText }) => {
      const room = rooms[code]
      if (!room || room.status!=='playing') return
      const player = room.players.find(p=>p.id===socket.id)
      const czar   = room.players[room.czarIdx]
      if (!player || player.id===czar.id) return // czar can't submit
      if (room.submissions[socket.id]) return // already submitted

      room.submissions[socket.id] = cardText
      // Remove from hand, draw new card
      room.hands[socket.id] = (room.hands[socket.id]||[]).filter(c=>c!==cardText)
      const newCard = room.whiteDeck.shift()
      if (newCard) room.hands[socket.id].push(newCard)
      socket.emit('your_hand', room.hands[socket.id])

      const nonCzars = room.players.filter(p=>p.id!==czar.id)
      const allSubmitted = nonCzars.every(p=>room.submissions[p.id])

      io.to(code).emit('submission_update', {
        count:   Object.keys(room.submissions).length,
        total:   nonCzars.length,
        allDone: allSubmitted,
      })
    })

    // ── REVEAL CARDS (czar only) ──────────────────────────────
    socket.on('reveal_cards', ({ code }) => {
      const room = rooms[code]
      if (!room) return
      const czar = room.players[room.czarIdx]
      if (socket.id !== czar.id) return
      room.revealed = true
      // Send revealed submissions to everyone (anonymized — no names yet)
      const subs = Object.entries(room.submissions).map(([pid, card]) => ({
        playerId: pid,
        card,
      })).sort(()=>Math.random()-0.5) // shuffle so czar can't guess by order
      io.to(code).emit('cards_revealed', { submissions: subs })
    })

    // ── PICK WINNER (czar only) ───────────────────────────────
    socket.on('pick_winner', ({ code, winnerId }) => {
      const room = rooms[code]
      if (!room) return
      const czar = room.players[room.czarIdx]
      if (socket.id !== czar.id) return

      const winner = room.players.find(p=>p.id===winnerId)
      if (!winner) return
      winner.score += 1
      room.roundWinner = winnerId

      io.to(code).emit('round_ended', {
        winnerId,
        winnerName: winner.name,
        winningCard: room.submissions[winnerId],
        scores: room.players.map(p=>({ name:p.name, score:p.score })),
      })
    })

    // ── NEXT ROUND (host only) ────────────────────────────────
    socket.on('next_round', ({ code }) => {
      const room = rooms[code]
      if (!room) return
      if (room.players[0].id !== socket.id) return
      if (!room.blackDeck.length) {
        room.status = 'ended'
        io.to(code).emit('game_ended', { scores: room.players.map(p=>({name:p.name,score:p.score})).sort((a,b)=>b.score-a.score) })
        return
      }
      room.czarIdx   = (room.czarIdx + 1) % room.players.length
      room.round    += 1
      room.blackCard = room.blackDeck.shift()
      room.submissions = {}
      room.revealed   = false
      room.roundWinner= null

      io.to(code).emit('new_round', {
        round:     room.round,
        czarName:  room.players[room.czarIdx].name,
        czarId:    room.players[room.czarIdx].id,
        blackCard: room.blackCard,
      })
      // Give each player their updated hand
      room.players.forEach(p => {
        io.to(p.id).emit('your_hand', room.hands[p.id] || [])
      })
    })

    // ── DISCONNECT ────────────────────────────────────────────
    socket.on('disconnect', () => {
      Object.values(rooms).forEach(room => {
        const idx = room.players.findIndex(p=>p.id===socket.id)
        if (idx === -1) return
        room.players.splice(idx, 1)
        if (room.players.length === 0) {
          delete rooms[room.code]
        } else {
          io.to(room.code).emit('player_left', {
            room: sanitize(room),
            leftName: room.players[idx]?.name || 'Jogador',
          })
        }
      })
    })
  })

  console.log('✅ WebSocket (Socket.io) ready')
  return io
}

// Remove sensitive fields before sending to clients
function sanitize(room) {
  return {
    code:      room.code,
    host:      room.host,
    players:   room.players.map(p=>({ name:p.name, score:p.score })),
    status:    room.status,
    czarIdx:   room.czarIdx,
    czarId:    room.players[room.czarIdx]?.id,
    round:     room.round,
    blackCard: room.blackCard,
    revealed:  room.revealed,
    submissionCount: Object.keys(room.submissions||{}).length,
  }
}

function buildGameState(room) {
  return {
    status:    room.status,
    round:     room.round,
    czarIdx:   room.czarIdx,
    czarName:  room.players[room.czarIdx]?.name,
    czarId:    room.players[room.czarIdx]?.id,
    blackCard: room.blackCard,
    players:   room.players.map(p=>({ name:p.name, score:p.score })),
  }
}

module.exports = { initWebSocket }
