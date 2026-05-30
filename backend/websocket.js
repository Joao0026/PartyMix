// backend/websocket.js — Socket.io for multi-device Cards mode
// Add this to your server.js:
//   const { initWebSocket } = require('./websocket')
//   const server = require('http').createServer(app)
//   initWebSocket(server)
//   server.listen(PORT, ...)  // replace app.listen with server.listen

const { Server } = require('socket.io')
const { assignRoles: mwAssignRoles, checkEndCondition: mwCheckEnd } = require('./lib/misterWhite')

// In-memory game rooms (resets on server restart — acceptable for party game)
const rooms = {}
const mwRooms = {}

function initWebSocket(httpServer, options = {}) {
  const corsOrigin = options.corsOrigin !== undefined ? options.corsOrigin : true
  const io = new Server(httpServer, {
    cors: { origin: corsOrigin, methods: ['GET', 'POST'] },
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

      io.to(code).emit('game_started', buildGameState(room))
      console.log('[WS] emitted game_started', { code, players: room.players.map(p=>p.name) })
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

      const submittedCards = (Array.isArray(cardText) ? cardText : [cardText])
        .map((card) => String(card || '').trim())
        .filter(Boolean)
        .slice(0, 2)
      if (!submittedCards.length) return

      room.submissions[socket.id] = {
        cards: submittedCards,
        text: submittedCards.join(' + '),
      }
      // Remove submitted cards from hand, then draw the same number back.
      room.hands[socket.id] = (room.hands[socket.id]||[]).filter(c=>!submittedCards.includes(c))
      submittedCards.forEach(() => {
        const newCard = room.whiteDeck.shift()
        if (newCard) room.hands[socket.id].push(newCard)
      })
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
        czarIdx:   room.czarIdx,
        czarName:  room.players[room.czarIdx].name,
        czarId:    room.players[room.czarIdx].id,
        blackCard: room.blackCard,
      })
      // Give each player their updated hand
      room.players.forEach(p => {
        io.to(p.id).emit('your_hand', room.hands[p.id] || [])
      })
    })

    // ── MISTER WHITE — CREATE ─────────────────────────────────
    socket.on('mw_create_room', ({ playerName, settings }) => {
      const code = Math.random().toString(36).substring(2, 6).toUpperCase()
      const cfg = settings || {}
      mwRooms[code] = {
        code,
        host: playerName,
        hostId: socket.id,
        players: [{ id: socket.id, name: playerName }],
        settings: {
          numUndercover: Math.max(0, Number(cfg.numUndercover) || 1),
          numMW: Math.max(0, Number(cfg.numMW) || 1),
          wordPack: cfg.wordPack || 'geral',
          difficulty: cfg.difficulty || 'normal',
          discussionSeconds: [60, 90, 120].includes(Number(cfg.discussionSeconds)) ? Number(cfg.discussionSeconds) : 90,
        },
        status: 'waiting',
        roles: null,
        civilWord: '',
        undercoverWord: '',
        eliminated: [],
        roundNum: 1,
        timeLeft: 90,
        revealReady: [],
        mwGuessIdx: null,
        gameResult: null,
      }
      socket.join(code)
      socket.emit('mw_room_created', { code, room: sanitizeMw(mwRooms[code]) })
    })

    // ── MISTER WHITE — JOIN ───────────────────────────────────
    socket.on('mw_join_room', ({ code, playerName }) => {
      const room = mwRooms[code.toUpperCase()]
      if (!room) { socket.emit('error', 'Sala não encontrada'); return }
      if (room.status !== 'waiting') { socket.emit('error', 'Jogo já começou'); return }
      if (room.players.find((p) => p.name === playerName)) { socket.emit('error', 'Nome já em uso'); return }
      if (room.players.length >= 12) { socket.emit('error', 'Sala cheia (máx. 12)'); return }

      room.players.push({ id: socket.id, name: playerName })
      const c = code.toUpperCase()
      socket.join(c)
      socket.emit('mw_room_joined', { code: c, room: sanitizeMw(room) })
      io.to(c).emit('mw_room_updated', sanitizeMw(room))
    })

    // ── MISTER WHITE — UPDATE SETTINGS (host) ─────────────────
    socket.on('mw_update_settings', ({ code, settings }) => {
      const room = mwRooms[code]
      if (!room || room.hostId !== socket.id || room.status !== 'waiting') return
      if (settings) {
        if (settings.numUndercover != null) room.settings.numUndercover = Math.max(0, Number(settings.numUndercover) || 0)
        if (settings.numMW != null) room.settings.numMW = Math.max(0, Number(settings.numMW) || 0)
        if (settings.wordPack) room.settings.wordPack = settings.wordPack
        if (settings.difficulty) room.settings.difficulty = settings.difficulty
        if ([60, 90, 120].includes(Number(settings.discussionSeconds))) {
          room.settings.discussionSeconds = Number(settings.discussionSeconds)
        }
      }
      io.to(code).emit('mw_room_updated', sanitizeMw(room))
    })

    // ── MISTER WHITE — START ──────────────────────────────────
    socket.on('mw_start_game', ({ code }) => {
      const room = mwRooms[code]
      if (!room) return
      if (room.hostId !== socket.id) { socket.emit('error', 'Só o host pode iniciar'); return }
      if (room.players.length < 3) { socket.emit('error', 'Precisas de pelo menos 3 jogadores'); return }
      const maxSpec = Math.max(0, room.players.length - 2)
      if (room.settings.numMW + room.settings.numUndercover > maxSpec) {
        socket.emit('error', 'Demasiados especiais para este número de jogadores'); return
      }

      const names = room.players.map((p) => p.name)
      const { roles, civilWord, undercoverWord } = mwAssignRoles(names, room.settings)
      room.roles = roles
      room.civilWord = civilWord
      room.undercoverWord = undercoverWord
      room.status = 'reveal'
      room.revealReady = []
      room.eliminated = []
      room.roundNum = 1
      room.timeLeft = room.settings.discussionSeconds
      room.gameResult = null
      room.mwGuessIdx = null

      room.players.forEach((p, i) => {
        const role = roles[i]
        io.to(p.id).emit('mw_your_role', {
          role: role.role,
          word: role.word,
          colorIdx: role.colorIdx,
          name: role.name,
        })
      })
      setImmediate(() => {
        io.to(code).emit('mw_game_started', sanitizeMw(room))
      })
    })

    // ── MISTER WHITE — REVEAL READY ───────────────────────────
    socket.on('mw_reveal_ready', ({ code }) => {
      const room = mwRooms[code]
      if (!room || room.status !== 'reveal') return
      if (!room.revealReady.includes(socket.id)) room.revealReady.push(socket.id)
      io.to(code).emit('mw_reveal_progress', {
        ready: room.revealReady.length,
        total: room.players.length,
      })
      if (room.revealReady.length >= room.players.length) {
        room.status = 'playing'
        room.timeLeft = room.settings.discussionSeconds
        io.to(code).emit('mw_phase', sanitizeMw(room))
      }
    })

    // ── MISTER WHITE — HOST: START VOTE ───────────────────────
    socket.on('mw_start_vote', ({ code }) => {
      const room = mwRooms[code]
      if (!room || room.hostId !== socket.id) return
      if (room.status !== 'playing') return
      room.status = 'vote'
      room.votes = {}
      io.to(code).emit('mw_phase', sanitizeMw(room))
    })

    // ── MISTER WHITE — CAST VOTE ──────────────────────────────
    socket.on('mw_cast_vote', ({ code, targetOrigIdx }) => {
      const room = mwRooms[code]
      if (!room || room.status !== 'vote') return

      const voterIdx = room.players.findIndex((p) => p.id === socket.id)
      if (voterIdx < 0 || room.eliminated.includes(voterIdx)) return
      if (room.votes[socket.id] != null) return

      const target = Number(targetOrigIdx)
      if (!Number.isInteger(target) || target < 0 || target >= room.roles.length) return
      if (room.eliminated.includes(target)) return
      if (target === voterIdx) {
        socket.emit('error', 'Não podes votar em ti próprio')
        return
      }

      room.votes[socket.id] = target
      io.to(code).emit('mw_vote_update', sanitizeMw(room))

      const activeCount = room.players.filter((_, i) => !room.eliminated.includes(i)).length
      const votesCast = Object.keys(room.votes).filter((id) => {
        const vi = room.players.findIndex((p) => p.id === id)
        return vi >= 0 && !room.eliminated.includes(vi)
      }).length

      if (votesCast >= activeCount) {
        mwResolveVotes(room, code, io)
      }
    })

    // ── MISTER WHITE — HOST: ELIMINATE (legacy fallback) ───────
    socket.on('mw_eliminate', ({ code, targetOrigIdx }) => {
      const room = mwRooms[code]
      if (!room || room.hostId !== socket.id || room.status !== 'vote') return
      mwEliminatePlayer(room, code, io, Number(targetOrigIdx))
    })

    // ── MISTER WHITE — MW GUESS ───────────────────────────────
    socket.on('mw_guess', ({ code, guess }) => {
      const room = mwRooms[code]
      if (!room || room.status !== 'mw_guess') return
      const mwIdx = room.mwGuessIdx
      const mwPlayer = room.players[mwIdx]
      if (!mwPlayer || mwPlayer.id !== socket.id) return

      const g = String(guess || '').toLowerCase().trim()
      const civil = room.civilWord.toLowerCase().trim()
      const correct = g === civil || civil.startsWith(g)

      if (correct) {
        room.gameResult = 'mw_wins'
        room.status = 'result'
        io.to(code).emit('mw_phase', sanitizeMw(room, true))
        return
      }

      const remaining = room.roles.filter((_, i) => !room.eliminated.includes(i))
      const undercoveres = remaining.filter((r) => r.role === 'undercover').length
      if (undercoveres > 0) {
        const result = mwCheckEnd(room.roles, room.eliminated)
        if (result) {
          room.gameResult = result
          room.status = 'result'
          io.to(code).emit('mw_phase', sanitizeMw(room, true))
          return
        }
        room.roundNum += 1
        room.status = 'playing'
        room.timeLeft = room.settings.discussionSeconds
        room.mwGuessIdx = null
        io.to(code).emit('mw_phase', sanitizeMw(room))
      } else {
        room.gameResult = 'civils_win'
        room.status = 'result'
        io.to(code).emit('mw_phase', sanitizeMw(room, true))
      }
    })

    // ── MISTER WHITE — RESTART (host) ─────────────────────────
    socket.on('mw_restart', ({ code }) => {
      const room = mwRooms[code]
      if (!room || room.hostId !== socket.id) return
      room.status = 'waiting'
      room.roles = null
      room.eliminated = []
      room.revealReady = []
      room.gameResult = null
      room.mwGuessIdx = null
      room.roundNum = 1
      io.to(code).emit('mw_room_updated', sanitizeMw(room))
    })

    // ── DISCONNECT ────────────────────────────────────────────
    socket.on('disconnect', () => {
      Object.values(rooms).forEach((room) => {
        const idx = room.players.findIndex((p) => p.id === socket.id)
        if (idx === -1) return
        const leftName = room.players[idx]?.name || 'Jogador'
        room.players.splice(idx, 1)
        if (room.players.length === 0) {
          delete rooms[room.code]
        } else {
          io.to(room.code).emit('player_left', { room: sanitize(room), leftName })
        }
      })
      Object.values(mwRooms).forEach((room) => {
        const idx = room.players.findIndex((p) => p.id === socket.id)
        if (idx === -1) return
        const leftName = room.players[idx]?.name || 'Jogador'
        room.players.splice(idx, 1)
        if (room.players.length === 0) {
          delete mwRooms[room.code]
        } else if (room.hostId === socket.id && room.players[0]) {
          room.hostId = room.players[0].id
          room.host = room.players[0].name
          io.to(room.code).emit('mw_room_updated', sanitizeMw(room))
        } else {
          io.to(room.code).emit('mw_room_updated', sanitizeMw(room))
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

function computeVoteCounts(room) {
  const counts = {}
  if (!room.votes) return counts
  for (const [voterId, targetIdx] of Object.entries(room.votes)) {
    const voterIdx = room.players.findIndex((p) => p.id === voterId)
    if (voterIdx < 0 || room.eliminated.includes(voterIdx)) continue
    const t = Number(targetIdx)
    if (room.eliminated.includes(t)) continue
    counts[t] = (counts[t] || 0) + 1
  }
  return counts
}

function pickMostVoted(counts) {
  let max = 0
  let tied = []
  for (const [idx, c] of Object.entries(counts)) {
    const n = Number(idx)
    if (c > max) {
      max = c
      tied = [n]
    } else if (c === max) {
      tied.push(n)
    }
  }
  if (!tied.length) return null
  return tied[Math.floor(Math.random() * tied.length)]
}

function mwEliminatePlayer(room, code, io, idx) {
  if (!Number.isInteger(idx) || idx < 0 || idx >= room.roles.length) return
  if (room.eliminated.includes(idx)) return

  room.eliminated.push(idx)
  room.votes = {}
  room.lastEliminatedIdx = idx
  const role = room.roles[idx]

  if (role.role === 'mister_white') {
    room.mwGuessIdx = idx
    room.status = 'mw_guess'
    io.to(code).emit('mw_phase', sanitizeMw(room))
    const mwPlayer = room.players[idx]
    if (mwPlayer) {
      io.to(mwPlayer.id).emit('mw_guess_prompt', { civilWordHint: false })
    }
    return
  }

  const result = mwCheckEnd(room.roles, room.eliminated)
  if (result) {
    room.gameResult = result
    room.status = 'result'
    io.to(code).emit('mw_phase', sanitizeMw(room, true))
    return
  }

  room.roundNum += 1
  room.status = 'playing'
  room.timeLeft = room.settings.discussionSeconds
  io.to(code).emit('mw_phase', sanitizeMw(room))
}

function mwResolveVotes(room, code, io) {
  const counts = computeVoteCounts(room)
  const target = pickMostVoted(counts)
  if (target == null) {
    room.votes = {}
    io.to(code).emit('mw_vote_update', sanitizeMw(room))
    io.to(code).emit('error', 'Ninguém recebeu votos — vota outra vez')
    return
  }
  mwEliminatePlayer(room, code, io, target)
}

function sanitizeMw(room, revealAll = false) {
  const activeRoles = room.roles
    ? room.roles.map((r, i) => ({
        origIdx: i,
        name: r.name,
        colorIdx: r.colorIdx,
        eliminated: room.eliminated.includes(i),
        ...(revealAll || room.status === 'result'
          ? { role: r.role, word: r.word }
          : {}),
      }))
    : []
  const voteCounts = computeVoteCounts(room)
  const votesNeeded = room.players.filter((_, i) => !room.eliminated.includes(i)).length
  const votesCast = room.votes
    ? Object.keys(room.votes).filter((id) => {
      const vi = room.players.findIndex((p) => p.id === id)
      return vi >= 0 && !room.eliminated.includes(vi)
    }).length
    : 0

  return {
    code: room.code,
    host: room.host,
    hostId: room.hostId,
    players: room.players.map((p) => ({ id: p.id, name: p.name })),
    settings: room.settings,
    status: room.status,
    roundNum: room.roundNum,
    timeLeft: room.timeLeft,
    eliminated: [...room.eliminated],
    revealReady: room.revealReady.length,
    revealTotal: room.players.length,
    rolesPublic: activeRoles,
    gameResult: room.gameResult,
    civilWord: revealAll || room.status === 'result' ? room.civilWord : undefined,
    undercoverWord: revealAll || room.status === 'result' ? room.undercoverWord : undefined,
    mwGuessIdx: room.mwGuessIdx,
    voteCounts,
    votesCast,
    votesNeeded,
    lastEliminatedIdx: room.lastEliminatedIdx,
  }
}

module.exports = { initWebSocket }
