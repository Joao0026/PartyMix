// backend/websocket.js — Socket.io for multi-device Cards mode
// Add this to your server.js:
//   const { initWebSocket } = require('./websocket')
//   const server = require('http').createServer(app)
//   initWebSocket(server)
//   server.listen(PORT, ...)  // replace app.listen with server.listen

const { Server } = require('socket.io')
const { assignRolesAsync: mwAssignRoles, checkEndCondition: mwCheckEnd, invalidateCommunityPairsCache, sanitizeCustomPairs } = require('./lib/misterWhite')
const { sanitizeWordPacks, sanitizeDifficulties, DIFFICULTY_IDS } = require('./lib/misterPairs')
const { registerAldeiaMixHandlers, handleAldeiaDisconnect, amRooms } = require('./lib/aldeiaMixSocket')
const { registerMemeMixHandlers, handleMemeMixDisconnect } = require('./lib/mememixSocket')
const { cleanupOrphanUploads, destroyMemeMixSession, cleanupStaleUploads } = require('./lib/mememixSessions')
const { startedAt } = require('./lib/runtime')
const { mmRooms } = require('./lib/mememixSocket')
const {
  allocRoomCode,
  authorizeRejoin,
  cardsInHand,
  createSocketRateLimiter,
  detachSocketFromRooms,
  findConnectedPlayer,
  firstInPlayIdx,
  generatePlayerToken,
  guessMatchesWord,
  isHostSocket,
  isInPlay,
  normalizePlayerName,
  publicPlayers,
  removeCardsFromHand,
  roomsAtCapacity,
  sanitizeDeck,
  socketSeatedIn,
  startRoomGc,
  touchRoom,
} = require('./lib/gameAuth')

const MAX_CARDS_PLAYERS = 12
const allowSocketEvent = createSocketRateLimiter()

// In-memory game rooms (resets on server restart — acceptable for party game)
const rooms = {}
const mwRooms = {}

function getMwRoom(code) {
  return mwRooms[String(code || '').toUpperCase()] || null
}

function toNonNegativeInt(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : fallback
}

