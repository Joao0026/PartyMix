const Card = require('../models/Card')
const {
  createUploadToken,
  updateTokenSocketId,
  destroyMemeMixSession,
  deleteMemeImage,
} = require('./mememixSessions')

const mmRooms = {}
const MAX_MEMES_PER_PLAYER = 50
let mmIo = null

function getMmRoom(code) {
  return mmRooms[String(code || '').toUpperCase()]
}

function clampMaxMemesPerPlayer(n) {
  return Math.min(MAX_MEMES_PER_PLAYER, Math.max(1, Number(n) || 10))
}

const LEGENDA_MODES = ['pack', 'escritas']
function normalizeLegendaMode(m) {
  if (m === 'misto') return 'pack'
  return LEGENDA_MODES.includes(m) ? m : 'pack'
}
function normalizeLegendaPack(p) {
  const clean = String(p || 'todas').trim().slice(0, 60)
  return clean || 'todas'
}
const MAX_LEGENDA_LEN = 200

function removeMemeFromRoom(code, memeId, { playerName, socketId } = {}) {
  const c = String(code || '').toUpperCase()
  const room = mmRooms[c]
  if (!room) return { ok: false, error: 'Sala não encontrada' }
  if (room.status !== 'waiting' || room.uploadsLocked) {
    return { ok: false, error: 'Uploads fechados — jogo já começou' }
  }

  let player = socketId ? room.players.find((p) => p.id === socketId) : null
  if (!player && playerName) {
    player = room.players.find((p) => p.name === playerName)
  }
  if (!player) return { ok: false, error: 'Não estás nesta sala — refresca a página' }

  if (socketId && player.id !== socketId) {
    migratePlayerSocket(room, player.id, socketId)
    player.id = socketId
    if (room.host === player.name) room.hostId = socketId
  }
  player.disconnected = false

  const id = String(memeId || '').trim()
  let idx = room.memes.findIndex((m) => m.id === id)
  if (idx === -1 && id) {
    idx = room.memes.findIndex((m) => m.url && m.url.includes(id))
  }
  if (idx === -1) return { ok: false, error: 'Foto não encontrada' }

  const meme = room.memes[idx]
  const isMine = meme.uploadedBy === player.name
  const isHost = room.hostId === player.id || room.host === player.name
  if (!isMine && !isHost) return { ok: false, error: 'Só podes apagar as tuas fotos' }

  deleteMemeImage(room.code, meme.id)
  room.memes.splice(idx, 1)
  const sanitized = sanitizeMm(room)
  if (mmIo) mmIo.to(c).emit('mm_memes_updated', sanitized)
  return { ok: true, room: sanitized }
}
const MAX_PLAYERS = 15

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function countMemesByPlayer(room, playerName) {
  return (room.memes || []).filter((m) => m.uploadedBy === playerName).length
}

function memeUploadSummary(room) {
  const counts = {}
  for (const m of room.memes || []) {
    const who = m.uploadedBy || 'Desconhecido'
    counts[who] = (counts[who] || 0) + 1
  }
  return Object.entries(counts).map(([name, count]) => ({ name, count }))
}

function sanitizeMm(room) {
  const juiz = room.players[room.juizIdx]
  return {
    code: room.code,
    host: room.host,
    hostId: room.hostId,
    juizIdx: room.juizIdx,
    juizName: juiz?.name,
    juizId: juiz?.id,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score || 0,
      disconnected: !!p.disconnected,
    })),
    settings: room.settings,
    status: room.status,
    round: room.round,
    memes: (room.memes || []).map((m) => ({
      id: m.id,
      url: m.url,
      uploadedBy: m.uploadedBy,
    })),
    memeCount: (room.memes || []).length,
    memeUploadSummary: memeUploadSummary(room),
    currentMeme: room.currentMeme,
    submissions: Object.keys(room.submissions || {}).length,
    submissionsExpected: Math.max(0, room.players.filter((p) => !p.disconnected).length - 1),
    revealed: room.revealed,
    roundWinner: room.roundWinner,
    gameWinner: room.gameWinner,
    uploadsLocked: room.uploadsLocked,
  }
}

