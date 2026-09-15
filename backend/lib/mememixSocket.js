const Card = require('../models/Card')
const { getLocalLegendas } = require('./localMememix')
const {
  createUploadToken,
  updateTokenSocketId,
  destroyMemeMixSession,
  deleteMemeImage,
  memeViewUrl,
} = require('./mememixSessions')
const {
  allocRoomCode,
  generatePlayerToken,
  normalizePlayerName,
  publicPlayers,
  isInPlay,
  roomsAtCapacity,
  tokensEqual,
  touchRoom,
  detachSocketFromRooms,
  firstInPlayIdx,
  socketSeatedIn,
  removeCardsFromHand,
} = require('./gameAuth')

const mmRooms = {}

function getMmRoom(code) {
  return mmRooms[String(code || '').toUpperCase()] || null
}
const MAX_MEMES_PER_PLAYER = 50
let mmIo = null

function isAuthorizedMemeViewer(room, auth) {
  if (!room || !auth?.socketId || !auth?.playerName) return false
  return room.players.some((player) => (
    !player.disconnected
    && player.id === auth.socketId
    && player.name === auth.playerName
  ))
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
function normalizeLegendaPacks(input) {
  const raw = Array.isArray(input) ? input : [input]
  const packs = raw
    .map(normalizeLegendaPack)
    .filter(Boolean)
  const unique = [...new Set(packs)]
  if (!unique.length || unique.includes('todas') || unique.includes('all')) return ['todas']
  return unique
}
const MAX_LEGENDA_LEN = 200
const MAX_SWAP_LEGENDAS = 3

function removeMemeFromRoom(code, memeId, { socketId } = {}) {
  const c = String(code || '').toUpperCase()
  const room = mmRooms[c]
  if (!room) return { ok: false, error: 'Sala não encontrada' }
  if (room.status !== 'waiting' || room.uploadsLocked) {
    return { ok: false, error: 'Uploads fechados — jogo já começou' }
  }

  let player = socketId ? room.players.find((p) => p.id === socketId) : null
  if (!player) return { ok: false, error: 'Não estás nesta sala — refresca a página' }

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
    juizIdx: room.juizIdx,
    juizName: juiz?.name,
    players: publicPlayers(room.players),
    settings: room.settings,
    status: room.status,
    round: room.round,
    memes: (room.memes || []).map((m) => {
      const file = String(m.url || '').split('/').pop()
      return {
        id: m.id,
        url: file ? memeViewUrl(room.code, file) : m.url,
        uploadedBy: m.uploadedBy,
      }
    }),
    memeCount: (room.memes || []).length,
    memeUploadSummary: memeUploadSummary(room),
    currentMeme: room.currentMeme
      ? {
        ...room.currentMeme,
        url: room.currentMeme.url?.includes('/memes/')
          ? memeViewUrl(room.code, String(room.currentMeme.url).split('/').pop())
          : room.currentMeme.url,
      }
      : null,
    submissions: Object.keys(room.submissions || {}).length,
    submissionsExpected: memePlayersExpected(room).length,
    revealed: room.revealed,
    roundWinner: room.roundWinner,
    lastRoundWinner: room.lastRoundWinner || null,
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
      ? Object.entries(room.submissions || {}).map(([id, submission]) => {
        const p = room.players.find((pl) => pl.id === id)
        return { playerId: id, playerName: room.roundWinner ? p?.name : null, text: submissionText(submission) }
      })
      : [],
    pendingSubmissions: !room.revealed && room.currentMeme
      ? Object.keys(room.submissions || {}).length
      : 0,
  }
}

function submissionText(submission) {
  if (submission && typeof submission === 'object') return String(submission.text || '').trim()
  return String(submission || '').trim()
}

function uniqueTexts(rows) {
  const seen = new Set()
  const out = []
  for (const row of rows || []) {
    const text = String(row?.text || row || '').trim()
    const key = text.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ')
    if (!text || seen.has(key)) continue
    seen.add(key)
    out.push(text)
  }
  return out
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
    if (isInPlay(room.players[idx])) return idx
  }
  return -1
}