function initWebSocket(httpServer, options = {}) {
  const corsOrigin = options.corsOrigin !== undefined ? options.corsOrigin : true
  const io = new Server(httpServer, {
    cors: { origin: corsOrigin, methods: ['GET', 'POST'] },
    maxHttpBufferSize: 2e5,
  })

  io.on('connection', (socket) => {
    socket.emit('server_hello', { startedAt, roomsEphemeral: true })
    socket.on('client_ready', () => {
      socket.emit('server_hello', { startedAt, roomsEphemeral: true })
    })
    socket.use((_packet, next) => {
      if (!allowSocketEvent(socket.id)) {
        socket.emit('error', 'Demasiados pedidos. Aguarda um momento.')
        return next(new Error('rate_limited'))
      }
      next()
    })

    // ── CREATE ROOM ──────────────────────────────────────────
    socket.on('create_room', ({ playerName, packs }) => {
      const name = normalizePlayerName(playerName)
      if (!name) { socket.emit('error', 'Nome inválido'); return }
      if (roomsAtCapacity(rooms)) { socket.emit('error', 'Servidor cheio'); return }
      const code = allocRoomCode(rooms)
      if (!code) { socket.emit('error', 'Não foi possível criar sala'); return }
      notifyDetachedCards(io, detachSocketFromRooms(rooms, socket.id))
      const token = generatePlayerToken()
      rooms[code] = touchRoom({
        code,
        host:      name,
        players:   [{ id:socket.id, name, token, score:0, disconnected:false }],
        packs:     Array.isArray(packs) ? packs.slice(0, 20).map(String) : ['base'],
        status:    'waiting',
        czarIdx:   0,
        round:     0,
        blackCard: null,
        whiteDeck: [],
        blackDeck: [],
        hands:     {},
        submissions:{},
        revealed:  false,
        roundWinner: null,
      })
      socket.join(code)
      socket.emit('room_created', { code, room: sanitize(rooms[code]), playerToken: token, playerName: name })
    })

    // ── JOIN ROOM ─────────────────────────────────────────────
    socket.on('join_room', ({ code, playerName }) => {
      const c = String(code || '').toUpperCase()
      const room = rooms[c]
      if (!room) { socket.emit('error', 'Sala não encontrada'); return }
      touchRoom(room)

      const name = normalizePlayerName(playerName)
      if (!name) { socket.emit('error', 'Nome inválido'); return }
      if (socketSeatedIn(room, socket.id)) { socket.emit('error', 'Já estás nesta sala'); return }
      if (room.players.find((p) => p.name === name)) { socket.emit('error', 'Nome já em uso'); return }
      if (room.status !== 'waiting') { socket.emit('error', 'Jogo já começou'); return }
      if (room.players.length >= MAX_CARDS_PLAYERS) { socket.emit('error', 'Sala cheia'); return }

      notifyDetachedCards(io, detachSocketFromRooms(rooms, socket.id, c))
      const token = generatePlayerToken()
      room.players.push({ id: socket.id, name, token, score: 0, disconnected: false })
      socket.join(c)
      socket.emit('room_joined', { code: c, room: sanitize(room), playerToken: token, playerName: name })
      io.to(c).emit('room_updated', sanitize(room))
    })

    socket.on('cards_rejoin_room', ({ code, playerName, playerToken }) => {
      const c = String(code || '').toUpperCase()
      const room = rooms[c]
      const auth = authorizeRejoin(room, { playerName, playerToken, socketId: socket.id })
      if (!auth.ok) { socket.emit('error', auth.error); return }
      touchRoom(room)
      auth.player.id = socket.id
      auth.player.disconnected = false
      auth.player.previousSocketId = null
      socket.join(c)
      finishCardsRejoin(io, room, socket, auth.player)
      io.to(c).emit('room_updated', sanitize(room))
    })

    // ── START GAME (host only) ────────────────────────────────
    socket.on('start_game', ({ code, cardData }) => {
      const room = rooms[String(code || '').toUpperCase()]
      if (!room) return
      touchRoom(room)
      if (!isHostSocket(room, socket.id)) { socket.emit('error','Só o host pode iniciar'); return }
      if (room.status !== 'waiting' && room.status !== 'ended') {
        socket.emit('error', 'O jogo já está a decorrer')
        return
      }
      if (room.players.filter((p) => !p.disconnected).length < 2) { socket.emit('error','Precisas de pelo menos 2 jogadores'); return }

      const black = sanitizeDeck(cardData?.black)
      const white = sanitizeDeck(cardData?.white)
      if (black.length < 5 || white.length < 14) {
        socket.emit('error', 'Baralho inválido')
        return
      }
      const shuffled = arr => arr.sort(()=>Math.random()-0.5)

      if (room.status === 'ended') {
        room.players.forEach((p) => { p.score = 0 })
      }

      room.blackDeck = shuffled([...black])
      room.whiteDeck = shuffled([...white])
      room.status    = 'playing'
      room.round     = 1
      const firstCzar = firstInPlayIdx(room)
      room.czarIdx   = firstCzar >= 0 ? firstCzar : 0

      room.players.forEach(p => {
        if (!p.disconnected && p.id) {
          room.hands[p.name] = room.whiteDeck.splice(0, 7)
        }
      })
      room.blackCard = room.blackDeck.shift()
      room.submissions = {}
      room.revealed   = false
      room.roundWinner= null

      io.to(room.code).emit('game_started', buildGameState(room))
      console.log('[WS] emitted game_started', { code: room.code, players: room.players.map(p=>p.name) })
      io.to(room.code).emit('room_updated', sanitize(room))
      room.players.filter((p) => p.id && !p.disconnected).forEach(p => {
        io.to(p.id).emit('your_hand', room.hands[p.name] || [])
      })
    })

    // ── SUBMIT CARD ───────────────────────────────────────────
    socket.on('submit_card', ({ code, cardText }) => {
      const room = rooms[String(code || '').toUpperCase()]
      if (!room || room.status!=='playing') return
      touchRoom(room)
      const player = findConnectedPlayer(room, socket.id)
      ensureConnectedCardsCzar(room)
      const czar   = room.players[room.czarIdx]
      if (!player || player.sittingOut || !czar?.id || player.id===czar.id) return
      if (room.submissions[player.name]) return

      const submittedCards = (Array.isArray(cardText) ? cardText : [cardText])
        .map((card) => String(card || '').trim())
        .filter(Boolean)
        .slice(0, 2)
      if (!submittedCards.length) return
      if (!cardsInHand(room.hands[player.name] || [], submittedCards)) return

      room.submissions[player.name] = {
        cards: submittedCards,
        text: submittedCards.join(' + '),
      }
      room.hands[player.name] = removeCardsFromHand(room.hands[player.name] || [], submittedCards)
      submittedCards.forEach(() => {
        const newCard = room.whiteDeck.shift()
        if (newCard) room.hands[player.name].push(newCard)
      })
      socket.emit('your_hand', room.hands[player.name])

      const nonCzars = cardsNonCzarInPlay(room)
      const allSubmitted = nonCzars.every(p=>room.submissions[p.name])

      io.to(room.code).emit('submission_update', {
        count:   nonCzars.filter((p) => room.submissions[p.name]).length,
        total:   nonCzars.length,
        allDone: allSubmitted,
      })
    })

    // ── REVEAL CARDS (czar only) ──────────────────────────────
    socket.on('reveal_cards', ({ code }) => {
      const room = rooms[String(code || '').toUpperCase()]
      if (!room) return
      touchRoom(room)
      ensureConnectedCardsCzar(room)
      const czar = room.players[room.czarIdx]
      if (!czar?.id || czar.disconnected || socket.id !== czar.id) return
      if (room.status !== 'playing' || room.revealed) return
      room.revealed = true
      const subs = Object.entries(room.submissions).map(([pname, card]) => ({
        playerId: pname,
        card,
      })).sort(()=>Math.random()-0.5)
      io.to(room.code).emit('cards_revealed', { submissions: subs })
    })

    // ── PICK WINNER (czar only) ───────────────────────────────
    socket.on('pick_winner', ({ code, winnerId }) => {
      const room = rooms[String(code || '').toUpperCase()]
      if (!room) return
      touchRoom(room)
      ensureConnectedCardsCzar(room)
      const czar = room.players[room.czarIdx]
      if (!czar?.id || czar.disconnected || socket.id !== czar.id) return
      if (room.status !== 'playing' || !room.revealed || room.roundWinner) return

      const winner = room.players.find(p=>p.name===winnerId || p.id===winnerId)
      if (!winner || winner.id === czar.id || winner.name === czar.name) return
      if (!room.submissions[winner.name]) return
      winner.score += 1
      room.roundWinner = winner.name

      io.to(room.code).emit('round_ended', {
        winnerId: winner.name,
        winnerName: winner.name,
        winningCard: room.submissions[winner.name],
        scores: room.players.map(p=>({ name:p.name, score:p.score })),
      })
    })

    // ── NEXT ROUND (host only) ────────────────────────────────
    socket.on('next_round', ({ code }) => {
      const room = rooms[String(code || '').toUpperCase()]
      if (!room) return
      touchRoom(room)
      if (!isHostSocket(room, socket.id)) return
      if (!room.blackDeck.length) {
        room.status = 'ended'
        io.to(room.code).emit('game_ended', { scores: room.players.map(p=>({name:p.name,score:p.score})).sort((a,b)=>b.score-a.score) })
        return
      }
      room.czarIdx = findNextConnectedCardsIdx(room, room.czarIdx)
      if (room.czarIdx < 0) return
      room.round    += 1
      room.blackCard = room.blackDeck.shift()
      room.submissions = {}
      room.revealed   = false
      room.roundWinner= null

      io.to(room.code).emit('new_round', {
        round:     room.round,
        czarIdx:   room.czarIdx,
        czarName:  room.players[room.czarIdx].name,
        blackCard: room.blackCard,
      })
      room.players.filter((p) => p.id && !p.disconnected).forEach(p => {
        io.to(p.id).emit('your_hand', room.hands[p.name] || [])
      })
    })

    socket.on('cards_sit_out', ({ code, playerName }) => {
      const room = rooms[String(code || '').toUpperCase()]
      if (!room || room.status !== 'playing') return
      touchRoom(room)
      const actor = findConnectedPlayer(room, socket.id)
      if (!actor) return
      const targetName = normalizePlayerName(playerName) || actor.name
      if (targetName !== actor.name && !isHostSocket(room, socket.id)) return
      const target = room.players.find((p) => p.name === targetName)
      if (!target || target.sittingOut) return
      target.sittingOut = true
      const czarChanged = ensureConnectedCardsCzar(room)
      io.to(room.code).emit('room_updated', sanitize(room))
      emitCardsRoundState(io, room, czarChanged)
    })

    socket.on('cards_sit_in', ({ code }) => {
      const room = rooms[String(code || '').toUpperCase()]
      if (!room) return
      touchRoom(room)
      const actor = findConnectedPlayer(room, socket.id)
      if (!actor || !actor.sittingOut) return
      actor.sittingOut = false
      io.to(room.code).emit('room_updated', sanitize(room))
      if (room.status === 'playing') emitCardsRoundState(io, room, false)
    })

    socket.on('cards_skip_pending', ({ code }) => {
      const room = rooms[String(code || '').toUpperCase()]
      if (!room || room.status !== 'playing' || room.revealed) return
      touchRoom(room)
      if (!isHostSocket(room, socket.id)) return
      if (!Object.keys(room.submissions || {}).length) return
      skipPendingCardsPlayers(room)
      const czarChanged = ensureConnectedCardsCzar(room)
      io.to(room.code).emit('room_updated', sanitize(room))
      emitCardsRoundState(io, room, czarChanged)
    })

    // ── MISTER WHITE — CREATE ─────────────────────────────────
    socket.on('mw_create_room', ({ playerName, settings }) => {
      const name = normalizePlayerName(playerName)
      if (!name) { socket.emit('error', 'Nome inválido'); return }
      if (roomsAtCapacity(mwRooms)) { socket.emit('error', 'Servidor cheio'); return }
      const code = allocRoomCode(mwRooms)
      if (!code) { socket.emit('error', 'Não foi possível criar sala'); return }
      notifyDetachedMw(io, detachSocketFromRooms(mwRooms, socket.id))
      const token = generatePlayerToken()
      const cfg = settings || {}
      mwRooms[code] = touchRoom({
        code,
        host: name,
        hostId: socket.id,
        players: [{ id: socket.id, name, token, disconnected: false }],
        settings: {
          numUndercover: toNonNegativeInt(cfg.numUndercover, 1),
          numMW: toNonNegativeInt(cfg.numMW, 0),
          wordPack: String((Array.isArray(cfg.wordPacks) ? cfg.wordPacks[0] : cfg.wordPack) || 'geral').slice(0, 40),
          wordPacks: Array.isArray(cfg.wordPacks)
            ? sanitizeWordPacks(cfg.wordPacks)
            : sanitizeWordPacks(cfg.wordPack ? [cfg.wordPack] : ['geral']),
          difficulty: String(cfg.difficulty || 'normal').slice(0, 20),
          difficulties: Array.isArray(cfg.difficulties)
            ? sanitizeDifficulties(cfg.difficulties)
            : sanitizeDifficulties(cfg.difficulty ? [cfg.difficulty] : DIFFICULTY_IDS),
          discussionSeconds: [60, 90, 120].includes(Number(cfg.discussionSeconds)) ? Number(cfg.discussionSeconds) : 90,
          customPairs: sanitizeCustomPairs(cfg.customPairs),
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
      })
      socket.join(code)
      socket.emit('mw_room_created', { code, room: sanitizeMw(mwRooms[code]), playerToken: token, playerName: name })
    })

    // ── MISTER WHITE — JOIN ───────────────────────────────────
    socket.on('mw_join_room', ({ code, playerName }) => {
      const c = String(code || '').toUpperCase()
      const room = mwRooms[c]
      if (!room) { socket.emit('error', 'Sala não encontrada'); return }
      touchRoom(room)

      const name = normalizePlayerName(playerName)
      if (!name) { socket.emit('error', 'Nome inválido'); return }
      if (socketSeatedIn(room, socket.id)) { socket.emit('error', 'Já estás nesta sala'); return }
      if (room.players.find((p) => p.name === name)) { socket.emit('error', 'Nome já em uso'); return }
      if (room.status !== 'waiting') { socket.emit('error', 'Jogo já começou'); return }
      if (room.players.length >= 12) { socket.emit('error', 'Sala cheia (máx. 12)'); return }

      notifyDetachedMw(io, detachSocketFromRooms(mwRooms, socket.id, c))
      const token = generatePlayerToken()
      room.players.push({ id: socket.id, name, token, disconnected: false })
      socket.join(c)
      socket.emit('mw_room_joined', { code: c, room: sanitizeMw(room), playerToken: token, playerName: name })
      io.to(c).emit('mw_room_updated', sanitizeMw(room))
    })

    socket.on('mw_rejoin_room', ({ code, playerName, playerToken }) => {
      const c = String(code || '').toUpperCase()
      const room = mwRooms[c]
      const auth = authorizeRejoin(room, { playerName, playerToken, socketId: socket.id })
      if (!auth.ok) { socket.emit('error', auth.error); return }
      touchRoom(room)
      migrateMwSockets(room, auth.player.id || auth.player.previousSocketId, socket.id)
      auth.player.id = socket.id
      auth.player.disconnected = false
      auth.player.previousSocketId = null
      if (room.host === auth.player.name) room.hostId = socket.id
      socket.join(c)
      finishMwRejoin(io, room, socket, auth.player)
      io.to(c).emit('mw_room_updated', sanitizeMw(room))
    })

    // ── MISTER WHITE — UPDATE SETTINGS (host) ─────────────────
    socket.on('mw_update_settings', ({ code, settings }) => {
      const room = getMwRoom(code)
      if (!room || room.hostId !== socket.id || room.status !== 'waiting') return
      if (settings) {
        if (settings.numUndercover != null) room.settings.numUndercover = toNonNegativeInt(settings.numUndercover, 0)
        if (settings.numMW != null) room.settings.numMW = toNonNegativeInt(settings.numMW, 0)
        if (settings.wordPack) room.settings.wordPack = String(settings.wordPack).slice(0, 40)
        if (settings.wordPacks) {
          room.settings.wordPacks = sanitizeWordPacks(settings.wordPacks)
          room.settings.wordPack = room.settings.wordPacks[0] || 'geral'
        }
        if (settings.difficulty) room.settings.difficulty = settings.difficulty
        if (settings.difficulties) {
          room.settings.difficulties = sanitizeDifficulties(settings.difficulties)
          room.settings.difficulty = room.settings.difficulties.length === 1
            ? room.settings.difficulties[0]
            : 'normal'
        }
        if ([60, 90, 120].includes(Number(settings.discussionSeconds))) {
          room.settings.discussionSeconds = Number(settings.discussionSeconds)
        }
        if (settings.customPairs != null) {
          room.settings.customPairs = sanitizeCustomPairs(settings.customPairs)
        }
      }
      io.to(room.code).emit('mw_room_updated', sanitizeMw(room))
    })

    // ── MISTER WHITE — START ──────────────────────────────────
    socket.on('mw_start_game', async ({ code }) => {
      const room = getMwRoom(code)
      if (!room) return
      if (room.hostId !== socket.id) { socket.emit('error', 'Só o host pode iniciar'); return }
      if (room.status !== 'waiting') { socket.emit('error', 'O jogo já está a decorrer'); return }
      room.players = room.players.filter((p) => !p.disconnected)
      if (room.players.length < 3) { socket.emit('error', 'Precisas de pelo menos 3 jogadores'); return }
      const maxSpec = Math.max(0, room.players.length - 2)
      if (room.settings.numMW + room.settings.numUndercover < 1) {
        socket.emit('error', 'Escolhe pelo menos um Infiltrado ou Mister White'); return
      }
      if (room.settings.numMW + room.settings.numUndercover > maxSpec) {
        socket.emit('error', 'Demasiados especiais para este número de jogadores'); return
      }
      const selectedPacks = Array.isArray(room.settings.wordPacks) && room.settings.wordPacks.length
        ? room.settings.wordPacks
        : [room.settings.wordPack || 'geral']
      const salaOnly = selectedPacks.every((id) => id === 'sala')
      if ((salaOnly || !selectedPacks.length) && !sanitizeCustomPairs(room.settings.customPairs).length) {
        socket.emit('error', 'Adiciona pelo menos um par de palavras da sala'); return
      }

      room.status = 'starting'
      try {
        const names = room.players.map((p) => p.name)
        const { roles, civilWord, undercoverWord } = await mwAssignRoles(names, room.settings)
        if (room.status !== 'starting') return
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
          io.to(room.code).emit('mw_game_started', sanitizeMw(room))
        })
      } catch (err) {
        if (room.status === 'starting') room.status = 'waiting'
        socket.emit('error', 'Erro ao iniciar jogo')
      }
    })

    // ── MISTER WHITE — REVEAL READY ───────────────────────────
    socket.on('mw_reveal_ready', ({ code }) => {
      const room = getMwRoom(code)
      if (!room || room.status !== 'reveal') return
      const player = room.players.find((p) => p.id === socket.id && !p.disconnected)
      if (!player) return
      if (!room.revealReady.includes(socket.id)) room.revealReady.push(socket.id)
      const connectedIds = new Set(room.players.filter((p) => p.id && !p.disconnected).map((p) => p.id))
      room.revealReady = room.revealReady.filter((id) => connectedIds.has(id))
      const total = connectedIds.size
      io.to(room.code).emit('mw_reveal_progress', {
        ready: room.revealReady.length,
        total,
      })
      if (room.revealReady.length >= total) {
        room.status = 'playing'
        room.timeLeft = room.settings.discussionSeconds
        io.to(room.code).emit('mw_phase', sanitizeMw(room))
      }
    })

    // ── MISTER WHITE — HOST: START VOTE ───────────────────────
    socket.on('mw_start_vote', ({ code }) => {
      const room = getMwRoom(code)
      if (!room || room.hostId !== socket.id) return
      if (room.status !== 'playing') return
      room.status = 'vote'
      room.votes = {}
      io.to(room.code).emit('mw_phase', sanitizeMw(room))
    })

    // ── MISTER WHITE — CAST VOTE ──────────────────────────────
    socket.on('mw_cast_vote', ({ code, targetOrigIdx }) => {
      const room = getMwRoom(code)
      if (!room || room.status !== 'vote') return

      const voterIdx = room.players.findIndex((p) => p.id === socket.id && !p.disconnected)
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
      io.to(room.code).emit('mw_vote_update', sanitizeMw(room))

      const activeCount = room.players.filter((p, i) => !p.disconnected && p.id && !room.eliminated.includes(i)).length
      const votesCast = Object.keys(room.votes).filter((id) => {
        const vi = room.players.findIndex((p) => p.id === id)
        return vi >= 0 && !room.players[vi].disconnected && !room.eliminated.includes(vi)
      }).length

      if (votesCast >= activeCount) {
        mwResolveVotes(room, room.code, io)
      }
    })

    // ── MISTER WHITE — HOST: ELIMINATE (legacy fallback) ───────
    socket.on('mw_eliminate', ({ code }) => {
      const room = getMwRoom(code)
      if (!room || room.hostId !== socket.id || room.status !== 'vote') return
      mwResolveVotes(room, room.code, io)
    })

    // ── MISTER WHITE — MW GUESS ───────────────────────────────
    socket.on('mw_guess', ({ code, guess }) => {
      const room = getMwRoom(code)
      if (!room || room.status !== 'mw_guess') return
      const mwIdx = room.mwGuessIdx
      const mwPlayer = room.players[mwIdx]
      if (!mwPlayer || mwPlayer.id !== socket.id) return

      const g = String(guess || '').trim()
      const correct = guessMatchesWord(g, room.civilWord)

      if (correct) {
        room.gameResult = 'mw_wins'
        room.status = 'result'
        io.to(room.code).emit('mw_phase', sanitizeMw(room, true))
        return
      }

      const remaining = room.roles.filter((_, i) => !room.eliminated.includes(i))
      const undercoveres = remaining.filter((r) => r.role === 'undercover').length
      if (undercoveres > 0) {
        const result = mwCheckEnd(room.roles, room.eliminated)
        if (result) {
          room.gameResult = result
          room.status = 'result'
          io.to(room.code).emit('mw_phase', sanitizeMw(room, true))
          return
        }
        room.roundNum += 1
        room.status = 'playing'
        room.timeLeft = room.settings.discussionSeconds
        room.mwGuessIdx = null
        io.to(room.code).emit('mw_phase', sanitizeMw(room))
      } else {
        room.gameResult = 'civils_win'
        room.status = 'result'
        io.to(room.code).emit('mw_phase', sanitizeMw(room, true))
      }
    })

    // ── MISTER WHITE — RESTART (host) ─────────────────────────
    socket.on('mw_restart', ({ code }) => {
      const room = getMwRoom(code)
      if (!room || room.hostId !== socket.id) return
      if (room.status !== 'result') return
      room.status = 'waiting'
      room.roles = null
      room.eliminated = []
      room.revealReady = []
      room.gameResult = null
      room.mwGuessIdx = null
      room.roundNum = 1
      io.to(room.code).emit('mw_room_updated', sanitizeMw(room))
    })

    registerAldeiaMixHandlers(io, socket)
    registerMemeMixHandlers(io, socket)

    // ── DISCONNECT ────────────────────────────────────────────
    socket.on('disconnect', () => {
      Object.values(rooms).forEach((room) => {
        const player = room.players.find((p) => p.id === socket.id)
        if (!player) return
        player.disconnected = true
        player.previousSocketId = socket.id
        player.id = null
        promoteCardsHostIfNeeded(room)
        const czarChanged = ensureConnectedCardsCzar(room)
        io.to(room.code).emit('room_updated', sanitize(room))
        io.to(room.code).emit('player_disconnected', { name: player.name })
        if (room.status === 'playing') {
          emitCardsRoundState(io, room, czarChanged)
        }
      })
      Object.values(mwRooms).forEach((room) => {
        const player = room.players.find((p) => p.id === socket.id)
        if (!player) return
        player.disconnected = true
        player.previousSocketId = socket.id
        player.id = null
        const hostChanged = promoteMwHostIfNeeded(room)
        const connectedIds = new Set(room.players.filter((p) => p.id && !p.disconnected).map((p) => p.id))
        room.revealReady = (room.revealReady || []).filter((id) => connectedIds.has(id))
        if (room.status === 'reveal') {
          io.to(room.code).emit('mw_reveal_progress', {
            ready: room.revealReady.length,
            total: connectedIds.size,
          })
          if (room.revealReady.length >= connectedIds.size && connectedIds.size > 0) {
            room.status = 'playing'
            room.timeLeft = room.settings.discussionSeconds
            io.to(room.code).emit('mw_phase', sanitizeMw(room))
          }
        } else if (room.status === 'vote') {
          const votesNeeded = connectedMwActiveCount(room)
          if (connectedMwVotesCast(room) >= votesNeeded && votesNeeded > 0) {
            mwResolveVotes(room, room.code, io)
          }
        }
        const state = sanitizeMw(room, room.status === 'result')
        io.to(room.code).emit('mw_room_updated', state)
        if (hostChanged && room.status !== 'waiting') {
          io.to(room.code).emit('mw_phase', state)
        }
      })
      handleAldeiaDisconnect(io, socket)
      handleMemeMixDisconnect(io, socket)
    })
  })

  startRoomGc(rooms)
  startRoomGc(mwRooms)
  startRoomGc(amRooms)
  startRoomGc(mmRooms, { onDestroy: (room) => { try { destroyMemeMixSession(room.code) } catch { /* ignore */ } } })
  cleanupOrphanUploads(Object.keys(mmRooms))
  cleanupStaleUploads()
  const uploadGc = setInterval(() => {
    try {
      cleanupOrphanUploads(Object.keys(mmRooms))
      cleanupStaleUploads()
    } catch { /* ignore */ }
  }, 10 * 60 * 1000)
  if (typeof uploadGc.unref === 'function') uploadGc.unref()
  console.log('✅ WebSocket (Socket.io) ready — salas em memória, morrem se o processo reiniciar')
  return io
}