function buildGameView(room, socketId) {
  const base = sanitizeMm(room)
  const juiz = room.players[room.juizIdx]
  const isJuiz = juiz?.id === socketId
  const hand = room.hands?.[socketId] || []
  const memeHand = room.memeHands?.[socketId] || []
  const stash = room.stash?.[socketId] || []

  return {
    ...base,
    isJuiz,
    hand,
    memeHand: isJuiz ? memeHand : [],
    stashLegendas: isJuiz ? stash : [],
    stashCount: stash.length,
    mySubmission: room.submissions?.[socketId] || null,
    submissionsPublic: room.revealed
      ? Object.entries(room.submissions || {}).map(([id, text]) => {
        const p = room.players.find((pl) => pl.id === id)
        return { playerId: id, playerName: p?.name, text }
      })
      : [],
    pendingSubmissions: !room.revealed && room.currentMeme
      ? Object.keys(room.submissions || {}).length
      : 0,
  }
}

function migratePlayerSocket(room, oldId, newId) {
  if (!oldId || oldId === newId) return
  for (const key of ['hands', 'memeHands', 'stash']) {
    if (room[key]?.[oldId] !== undefined) {
      room[key][newId] = room[key][oldId]
      delete room[key][oldId]
    }
  }
  if (room.submissions?.[oldId] !== undefined) {
    room.submissions[newId] = room.submissions[oldId]
    delete room.submissions[oldId]
  }
  for (const m of room.memes || []) {
    if (m.playerId === oldId) m.playerId = newId
  }
}

function promoteHostIfNeeded(room) {
  const hostPlayer = room.players.find((p) => p.id === room.hostId && !p.disconnected)
  if (hostPlayer) return
  const next = room.players.find((p) => !p.disconnected && p.id)
  if (next) {
    room.hostId = next.id
    room.host = next.name
  }
}

function findNextConnectedJuizIdx(room, startIdx) {
  if (!room.players.length) return -1
  let idx = startIdx
  for (let i = 0; i < room.players.length; i++) {
    idx = (idx + 1) % room.players.length
    if (!room.players[idx]?.disconnected && room.players[idx]?.id) return idx
  }
  return -1
}

function ensureConnectedJuiz(room, io, code) {
  const juiz = room.players[room.juizIdx]
  if (!juiz?.disconnected) return false

  const prevJuizIdx = room.juizIdx
  const nextIdx = findNextConnectedJuizIdx(room, prevJuizIdx)
  if (nextIdx < 0) return false

  room.juizIdx = nextIdx

  if (!room.currentMeme) {
    rotateJuizHands(room, prevJuizIdx)
  }

  io.to(code).emit('mm_round_update', sanitizeMm(room))
  room.players.filter((p) => !p.disconnected && p.id).forEach((p) => {
    io.to(p.id).emit('mm_state', buildGameView(room, p.id))
  })
  return true
}

function stashLegendasForJuiz(room, playerId) {
  const current = room.hands[playerId] || []
  if (!current.length) return
  room.stash[playerId] = [...(room.stash[playerId] || []), ...current]
  room.hands[playerId] = []
}

function restoreLegendasFromStash(room, playerId) {
  const saved = room.stash[playerId] || []
  if (!saved.length) return
  room.hands[playerId] = [...saved]
  room.stash[playerId] = []
}

// Garante que um jogador (não-juiz) tem mão de legendas.
// Necessário para o 1.º juiz, que arranca sem mão nem stash.
function ensureLegendaHand(room, playerId) {
  if (normalizeLegendaMode(room.settings.legendaMode) === 'escritas') return
  room.hands[playerId] = room.hands[playerId] || []
  while (room.hands[playerId].length < 5 && room.legendasDeck.length) {
    room.hands[playerId].push(room.legendasDeck.shift())
  }
}

