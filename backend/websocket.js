// backend/websocket.js — Socket.io for multi-device Cards mode
// Add this to your server.js:
//   const { initWebSocket } = require('./websocket')
//   const server = require('http').createServer(app)
//   initWebSocket(server)
//   server.listen(PORT, ...)  // replace app.listen with server.listen

const { Server } = require('socket.io')
const { assignRolesAsync: mwAssignRoles, checkEndCondition: mwCheckEnd, invalidateCommunityPairsCache } = require('./lib/misterWhite')
const { registerAldeiaMixHandlers, handleAldeiaDisconnect } = require('./lib/aldeiaMixSocket')
const { registerMemeMixHandlers, handleMemeMixDisconnect } = require('./lib/mememixSocket')
const { cleanupOrphanUploads } = require('./lib/mememixSessions')
const { mmRooms } = require('./lib/mememixSocket')

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
        players:   [{ id:socket.id, name:playerName, score:0, disconnected:false }],
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
      const c = code.toUpperCase()
      const room = rooms[c]
      if (!room) { socket.emit('error', 'Sala não encontrada'); return }

      const name = String(playerName || '').trim().slice(0, 20)
      if (!name) { socket.emit('error', 'Nome inválido'); return }

      const existing = room.players.find((p) => p.name === name)
      if (existing?.disconnected) {
        existing.id = socket.id
        existing.disconnected = false
        socket.join(c)
        finishCardsRejoin(io, room, socket, existing)
        io.to(c).emit('room_updated', sanitize(room))
        return
      }
      if (existing) { socket.emit('error', 'Nome já em uso'); return }
      if (room.status !== 'waiting') { socket.emit('error', 'Jogo já começou'); return }

      room.players.push({ id: socket.id, name, score: 0, disconnected: false })
      socket.join(c)
      socket.emit('room_joined', { code: c, room: sanitize(room) })
      io.to(c).emit('room_updated', sanitize(room))
    })

    socket.on('cards_rejoin_room', ({ code, playerName }) => {
      const c = String(code || '').toUpperCase()
      const room = rooms[c]
      const name = String(playerName || '').trim().slice(0, 20)
      if (!room || !name) { socket.emit('error', 'Sala não encontrada'); return }
      const existing = room.players.find((p) => p.name === name)
      if (!existing) { socket.emit('error', 'Não estavas nesta sala'); return }
      existing.id = socket.id
      existing.disconnected = false
      socket.join(c)
      finishCardsRejoin(io, room, socket, existing)
      io.to(c).emit('room_updated', sanitize(room))
    })

    // ── START GAME (host only) ────────────────────────────────
    socket.on('start_game', ({ code, cardData }) => {
      const room = rooms[code]
      if (!room) return
      const actor = room.players.find((p) => p.id === socket.id && !p.disconnected)
      if (!actor || room.host !== actor.name) { socket.emit('error','Só o host pode iniciar'); return }
      if (room.players.filter((p) => !p.disconnected).length < 2) { socket.emit('error','Precisas de pelo menos 2 jogadores'); return }

      // cardData = { black:[...], white:[...] } sent from frontend
      const { black, white } = cardData
      const shuffled = arr => arr.sort(()=>Math.random()-0.5)

      room.blackDeck = shuffled([...black])
      room.whiteDeck = shuffled([...white])
      room.status    = 'playing'
      room.round     = 1
      room.czarIdx   = 0

      room.players.forEach(p => {
        if (!p.disconnected && p.id) {
          room.hands[p.name] = room.whiteDeck.splice(0, 7)
        }
      })
      room.blackCard = room.blackDeck.shift()
      room.submissions = {}
      room.revealed   = false
      room.roundWinner= null

      io.to(code).emit('game_started', buildGameState(room))
      console.log('[WS] emitted game_started', { code, players: room.players.map(p=>p.name) })
      io.to(code).emit('room_updated', sanitize(room))
      room.players.filter((p) => p.id && !p.disconnected).forEach(p => {
        io.to(p.id).emit('your_hand', room.hands[p.name] || [])
      })
    })

    // ── SUBMIT CARD ───────────────────────────────────────────
    socket.on('submit_card', ({ code, cardText }) => {
      const room = rooms[code]
      if (!room || room.status!=='playing') return
      const player = room.players.find(p=>p.id===socket.id && !p.disconnected)
      const czar   = room.players[room.czarIdx]
      if (!player || !czar?.id || player.id===czar.id) return
      if (room.submissions[player.name]) return

      const submittedCards = (Array.isArray(cardText) ? cardText : [cardText])
        .map((card) => String(card || '').trim())
        .filter(Boolean)
        .slice(0, 2)
      if (!submittedCards.length) return

      room.submissions[player.name] = {
        cards: submittedCards,
        text: submittedCards.join(' + '),
      }
      room.hands[player.name] = (room.hands[player.name]||[]).filter(c=>!submittedCards.includes(c))
      submittedCards.forEach(() => {
        const newCard = room.whiteDeck.shift()
        if (newCard) room.hands[player.name].push(newCard)
      })
      socket.emit('your_hand', room.hands[player.name])

      const nonCzars = room.players.filter(p=>p.id && !p.disconnected && p.id!==czar.id)
      const allSubmitted = nonCzars.every(p=>room.submissions[p.name])

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
      if (!czar?.id || socket.id !== czar.id) return
      room.revealed = true
      const subs = Object.entries(room.submissions).map(([pname, card]) => ({
        playerId: pname,
        card,
      })).sort(()=>Math.random()-0.5)
      io.to(code).emit('cards_revealed', { submissions: subs })
    })

    // ── PICK WINNER (czar only) ───────────────────────────────
    socket.on('pick_winner', ({ code, winnerId }) => {
      const room = rooms[code]
      if (!room) return
      const czar = room.players[room.czarIdx]
      if (!czar?.id || socket.id !== czar.id) return

      const winner = room.players.find(p=>p.name===winnerId || p.id===winnerId)
      if (!winner) return
      winner.score += 1
      room.roundWinner = winner.name

      io.to(code).emit('round_ended', {
        winnerId: winner.name,
        winnerName: winner.name,
        winningCard: room.submissions[winner.name],
        scores: room.players.map(p=>({ name:p.name, score:p.score })),
      })
    })

    // ── NEXT ROUND (host only) ────────────────────────────────
    socket.on('next_round', ({ code }) => {
      const room = rooms[code]
      if (!room) return
      const actor = room.players.find((p) => p.id === socket.id && !p.disconnected)
      if (!actor || room.host !== actor.name) return
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
      room.players.filter((p) => p.id && !p.disconnected).forEach(p => {
        io.to(p.id).emit('your_hand', room.hands[p.name] || [])
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
        players: [{ id: socket.id, name: playerName, disconnected: false }],
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
      const c = code.toUpperCase()
      const room = mwRooms[c]
      if (!room) { socket.emit('error', 'Sala não encontrada'); return }

      const name = String(playerName || '').trim().slice(0, 20)
      if (!name) { socket.emit('error', 'Nome inválido'); return }

      const existing = room.players.find((p) => p.name === name)
      if (existing?.disconnected) {
        migrateMwSockets(room, existing.id, socket.id)
        existing.id = socket.id
        existing.disconnected = false
        if (room.host === name) room.hostId = socket.id
        socket.join(c)
        finishMwRejoin(io, room, socket, existing)
        io.to(c).emit('mw_room_updated', sanitizeMw(room))
        return
      }
      if (existing) { socket.emit('error', 'Nome já em uso'); return }
      if (room.status !== 'waiting') { socket.emit('error', 'Jogo já começou'); return }
      if (room.players.length >= 12) { socket.emit('error', 'Sala cheia (máx. 12)'); return }

      room.players.push({ id: socket.id, name, disconnected: false })
      socket.join(c)
      socket.emit('mw_room_joined', { code: c, room: sanitizeMw(room) })
      io.to(c).emit('mw_room_updated', sanitizeMw(room))
    })

    socket.on('mw_rejoin_room', ({ code, playerName }) => {
      const c = String(code || '').toUpperCase()
      const room = mwRooms[c]
      const name = String(playerName || '').trim().slice(0, 20)
      if (!room || !name) { socket.emit('error', 'Sala não encontrada'); return }
      const existing = room.players.find((p) => p.name === name)
      if (!existing) { socket.emit('error', 'Não estavas nesta sala'); return }
      migrateMwSockets(room, existing.id, socket.id)
      existing.id = socket.id
      existing.disconnected = false
      if (room.host === name) room.hostId = socket.id
      socket.join(c)
      finishMwRejoin(io, room, socket, existing)
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
    socket.on('mw_start_game', async ({ code }) => {
      const room = mwRooms[code]
      if (!room) return
      if (room.hostId !== socket.id) { socket.emit('error', 'Só o host pode iniciar'); return }
      if (room.players.filter((p) => !p.disconnected).length < 3) { socket.emit('error', 'Precisas de pelo menos 3 jogadores'); return }
      const maxSpec = Math.max(0, room.players.length - 2)
      if (room.settings.numMW + room.settings.numUndercover > maxSpec) {
        socket.emit('error', 'Demasiados especiais para este número de jogadores'); return
      }

      try {
        const names = room.players.map((p) => p.name)
        const { roles, civilWord, undercoverWord } = await mwAssignRoles(names, room.settings)
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

        room.players.filter((p) => p.id && !p.disconnected).forEach((p, i) => {
          const role = roles[i]
          if (!role) return
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
      } catch (err) {
        socket.emit('error', err.message || 'Erro ao iniciar jogo')
      }
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

    registerAldeiaMixHandlers(io, socket)
    registerMemeMixHandlers(io, socket)

    // ── DISCONNECT ────────────────────────────────────────────
    socket.on('disconnect', () => {
      Object.values(rooms).forEach((room) => {
        const player = room.players.find((p) => p.id === socket.id)
        if (!player) return
        player.disconnected = true
        player.id = null
        io.to(room.code).emit('room_updated', sanitize(room))
        io.to(room.code).emit('player_disconnected', { name: player.name })
      })
      Object.values(mwRooms).forEach((room) => {
        const player = room.players.find((p) => p.id === socket.id)
        if (!player) return
        player.disconnected = true
        player.id = null
        io.to(room.code).emit('mw_room_updated', sanitizeMw(room))
      })
      handleAldeiaDisconnect(io, socket)
      handleMemeMixDisconnect(io, socket)
    })
  })

  cleanupOrphanUploads(Object.keys(mmRooms))
  console.log('✅ WebSocket (Socket.io) ready')
  return io
}

function finishCardsRejoin(io, room, socket, player) {
  const c = room.code
  socket.emit('cards_rejoined', {
    code: c,
    room: sanitize(room),
    playerName: player.name,
    isHost: room.host === player.name,
  })
  if (room.status === 'playing') {
    socket.emit('game_started', buildGameState(room))
    socket.emit('your_hand', room.hands[player.name] || [])
  } else if (room.status === 'waiting') {
    socket.emit('room_joined', { code: c, room: sanitize(room) })
  }
}

function migrateMwSockets(room, oldId, newId) {
  if (!oldId || !newId || oldId === newId) return
  if (room.votes && room.votes[oldId] != null) {
    room.votes[newId] = room.votes[oldId]
    delete room.votes[oldId]
  }
  if (Array.isArray(room.revealReady)) {
    const idx = room.revealReady.indexOf(oldId)
    if (idx >= 0) room.revealReady[idx] = newId
  }
}

function finishMwRejoin(io, room, socket, player) {
  const c = room.code
  const idx = room.players.findIndex((p) => p.name === player.name)
  socket.emit('mw_rejoined', {
    code: c,
    room: sanitizeMw(room),
    playerName: player.name,
    isHost: room.host === player.name,
  })
  if (room.roles && idx >= 0 && room.roles[idx]) {
    const role = room.roles[idx]
    socket.emit('mw_your_role', {
      role: role.role,
      word: role.word,
      colorIdx: role.colorIdx,
      name: role.name,
    })
  }
  if (room.status !== 'waiting') {
    socket.emit('mw_phase', sanitizeMw(room, room.status === 'result'))
  }
}

// Remove sensitive fields before sending to clients
function sanitize(room) {
  return {
    code:      room.code,
    host:      room.host,
    players:   room.players.map(p=>({ name:p.name, score:p.score, disconnected: !!p.disconnected })),
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
    players: room.players.map((p) => ({ id: p.id, name: p.name, disconnected: !!p.disconnected })),
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