function notifyDetachedCards(io, detached) {
  for (const room of detached) {
    promoteCardsHostIfNeeded(room)
    io.to(room.code).emit('room_updated', sanitize(room))
  }
}

function notifyDetachedMw(io, detached) {
  for (const room of detached) {
    promoteMwHostIfNeeded(room)
    io.to(room.code).emit('mw_room_updated', sanitizeMw(room, room.status === 'result'))
  }
}

function finishCardsRejoin(io, room, socket, player) {
  const c = room.code
  socket.emit('cards_rejoined', {
    code: c,
    room: sanitize(room),
    playerName: player.name,
    playerToken: player.token,
    isHost: room.host === player.name,
  })
  if (room.status === 'playing') {
    ensureConnectedCardsCzar(room)
    socket.emit('game_started', buildGameState(room, player.name))
    socket.emit('your_hand', room.hands[player.name] || [])
  } else if (room.status === 'waiting') {
    socket.emit('room_joined', { code: c, room: sanitize(room), playerToken: player.token, playerName: player.name })
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
    playerToken: player.token,
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
    players:   publicPlayers(room.players),
    status:    room.status,
    czarIdx:   room.czarIdx,
    czarName:  room.players[room.czarIdx]?.name,
    round:     room.round,
    blackCard: room.blackCard,
    revealed:  room.revealed,
    submissionCount: Object.keys(room.submissions||{}).length,
  }
}