function discardMemeFromPool(room, memeId) {
  const id = String(memeId || '').trim()
  if (!id) return
  if (!room.usedMemeIds) room.usedMemeIds = new Set()
  room.usedMemeIds.add(id)
  room.memeDeck = (room.memeDeck || []).filter((m) => m.id !== id)
  for (const pid of Object.keys(room.memeHands || {})) {
    room.memeHands[pid] = (room.memeHands[pid] || []).filter((m) => m.id !== id)
  }
}

function drawMemesFromDeck(room, count) {
  const out = []
  room.memeDeck = room.memeDeck || []
  while (out.length < count && room.memeDeck.length) {
    const next = room.memeDeck.shift()
    if (room.usedMemeIds?.has(next.id)) continue
    out.push(next)
  }
  return out
}

function returnMemesToDeck(room, playerId) {
  const unused = (room.memeHands[playerId] || []).filter(
    (m) => !room.usedMemeIds?.has(m.id),
  )
  if (unused.length) {
    room.memeDeck.push(...shuffle(unused))
    room.memeHands[playerId] = []
  }
}

function dealMemesToJuiz(room, playerId) {
  room.memeHands[playerId] = room.memeHands[playerId] || []
  while (room.memeHands[playerId].length < 5 && room.memeDeck.length) {
    const next = room.memeDeck.shift()
    if (room.usedMemeIds?.has(next.id)) continue
    room.memeHands[playerId].push(next)
  }
}

async function loadLegendas(includeCommunity, pack) {
  const filter = { mode_type: 'mememix', category: 'legenda' }
  const p = String(pack || 'todas')
  if (p && p !== 'todas' && p !== 'all') {
    filter.pack = includeCommunity ? { $in: [p, 'community'] } : p
  } else if (!includeCommunity) {
    filter.pack = { $ne: 'community' }
  }
  const rows = await Card.find(filter).lean()
  return rows.map((r) => r.text).filter(Boolean)
}

async function loadOfficialMemes() {
  const rows = await Card.find({
    mode_type: 'mememix',
    category: 'meme',
    image: { $ne: '' },
  }).lean()
  return rows.map((r) => ({ id: `db-${r._id}`, url: r.image, uploadedBy: 'pack' }))
}

function finishRejoin(io, room, socket, player, uploadToken) {
  const c = room.code
  socket.join(c)
  promoteHostIfNeeded(room)
  io.to(c).emit('mm_room_updated', sanitizeMm(room))
  socket.emit('mm_rejoined', {
    code: c,
    room: sanitizeMm(room),
    uploadToken,
    playerName: player.name,
    isHost: room.host === player.name,
  })
  if (room.status === 'playing' || room.status === 'ended') {
    socket.emit('mm_state', buildGameView(room, socket.id))
  }
}