function memePlayersExpected(room) {
  const juiz = room.players[room.juizIdx]
  return (room.players || []).filter((p) => isInPlay(p) && p.id !== juiz?.id)
}

function skipPendingMemePlayers(room) {
  const juiz = room.players[room.juizIdx]
  let n = 0
  for (const p of room.players || []) {
    if (!isInPlay(p) || p.id === juiz?.id) continue
    if (!room.submissions?.[p.id]) {
      p.sittingOut = true
      n += 1
    }
  }
  return n
}

function isMmHost(room, socketId) {
  const actor = (room.players || []).find((p) => p.id === socketId && !p.disconnected)
  return Boolean(actor && (room.hostId === socketId || room.host === actor.name))
}

function broadcastMm(io, room) {
  io.to(room.code).emit('mm_round_update', sanitizeMm(room))
  room.players.filter((p) => p.id && !p.disconnected).forEach((p) => {
    io.to(p.id).emit('mm_state', buildGameView(room, p.id))
  })
}

function maybeRevealMemeRound(io, room) {
  ensureConnectedJuiz(room, io)
  const expected = memePlayersExpected(room)
  if (!allExpectedHaveSubmitted(room)) return false
  room.revealed = true
  io.to(room.code).emit('mm_reveal_submissions', sanitizeMm(room))
  room.players.filter((p) => p.id && !p.disconnected).forEach((p) => {
    io.to(p.id).emit('mm_state', buildGameView(room, p.id))
  })
  return true
}

function allExpectedHaveSubmitted(room) {
  const expected = memePlayersExpected(room)
  return expected.length > 0 && expected.every((p) => room.submissions?.[p.id])
}

function ensureConnectedJuiz(room, io) {
  const juiz = room.players[room.juizIdx]
  if (isInPlay(juiz)) return false

  const prevJuizIdx = room.juizIdx
  const nextIdx = findNextConnectedJuizIdx(room, prevJuizIdx)
  if (nextIdx < 0) return false

  room.juizIdx = nextIdx

  if (!room.currentMeme) {
    rotateJuizHands(room, prevJuizIdx)
  }

  io.to(room.code).emit('mm_round_update', sanitizeMm(room))
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

async function loadLegendas(includeCommunity, packsInput, difficulty) {
  const filter = { mode_type: 'mememix', category: 'legenda' }
  const packs = normalizeLegendaPacks(packsInput)
  if (!packs.includes('todas')) {
    const selected = includeCommunity ? [...packs, 'community'] : packs
    filter.pack = selected.length === 1 ? selected[0] : { $in: selected }
  } else if (!includeCommunity) {
    filter.pack = { $ne: 'community' }
  }
  const rows = await Card.find(filter).lean()
  const localRows = getLocalLegendas({ packs, includeCommunity, difficulty })
  return uniqueTexts([...rows, ...localRows])
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
    playerToken: player.token,
  })
  if (room.status === 'playing' || room.status === 'ended') {
    socket.emit('mm_state', buildGameView(room, socket.id))
  }
}

function notifyDetachedMm(io, detached) {
  for (const room of detached) {
    promoteHostIfNeeded(room)
    io.to(room.code).emit('mm_room_updated', sanitizeMm(room))
  }
}