function cardsNonCzarInPlay(room) {
  const czar = room.players[room.czarIdx]
  return room.players.filter((p) => isInPlay(p) && p.name !== czar?.name)
}

function skipPendingCardsPlayers(room) {
  const czar = room.players[room.czarIdx]
  let n = 0
  for (const p of room.players) {
    if (!isInPlay(p) || p.name === czar?.name) continue
    if (!room.submissions?.[p.name]) {
      p.sittingOut = true
      n += 1
    }
  }
  return n
}

function buildGameState(room, viewerName = null) {
  const czar = room.players[room.czarIdx]
  const connectedNonCzars = cardsNonCzarInPlay(room)
  const revealedSubmissions = room.revealed
    ? Object.entries(room.submissions || {}).map(([pname, card]) => ({ playerId: pname, card }))
    : []
  return {
    status:    room.status,
    round:     room.round,
    czarIdx:   room.czarIdx,
    czarName:  room.players[room.czarIdx]?.name,
    blackCard: room.blackCard,
    players:   room.players.map(p=>({ name:p.name, score:p.score, disconnected: !!p.disconnected, sittingOut: !!p.sittingOut })),
    revealed:  !!room.revealed,
    submissions: revealedSubmissions,
    roundWinner: room.roundWinner || null,
    roundEnded: !!room.roundWinner,
    submittedThisRound: !!(viewerName && room.submissions?.[viewerName]),
    submissionUpdate: {
      count: connectedNonCzars.filter((p) => room.submissions?.[p.name]).length,
      total: connectedNonCzars.length,
      allDone: connectedNonCzars.every((p) => room.submissions?.[p.name]),
    },
  }
}