function registerMemeMixHandlers(io, socket) {
  mmIo = io

  socket.on('mm_create_room', ({ playerName, settings }) => {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase()
    const cfg = settings || {}
    mmRooms[code] = {
      code,
      host: playerName,
      hostId: socket.id,
      juizIdx: 0,
      players: [{ id: socket.id, name: playerName, score: 0, disconnected: false }],
      settings: {
        maxPoints: Math.min(7, Math.max(1, Number(cfg.maxPoints) || 5)),
        includeCommunity: cfg.includeCommunity !== false,
        includeOfficialMemes: cfg.includeOfficialMemes !== false,
        uploads: cfg.uploads === 'host' ? 'host' : 'all',
        maxMemesPerPlayer: clampMaxMemesPerPlayer(cfg.maxMemesPerPlayer),
        legendaMode: normalizeLegendaMode(cfg.legendaMode),
        legendaPack: normalizeLegendaPack(cfg.legendaPack),
      },
      status: 'waiting',
      memes: [],
      uploadsLocked: false,
      hands: {},
      memeHands: {},
      stash: {},
      legendasDeck: [],
      memeDeck: [],
      usedMemeIds: new Set(),
      submissions: {},
      revealed: false,
      roundWinner: null,
      gameWinner: null,
      round: 0,
      currentMeme: null,
      playerTokens: {},
    }
    socket.join(code)
    const token = createUploadToken(code, socket.id, playerName)
    mmRooms[code].playerTokens[playerName] = token
    socket.emit('mm_room_created', { code, room: sanitizeMm(mmRooms[code]), uploadToken: token })
  })

  socket.on('mm_join_room', ({ code, playerName }) => {
    const c = code.toUpperCase()
    const room = mmRooms[c]
    if (!room) { socket.emit('error', 'Sala não encontrada'); return }

    const existing = room.players.find((p) => p.name === playerName)
    if (existing?.disconnected) {
      const oldId = existing.id
      migratePlayerSocket(room, oldId, socket.id)
      existing.id = socket.id
      existing.disconnected = false
      if (room.host === playerName) room.hostId = socket.id
      let token = room.playerTokens[playerName]
      if (token) updateTokenSocketId(token, socket.id)
      else {
        token = createUploadToken(c, socket.id, playerName)
        room.playerTokens[playerName] = token
      }
      finishRejoin(io, room, socket, existing, token)
      return
    }

    if (room.status !== 'waiting') { socket.emit('error', 'Jogo já começou — usa o mesmo nome para voltar'); return }
    if (room.players.find((p) => p.name === playerName)) { socket.emit('error', 'Nome já em uso'); return }
    if (room.players.length >= MAX_PLAYERS) { socket.emit('error', `Sala cheia (máx. ${MAX_PLAYERS})`); return }

    room.players.push({ id: socket.id, name: playerName, score: 0, disconnected: false })
    socket.join(c)
    const token = createUploadToken(c, socket.id, playerName)
    room.playerTokens[playerName] = token
    socket.emit('mm_room_joined', { code: c, room: sanitizeMm(room), uploadToken: token })
    io.to(c).emit('mm_room_updated', sanitizeMm(room))
  })

  socket.on('mm_rejoin_room', ({ code, playerName, uploadToken: oldToken }) => {
    const c = String(code || '').toUpperCase()
    const room = mmRooms[c]
    if (!room) { socket.emit('error', 'Sala não encontrada'); return }

    const existing = room.players.find((p) => p.name === playerName)
    if (!existing) { socket.emit('error', 'Jogador não encontrado nesta sala'); return }

    const oldId = existing.id
    migratePlayerSocket(room, oldId, socket.id)
    existing.id = socket.id
    existing.disconnected = false
    if (room.host === playerName) room.hostId = socket.id

    let token = room.playerTokens[playerName] || oldToken
    if (token && updateTokenSocketId(token, socket.id)) {
      // refreshed
    } else {
      token = createUploadToken(c, socket.id, playerName)
    }
    room.playerTokens[playerName] = token
    finishRejoin(io, room, socket, existing, token)
  })

  socket.on('mm_update_settings', ({ code, settings, playerName }) => {
    const room = getMmRoom(code)
    if (!room || room.status !== 'waiting') return

    let player = room.players.find((p) => p.id === socket.id)
    if (!player && playerName) {
      player = room.players.find((p) => p.name === playerName)
      if (player && player.id !== socket.id) {
        migratePlayerSocket(room, player.id, socket.id)
        player.id = socket.id
        if (room.host === player.name) room.hostId = socket.id
      }
    }
    const isHost = player && (room.hostId === socket.id || room.host === player.name)
    if (!isHost) return

    if (settings?.maxPoints != null) {
      room.settings.maxPoints = Math.min(7, Math.max(1, Number(settings.maxPoints) || 5))
    }
    if (settings?.includeCommunity != null) room.settings.includeCommunity = !!settings.includeCommunity
    if (settings?.includeOfficialMemes != null) room.settings.includeOfficialMemes = !!settings.includeOfficialMemes
    if (settings?.uploads === 'host' || settings?.uploads === 'all') room.settings.uploads = settings.uploads
    if (settings?.maxMemesPerPlayer != null) {
      room.settings.maxMemesPerPlayer = clampMaxMemesPerPlayer(settings.maxMemesPerPlayer)
    }
    if (settings?.legendaMode != null) {
      room.settings.legendaMode = normalizeLegendaMode(settings.legendaMode)
    }
    if (settings?.legendaPack != null) {
      room.settings.legendaPack = normalizeLegendaPack(settings.legendaPack)
    }
    io.to(room.code).emit('mm_room_updated', sanitizeMm(room))
  })

  socket.on('mm_remove_meme', ({ code, memeId, playerName }, ack) => {
    const result = removeMemeFromRoom(code, memeId, {
      playerName,
      socketId: socket.id,
    })
    if (typeof ack === 'function') ack(result)
    if (!result.ok) socket.emit('error', result.error)
  })

  socket.on('mm_register_meme', ({ code, meme }) => {
    const room = getMmRoom(code)
    if (!room || room.status !== 'waiting' || room.uploadsLocked) return
    if (room.settings.uploads === 'host' && room.hostId !== socket.id) {
      socket.emit('error', 'Só o host pode adicionar memes nesta sala')
      return
    }
    const player = room.players.find((p) => p.id === socket.id)
    if (!player) return
    const id = String(meme?.id || '').trim()
    const url = String(meme?.url || '').trim()
    if (!id || !url) return
    if (room.memes.some((m) => m.id === id)) return
    const mine = countMemesByPlayer(room, player.name)
    if (mine >= room.settings.maxMemesPerPlayer) {
      socket.emit('error', `Máximo ${room.settings.maxMemesPerPlayer} fotos por jogador`)
      return
    }
    room.memes.push({
      id,
      url,
      uploadedBy: player.name,
      playerId: socket.id,
    })
    io.to(code).emit('mm_memes_updated', sanitizeMm(room))
  })

  socket.on('mm_start_game', async ({ code }) => {
    const room = mmRooms[code]
    if (!room || room.hostId !== socket.id) { socket.emit('error', 'Só o host pode iniciar'); return }
    const active = room.players.filter((p) => !p.disconnected)
    if (active.length < 2) { socket.emit('error', 'Precisas de pelo menos 2 jogadores'); return }
    if ((room.memes || []).length < 3) {
      socket.emit('error', 'Adiciona pelo menos 3 memes (fotos) à sala')
      return
    }

    const legendaMode = normalizeLegendaMode(room.settings.legendaMode)
    let legendas = []
    if (legendaMode !== 'escritas') {
      legendas = await loadLegendas(room.settings.includeCommunity, room.settings.legendaPack)
      const legendasNeeded = Math.max(10, (active.length - 1) * 5)
      if (legendas.length < legendasNeeded) {
        socket.emit('error', `Poucas legendas (${legendas.length}/${legendasNeeded}) — corre npm run seed:packs`)
        return
      }
    }

    let memePool = [...room.memes]
    if (room.settings.includeOfficialMemes) {
      memePool = memePool.concat(await loadOfficialMemes())
    }
    memePool = shuffle(memePool)

    room.legendasDeck = shuffle([...legendas])
    room.memeDeck = memePool
    room.usedMemeIds = new Set()
    room.uploadsLocked = true
    room.status = 'playing'
    room.round = 1
    room.juizIdx = 0
    room.submissions = {}
    room.revealed = false
    room.stash = {}
    room.hands = {}
    room.memeHands = {}

    dealMemeMixHands(room)
    room.players.filter((p) => !p.disconnected && p.id).forEach((p) => {
      io.to(p.id).emit('mm_state', buildGameView(room, p.id))
    })
    io.to(code).emit('mm_game_started', sanitizeMm(room))
  })

  socket.on('mm_play_meme', ({ code, memeId }) => {
    const room = mmRooms[code]
    if (!room || room.status !== 'playing') return
    const juiz = room.players[room.juizIdx]
    if (juiz?.id !== socket.id) return
    if (room.currentMeme) return

    const hand = room.memeHands[socket.id] || []
    const meme = hand.find((m) => m.id === memeId)
    if (!meme) return

    room.currentMeme = meme
    room.memeHands[socket.id] = hand.filter((m) => m.id !== memeId)
    discardMemeFromPool(room, memeId)
    room.submissions = {}
    room.revealed = false
    io.to(code).emit('mm_round_update', sanitizeMm(room))
    room.players.filter((p) => !p.disconnected && p.id).forEach((p) => {
      io.to(p.id).emit('mm_state', buildGameView(room, p.id))
    })
  })

  socket.on('mm_submit_legenda', ({ code, text }) => {
    const room = mmRooms[code]
    if (!room || room.status !== 'playing' || !room.currentMeme) return
    const juiz = room.players[room.juizIdx]
    if (juiz?.id === socket.id) return
    if (room.submissions[socket.id]) return

    const legenda = String(text || '').trim().slice(0, MAX_LEGENDA_LEN)
    if (!legenda) return

    const mode = normalizeLegendaMode(room.settings.legendaMode)
    const hand = room.hands[socket.id] || []
    const fromHand = hand.includes(legenda)
    if (mode === 'pack' && !fromHand) return
    if (mode === 'escritas' && fromHand) return

    if (fromHand) {
      room.hands[socket.id] = hand.filter((c) => c !== legenda)
      const newCard = room.legendasDeck.shift()
      if (newCard) room.hands[socket.id].push(newCard)
    }
    room.submissions[socket.id] = legenda

    io.to(code).emit('mm_round_update', sanitizeMm(room))
    room.players.filter((p) => !p.disconnected && p.id).forEach((p) => {
      io.to(p.id).emit('mm_state', buildGameView(room, p.id))
    })

    ensureConnectedJuiz(room, io, code)
    const activeJuiz = room.players[room.juizIdx]
    const expected = room.players.filter((p) => p.id !== activeJuiz?.id && !p.disconnected).length
    if (Object.keys(room.submissions).length >= expected) {
      ensureConnectedJuiz(room, io, code)
      room.revealed = true
      io.to(code).emit('mm_reveal_submissions', sanitizeMm(room))
      room.players.filter((p) => !p.disconnected && p.id).forEach((p) => {
        io.to(p.id).emit('mm_state', buildGameView(room, p.id))
      })
    }
  })

  socket.on('mm_pick_winner', ({ code, winnerId }) => {
    const room = mmRooms[code]
    if (!room || room.status !== 'playing') return
    const juiz = room.players[room.juizIdx]
    if (juiz?.id !== socket.id) return
    if (!room.revealed) return

    const winner = room.players.find((p) => p.id === winnerId)
    if (!winner || winner.id === juiz.id) return
    if (!room.submissions[winnerId]) return

    winner.score = (winner.score || 0) + 1
    room.roundWinner = winner.name

    if (winner.score >= room.settings.maxPoints) {
      room.gameWinner = winner.name
      room.status = 'ended'
      io.to(code).emit('mm_game_ended', sanitizeMm(room))
      room.players.filter((p) => !p.disconnected && p.id).forEach((p) => {
        io.to(p.id).emit('mm_state', buildGameView(room, p.id))
      })
      return
    }

    const prevJuizIdx = room.juizIdx
    room.juizIdx = (room.juizIdx + 1) % room.players.length
    while (room.players[room.juizIdx]?.disconnected && room.players.length > 1) {
      room.juizIdx = (room.juizIdx + 1) % room.players.length
    }
    room.round += 1
    room.currentMeme = null
    room.submissions = {}
    room.revealed = false
    room.roundWinner = null

    rotateJuizHands(room, prevJuizIdx)

    io.to(code).emit('mm_next_round', sanitizeMm(room))
    room.players.filter((p) => !p.disconnected && p.id).forEach((p) => {
      io.to(p.id).emit('mm_state', buildGameView(room, p.id))
    })
  })

  socket.on('mm_play_again', ({ code }) => {
    const room = mmRooms[code]
    if (!room || room.hostId !== socket.id) return
    room.status = 'waiting'
    room.uploadsLocked = false
    room.gameWinner = null
    room.round = 0
    room.currentMeme = null
    room.submissions = {}
    room.revealed = false
    room.hands = {}
    room.memeHands = {}
    room.stash = {}
    room.players.forEach((p) => { p.score = 0 })
    io.to(code).emit('mm_room_updated', sanitizeMm(room))
  })

  socket.on('mm_end_session', ({ code }) => {
    const room = mmRooms[code]
    if (!room) return
    if (room.hostId !== socket.id) {
      socket.emit('error', 'Só o host pode fechar a sala')
      return
    }
    destroyMemeMixSession(code)
    io.to(code).emit('mm_session_ended', { reason: 'host_closed' })
    delete mmRooms[code]
  })

  socket.on('mm_request_state', ({ code }) => {
    const room = mmRooms[code]
    if (!room) return
    if (!room.players.some((p) => p.id === socket.id && !p.disconnected)) return
    socket.emit('mm_state', buildGameView(room, socket.id))
  })
}