function registerMemeMixHandlers(io, socket) {
  mmIo = io

  socket.on('mm_create_room', ({ playerName, settings }) => {
    const name = normalizePlayerName(playerName)
    if (!name) { socket.emit('error', 'Nome inválido'); return }
    if (roomsAtCapacity(mmRooms)) { socket.emit('error', 'Servidor cheio'); return }
    const code = allocRoomCode(mmRooms)
    if (!code) { socket.emit('error', 'Não foi possível criar sala'); return }
    const cfg = settings || {}
    const legendaPacks = normalizeLegendaPacks(cfg.legendaPacks ?? cfg.legendaPack)
    const playerToken = generatePlayerToken()
    notifyDetachedMm(io, detachSocketFromRooms(mmRooms, socket.id))
    mmRooms[code] = touchRoom({
      code,
      host: name,
      hostId: socket.id,
      juizIdx: 0,
      players: [{ id: socket.id, name, token: playerToken, score: 0, disconnected: false }],
      settings: {
        maxPoints: Math.min(7, Math.max(1, Number(cfg.maxPoints) || 5)),
        includeCommunity: cfg.includeCommunity !== false,
        includeOfficialMemes: cfg.includeOfficialMemes !== false,
        uploads: cfg.uploads === 'host' ? 'host' : 'all',
        maxMemesPerPlayer: clampMaxMemesPerPlayer(cfg.maxMemesPerPlayer),
        legendaMode: normalizeLegendaMode(cfg.legendaMode),
        legendaPack: legendaPacks[0],
        legendaPacks,
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
      lastRoundWinner: null,
      gameWinner: null,
      round: 0,
      currentMeme: null,
      playerTokens: {},
    })
    socket.join(code)
    const token = createUploadToken(code, socket.id, name)
    mmRooms[code].playerTokens[name] = token
    socket.emit('mm_room_created', { code, room: sanitizeMm(mmRooms[code]), uploadToken: token, playerToken, playerName: name })
  })

  socket.on('mm_join_room', ({ code, playerName }) => {
    const c = String(code || '').toUpperCase()
    const room = mmRooms[c]
    if (!room) { socket.emit('error', 'Sala não encontrada'); return }
    touchRoom(room)

    const name = normalizePlayerName(playerName)
    if (!name) { socket.emit('error', 'Nome inválido'); return }
    if (room.status !== 'waiting') { socket.emit('error', 'Jogo já começou — usa o mesmo nome para voltar'); return }
    if (socketSeatedIn(room, socket.id)) { socket.emit('error', 'Já estás nesta sala'); return }
    if (room.players.find((p) => p.name === name)) { socket.emit('error', 'Nome já em uso'); return }
    if (room.players.length >= MAX_PLAYERS) { socket.emit('error', `Sala cheia (máx. ${MAX_PLAYERS})`); return }

    notifyDetachedMm(io, detachSocketFromRooms(mmRooms, socket.id, c))
    const playerToken = generatePlayerToken()
    room.players.push({ id: socket.id, name, token: playerToken, score: 0, disconnected: false })
    socket.join(c)
    const token = createUploadToken(c, socket.id, name)
    room.playerTokens[name] = token
    socket.emit('mm_room_joined', { code: c, room: sanitizeMm(room), uploadToken: token, playerToken, playerName: name })
    io.to(c).emit('mm_room_updated', sanitizeMm(room))
  })

  socket.on('mm_rejoin_room', ({ code, playerName, uploadToken: oldToken, playerToken }) => {
    const c = String(code || '').toUpperCase()
    const room = mmRooms[c]
    if (!room) { socket.emit('error', 'Sala não encontrada'); return }

    const name = normalizePlayerName(playerName)
    const existing = room.players.find((p) => p.name === name)
    if (!existing) { socket.emit('error', 'Jogador não encontrado nesta sala'); return }
    if (!tokensEqual(existing.token, playerToken)) {
      socket.emit('error', 'Sessão inválida')
      return
    }
    const stored = room.playerTokens[name]
    if (!stored || !tokensEqual(stored, oldToken)) {
      socket.emit('error', 'Sessão inválida')
      return
    }
    if (!existing.disconnected && existing.id && existing.id !== socket.id) {
      socket.emit('error', 'Este jogador ainda está ligado')
      return
    }
    const seated = room.players.find((p) => p.id === socket.id && !p.disconnected)
    if (seated && seated.name !== name) {
      socket.emit('error', 'Já estás nesta sala')
      return
    }
    if (!updateTokenSocketId(stored, socket.id)) {
      socket.emit('error', 'Sessão inválida')
      return
    }
    touchRoom(room)

    const oldId = existing.id || existing.previousSocketId
    migratePlayerSocket(room, oldId, socket.id)
    existing.id = socket.id
    existing.disconnected = false
    existing.previousSocketId = null
    if (room.host === name) room.hostId = socket.id
    finishRejoin(io, room, socket, existing, stored)
  })

  socket.on('mm_update_settings', ({ code, settings }) => {
    const room = getMmRoom(code)
    if (!room || room.status !== 'waiting') return

    const player = room.players.find((p) => p.id === socket.id && !p.disconnected)
    const isHost = player && room.hostId === socket.id
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
    if (settings?.legendaPacks != null || settings?.legendaPack != null) {
      const legendaPacks = normalizeLegendaPacks(settings.legendaPacks ?? settings.legendaPack)
      room.settings.legendaPacks = legendaPacks
      room.settings.legendaPack = legendaPacks[0]
    }
    io.to(room.code).emit('mm_room_updated', sanitizeMm(room))
  })

  socket.on('mm_remove_meme', ({ code, memeId }, ack) => {
    const result = removeMemeFromRoom(code, memeId, {
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
    const url = String(meme?.url || '').trim().split('?')[0]
    const prefix = `/api/mememix/rooms/${room.code}/memes/`
    if (!id || !url.startsWith(prefix)) return
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
    io.to(room.code).emit('mm_memes_updated', sanitizeMm(room))
  })

  socket.on('mm_start_game', async ({ code }) => {
    const room = getMmRoom(code)
    if (!room || room.hostId !== socket.id) { socket.emit('error', 'Só o host pode iniciar'); return }
    if (room.status !== 'waiting') { socket.emit('error', 'O jogo já está a decorrer'); return }
    const active = room.players.filter((p) => !p.disconnected)
    if (active.length < 2) { socket.emit('error', 'Precisas de pelo menos 2 jogadores'); return }
    if ((room.memes || []).length < 3) {
      socket.emit('error', 'Adiciona pelo menos 3 memes (fotos) à sala')
      return
    }

    room.status = 'starting'
    try {
      const legendaMode = normalizeLegendaMode(room.settings.legendaMode)
      let legendas = []
      if (legendaMode !== 'escritas') {
        legendas = await loadLegendas(
          room.settings.includeCommunity,
          room.settings.legendaPacks || room.settings.legendaPack,
          room.settings.difficulty,
        )
        if (room.status !== 'starting') return
        const legendasNeeded = Math.max(10, (active.length - 1) * 5)
        if (legendas.length < legendasNeeded) {
          room.status = 'waiting'
          socket.emit('error', `Poucas legendas disponíveis (${legendas.length}/${legendasNeeded}) para os packs escolhidos`)
          return
        }
      }

      let memePool = [...room.memes]
      if (room.settings.includeOfficialMemes) {
        memePool = memePool.concat(await loadOfficialMemes())
      }
      if (room.status !== 'starting') return
      memePool = shuffle(memePool)

      room.legendasDeck = shuffle([...legendas])
      room.memeDeck = memePool
      room.usedMemeIds = new Set()
      room.uploadsLocked = true
      room.status = 'playing'
      room.round = 1
      const firstJuiz = firstInPlayIdx(room)
      room.juizIdx = firstJuiz >= 0 ? firstJuiz : 0
      room.submissions = {}
      room.revealed = false
      room.lastRoundWinner = null
      room.stash = {}
      room.hands = {}
      room.memeHands = {}

      dealMemeMixHands(room)
      room.players.filter((p) => !p.disconnected && p.id).forEach((p) => {
        io.to(p.id).emit('mm_state', buildGameView(room, p.id))
      })
      io.to(room.code).emit('mm_game_started', sanitizeMm(room))
    } catch {
      if (room.status === 'starting') room.status = 'waiting'
      socket.emit('error', 'Erro ao iniciar jogo')
    }
  })

  socket.on('mm_play_meme', ({ code, memeId }) => {
    const room = getMmRoom(code)
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
    io.to(room.code).emit('mm_round_update', sanitizeMm(room))
    room.players.filter((p) => !p.disconnected && p.id).forEach((p) => {
      io.to(p.id).emit('mm_state', buildGameView(room, p.id))
    })
  })

  socket.on('mm_submit_legenda', ({ code, text }) => {
    const room = getMmRoom(code)
    if (!room || room.status !== 'playing' || !room.currentMeme) return
    const player = room.players.find((p) => p.id === socket.id && !p.disconnected)
    const juiz = room.players[room.juizIdx]
    if (!player || player.sittingOut || juiz?.id === socket.id) return
    if (room.submissions[socket.id]) return

    const legenda = String(text || '').trim().slice(0, MAX_LEGENDA_LEN)
    if (!legenda) return

    const mode = normalizeLegendaMode(room.settings.legendaMode)
    const hand = room.hands[socket.id] || []
    const fromHand = hand.includes(legenda)
    if (mode === 'pack' && !fromHand) return
    if (mode === 'escritas' && fromHand) return

    if (fromHand) {
      room.hands[socket.id] = removeCardsFromHand(hand, [legenda])
      const newCard = room.legendasDeck.shift()
      if (newCard) room.hands[socket.id].push(newCard)
    }
    room.submissions[socket.id] = { text: legenda, playerName: room.players.find((p) => p.id === socket.id)?.name || null }

    broadcastMm(io, room)
    if (!maybeRevealMemeRound(io, room)) {
      ensureConnectedJuiz(room, io)
    }
  })

  socket.on('mm_swap_legenda', ({ code, text, texts }) => {
    const room = getMmRoom(code)
    if (!room || room.status !== 'playing') return
    if (normalizeLegendaMode(room.settings.legendaMode) !== 'pack') return
    const player = room.players.find((p) => p.id === socket.id && !p.disconnected)
    const juiz = room.players[room.juizIdx]
    if (!player || player.id === juiz?.id) return
    if ((player.score || 0) < 1) {
      socket.emit('error', 'Precisas de 1 ponto para trocar legendas')
      return
    }

    const raw = Array.isArray(texts) ? texts : [text]
    const wanted = [...new Set(
      raw.map((t) => String(t || '').trim().slice(0, MAX_LEGENDA_LEN)).filter(Boolean),
    )].slice(0, MAX_SWAP_LEGENDAS)
    if (!wanted.length) return

    const hand = room.hands[socket.id] || []
    if (!wanted.every((legenda) => hand.includes(legenda))) return

    wanted.forEach((legenda) => {
      const idx = hand.indexOf(legenda)
      if (idx < 0) return
      hand.splice(idx, 1)
      const replacement = room.legendasDeck.shift()
      if (replacement) hand.push(replacement)
    })
    player.score = Math.max(0, (player.score || 0) - 1)

    io.to(room.code).emit('mm_round_update', sanitizeMm(room))
    room.players.filter((p) => !p.disconnected && p.id).forEach((p) => {
      io.to(p.id).emit('mm_state', buildGameView(room, p.id))
    })
  })

  socket.on('mm_pick_winner', ({ code, winnerId }) => {
    const room = getMmRoom(code)
    if (!room || room.status !== 'playing') return
    const juiz = room.players[room.juizIdx]
    if (juiz?.id !== socket.id) return
    if (!room.revealed) return

    const winner = room.players.find((p) => p.id === winnerId)
    if (!winner || winner.id === juiz.id) return
    const winningText = submissionText(room.submissions[winnerId])
    if (!winningText) return

    winner.score = (winner.score || 0) + 1
    room.roundWinner = winner.name
    room.lastRoundWinner = { playerName: winner.name, text: winningText }

    if (winner.score >= room.settings.maxPoints) {
      room.gameWinner = winner.name
      room.status = 'ended'
      io.to(room.code).emit('mm_game_ended', sanitizeMm(room))
      room.players.filter((p) => !p.disconnected && p.id).forEach((p) => {
        io.to(p.id).emit('mm_state', buildGameView(room, p.id))
      })
      return
    }

    const prevJuizIdx = room.juizIdx
    const nextJuiz = findNextConnectedJuizIdx(room, room.juizIdx)
    room.juizIdx = nextJuiz >= 0 ? nextJuiz : (room.juizIdx + 1) % room.players.length
    room.round += 1
    room.currentMeme = null
    room.submissions = {}
    room.revealed = false
    room.roundWinner = null

    rotateJuizHands(room, prevJuizIdx)

    io.to(room.code).emit('mm_next_round', sanitizeMm(room))
    room.players.filter((p) => !p.disconnected && p.id).forEach((p) => {
      io.to(p.id).emit('mm_state', buildGameView(room, p.id))
    })
  })

  socket.on('mm_play_again', ({ code }) => {
    const room = getMmRoom(code)
    if (!room || room.hostId !== socket.id) return
    if (room.status !== 'ended') return
    room.status = 'waiting'
    room.uploadsLocked = false
    room.gameWinner = null
    room.lastRoundWinner = null
    room.round = 0
    room.currentMeme = null
    room.submissions = {}
    room.revealed = false
    room.hands = {}
    room.memeHands = {}
    room.stash = {}
    room.players.forEach((p) => { p.score = 0; p.sittingOut = false })
    io.to(room.code).emit('mm_room_updated', sanitizeMm(room))
  })

  socket.on('mm_end_session', ({ code }) => {
    const room = getMmRoom(code)
    if (!room) return
    if (room.hostId !== socket.id) {
      socket.emit('error', 'Só o host pode fechar a sala')
      return
    }
    destroyMemeMixSession(room.code)
    io.to(room.code).emit('mm_session_ended', { reason: 'host_closed' })
    delete mmRooms[room.code]
  })

  socket.on('mm_request_state', ({ code }) => {
    const room = getMmRoom(code)
    if (!room) return
    if (!room.players.some((p) => p.id === socket.id && !p.disconnected)) return
    socket.emit('mm_state', buildGameView(room, socket.id))
  })

  socket.on('mm_sit_out', ({ code, playerName }) => {
    const room = getMmRoom(code)
    if (!room || room.status !== 'playing') return
    touchRoom(room)
    const actor = room.players.find((p) => p.id === socket.id && !p.disconnected)
    if (!actor) return
    const targetName = normalizePlayerName(playerName) || actor.name
    if (targetName !== actor.name && !isMmHost(room, socket.id)) return
    const target = room.players.find((p) => p.name === targetName)
    if (!target || target.sittingOut) return
    target.sittingOut = true
    ensureConnectedJuiz(room, io)
    broadcastMm(io, room)
    maybeRevealMemeRound(io, room)
  })

  socket.on('mm_sit_in', ({ code }) => {
    const room = getMmRoom(code)
    if (!room) return
    touchRoom(room)
    const actor = room.players.find((p) => p.id === socket.id && !p.disconnected)
    if (!actor || !actor.sittingOut) return
    actor.sittingOut = false
    broadcastMm(io, room)
  })

  socket.on('mm_skip_pending', ({ code }) => {
    const room = getMmRoom(code)
    if (!room || room.status !== 'playing' || room.revealed || !room.currentMeme) return
    touchRoom(room)
    if (!isMmHost(room, socket.id)) return
    if (!Object.keys(room.submissions || {}).length) return
    skipPendingMemePlayers(room)
    ensureConnectedJuiz(room, io)
    if (!maybeRevealMemeRound(io, room)) broadcastMm(io, room)
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
  player.previousSocketId = socket.id
  player.id = null

  if (room.hostId === socket.id) {
    promoteHostIfNeeded(room)
  }

  const connected = room.players.filter((p) => !p.disconnected)
  if (connected.length === 0) {
    io.to(room.code).emit('mm_room_updated', sanitizeMm(room))
    return
  }

  if (room.status === 'playing') {
    if (room.players[room.juizIdx]?.disconnected) ensureConnectedJuiz(room, io)
    if (!maybeRevealMemeRound(io, room)) {
      io.to(room.code).emit('mm_room_updated', sanitizeMm(room))
    }
  } else {
    io.to(room.code).emit('mm_room_updated', sanitizeMm(room))
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
  isAuthorizedMemeViewer,
  memePlayersExpected,
  skipPendingMemePlayers,
  allExpectedHaveSubmitted,
}