function findNextConnectedCardsIdx(room, startIdx) {
  if (!room.players.length) return -1
  for (let offset = 1; offset <= room.players.length; offset += 1) {
    const idx = (startIdx + offset) % room.players.length
    const player = room.players[idx]
    if (isInPlay(player)) return idx
  }
  return -1
}

function ensureConnectedCardsCzar(room) {
  const current = room.players[room.czarIdx]
  if (isInPlay(current)) return false
  const nextIdx = findNextConnectedCardsIdx(room, room.czarIdx)
  if (nextIdx < 0) return false
  room.czarIdx = nextIdx
  delete room.submissions[room.players[nextIdx].name]
  return true
}

function promoteCardsHostIfNeeded(room) {
  const current = room.players.find((p) => p.name === room.host)
  if (current?.id && !current.disconnected) return false
  const next = room.players.find((p) => p.id && !p.disconnected)
  if (!next) return false
  room.host = next.name
  return true
}

function promoteMwHostIfNeeded(room) {
  const current = room.players.find((p) => p.id === room.hostId && !p.disconnected)
  if (current) return false
  const next = room.players.find((p) => p.id && !p.disconnected)
  if (!next) return false
  room.host = next.name
  room.hostId = next.id
  return true
}

function emitCardsRoundState(io, room, czarChanged = false) {
  const czar = room.players[room.czarIdx]
  const nonCzars = cardsNonCzarInPlay(room)
  const update = {
    count: nonCzars.filter((p) => room.submissions?.[p.name]).length,
    total: nonCzars.length,
    allDone: nonCzars.every((p) => room.submissions?.[p.name]),
  }
  io.to(room.code).emit('submission_update', update)
  if (czarChanged) {
    io.to(room.code).emit('new_round', {
      round: room.round,
      czarIdx: room.czarIdx,
      czarName: czar?.name,
      blackCard: room.blackCard,
      preserveRound: true,
    })
  }
  if (room.revealed) {
    const submissions = Object.entries(room.submissions || {}).map(([pname, card]) => ({
      playerId: pname,
      card,
    }))
    io.to(room.code).emit('cards_revealed', { submissions })
  }
}