function rotateJuizHands(room, prevJuizIdx) {
  const prev = room.players[prevJuizIdx]
  const next = room.players[room.juizIdx]
  if (prev?.id) {
    returnMemesToDeck(room, prev.id)
    restoreLegendasFromStash(room, prev.id)
    ensureLegendaHand(room, prev.id)
  }
  if (next?.id) {
    stashLegendasForJuiz(room, next.id)
    dealMemesToJuiz(room, next.id)
  }
}

function dealMemeMixHands(room) {
  const juiz = room.players[room.juizIdx]
  const legendaMode = normalizeLegendaMode(room.settings.legendaMode)
  const dealLegendas = legendaMode !== 'escritas'
  room.players.forEach((p) => {
    if (!p.id) return
    if (p.id === juiz?.id) {
      room.memeHands[p.id] = drawMemesFromDeck(room, 5)
      room.stash[p.id] = []
      room.hands[p.id] = []
    } else {
      room.hands[p.id] = dealLegendas ? room.legendasDeck.splice(0, 5) : []
      room.memeHands[p.id] = []
      room.stash[p.id] = []
    }
  })
}

function handleMemeMixDisconnect(io, socket) {
  const code = Object.keys(mmRooms).find((c) => mmRooms[c].players.some((p) => p.id === socket.id))
  if (!code) return
  const room = mmRooms[code]
  const idx = room.players.findIndex((p) => p.id === socket.id)
  if (idx === -1) return

  const player = room.players[idx]
  player.disconnected = true

  if (room.hostId === socket.id) {
    promoteHostIfNeeded(room)
  }

  const connected = room.players.filter((p) => !p.disconnected)
  if (connected.length === 0) {
    destroyMemeMixSession(code)
    delete mmRooms[code]
    return
  }

  if (room.status === 'playing' && room.players[room.juizIdx]?.disconnected) {
    ensureConnectedJuiz(room, io, code)
  } else {
    io.to(code).emit('mm_room_updated', sanitizeMm(room))
  }
}

module.exports = {
  mmRooms,
  MAX_PLAYERS,
  MAX_MEMES_PER_PLAYER,
  registerMemeMixHandlers,
  handleMemeMixDisconnect,
  sanitizeMm,
  buildGameView,
  removeMemeFromRoom,
}