function computeVoteCounts(room) {
  const counts = {}
  if (!room.votes) return counts
  for (const [voterId, targetIdx] of Object.entries(room.votes)) {
    const voterIdx = room.players.findIndex((p) => p.id === voterId)
    if (voterIdx < 0 || room.players[voterIdx].disconnected || room.eliminated.includes(voterIdx)) continue
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
  const roomCode = room.code || code

  if (role.role === 'mister_white') {
    room.mwGuessIdx = idx
    room.status = 'mw_guess'
    io.to(roomCode).emit('mw_phase', sanitizeMw(room))
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
    io.to(roomCode).emit('mw_phase', sanitizeMw(room, true))
    return
  }

  room.roundNum += 1
  room.status = 'playing'
  room.timeLeft = room.settings.discussionSeconds
  io.to(roomCode).emit('mw_phase', sanitizeMw(room))
}

function mwResolveVotes(room, code, io) {
  const counts = computeVoteCounts(room)
  const target = pickMostVoted(counts)
  const roomCode = room.code || code
  if (target == null) {
    room.votes = {}
    io.to(roomCode).emit('mw_vote_update', sanitizeMw(room))
    io.to(roomCode).emit('error', 'Ninguém recebeu votos — vota outra vez')
    return
  }
  mwEliminatePlayer(room, roomCode, io, target)
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
  const votesNeeded = connectedMwActiveCount(room)
  const votesCast = connectedMwVotesCast(room)
  const connectedIds = new Set(room.players.filter((p) => p.id && !p.disconnected).map((p) => p.id))
  const revealReady = (room.revealReady || []).filter((id) => connectedIds.has(id)).length

  return {
    code: room.code,
    host: room.host,
    players: publicPlayers(room.players),
    settings: room.settings,
    status: room.status,
    roundNum: room.roundNum,
    timeLeft: room.timeLeft,
    eliminated: [...room.eliminated],
    revealReady,
    revealTotal: connectedIds.size,
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

function connectedMwActiveCount(room) {
  return room.players.filter((p, i) => p.id && !p.disconnected && !room.eliminated.includes(i)).length
}

function connectedMwVotesCast(room) {
  if (!room.votes) return 0
  return Object.keys(room.votes).filter((id) => {
    const idx = room.players.findIndex((p) => p.id === id)
    return idx >= 0 && !room.players[idx].disconnected && !room.eliminated.includes(idx)
  }).length
}

module.exports = {
  initWebSocket,
  _test: {
    connectedMwActiveCount,
    connectedMwVotesCast,
    cardsNonCzarInPlay,
    ensureConnectedCardsCzar,
    skipPendingCardsPlayers,
    promoteCardsHostIfNeeded,
    promoteMwHostIfNeeded,
    rooms,
    mwRooms,
    resetInMemoryRooms() {
      for (const key of Object.keys(rooms)) delete rooms[key]
      for (const key of Object.keys(mwRooms)) delete mwRooms[key]
    },
  },
}
