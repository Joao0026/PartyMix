const {
  validateSettings,
  normalizeSettings,
  isValidNightPick,
  defaultSettings,
  assignRoles,
  assignRolesForRoom,
  checkEndCondition,
  computeVoteCounts,
  isVoteTie,
  pickMostVoted,
  resolveNight,
} = require('./aldeiaMix')
const { nextNightStep, stepScript } = require('./aldeiaNarrator')
const {
  allocRoomCode,
  authorizeRejoin,
  detachSocketFromRooms,
  dropDisconnectedPlayers,
  generatePlayerToken,
  normalizePlayerName,
  publicPlayers,
  roomsAtCapacity,
  socketSeatedIn,
  touchRoom,
} = require('./gameAuth')

const amRooms = {}

function getAmRoom(code) {
  return amRooms[String(code || '').toUpperCase()] || null
}

function isJuiz(room, socketId) {
  const juiz = room.players[room.juizIdx]
  if (juiz && juiz.id === socketId && !juiz.disconnected) return true
  const me = room.players.find((p) => p.id === socketId && !p.disconnected)
  return Boolean(me && juiz && me.name === juiz.name)
}

function aliveRoleCount(room) {
  if (!room.roles) return 0
  return room.roles.filter((_, i) => !room.eliminated.includes(i)).length
}

function isNarratorIdx(room, idx) {
  return idx === room.juizIdx
}

function isPlayingRole(role) {
  return role && role !== 'narrador'
}

function aliveVoters(room) {
  if (!room.roles) return []
  return room.roles
    .map((r, i) => ({ ...r, origIdx: i }))
    .filter((r) => {
      const player = room.players.find((p) => p.name === r.name)
      return isPlayingRole(r.role)
        && !room.eliminated.includes(r.origIdx)
        && !!player?.id
        && !player.disconnected
    })
}

function countValidVotes(room) {
  if (!room.roles) return 0
  return Object.keys(room.dayVotes || {}).filter((name) => {
    const idx = room.roles.findIndex((r) => r.name === name)
    const player = room.players.find((p) => p.name === name)
    return idx >= 0
      && isPlayingRole(room.roles[idx]?.role)
      && !room.eliminated.includes(idx)
      && !!player?.id
      && !player.disconnected
  }).length
}

function connectedDayVotes(room) {
  return Object.fromEntries(Object.entries(room.dayVotes || {}).filter(([name]) => {
    const player = room.players.find((p) => p.name === name)
    const idx = room.roles?.findIndex((r) => r.name === name) ?? -1
    return !!player?.id
      && !player.disconnected
      && idx >= 0
      && isPlayingRole(room.roles[idx]?.role)
      && !room.eliminated.includes(idx)
  }))
}

function playingReadyTotal(room) {
  return room.players.filter((p, i) => !p.disconnected && i !== room.juizIdx).length
}

function resetNarratorNight(room) {
  room.narratorNight = { wolfTarget: null, medicTarget: null, sheriffTarget: null }
}

function clearDayTimer(room) {
  if (room.discussionTimer) {
    clearTimeout(room.discussionTimer)
    room.discussionTimer = null
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

function connectedPlayerIdxs(room) {
  return room.players
    .map((p, i) => (!p.disconnected && p.id ? i : -1))
    .filter((i) => i >= 0)
}

function pickRandomConnectedIdx(room) {
  const idxs = connectedPlayerIdxs(room)
  if (!idxs.length) return 0
  return idxs[Math.floor(Math.random() * idxs.length)]
}

function nextConnectedJuizIdx(room, fromIdx) {
  const n = room.players.length
  if (!n) return 0
  for (let step = 1; step <= n; step++) {
    const i = (fromIdx + step) % n
    if (!room.players[i]?.disconnected) return i
  }
  return fromIdx
}

function isAlivePlayingTarget(room, target) {
  return Number.isInteger(target)
    && target >= 0
    && target < (room.roles || []).length
    && isPlayingRole(room.roles[target]?.role)
    && !room.eliminated.includes(target)
    && !isNarratorIdx(room, target)
}

function sanitizeAm(room, revealAll = false, viewerName = null) {
  const rolesPublic = room.roles
    ? room.roles.map((r, i) => ({
      origIdx: i,
      name: r.name,
      eliminated: room.eliminated.includes(i),
      isNarrator: isNarratorIdx(room, i) || r.role === 'narrador',
      ...(revealAll || room.status === 'result'
        ? { role: r.role === 'narrador' ? 'narrador' : r.role }
        : {}),
    }))
    : []

  const juizPlayer = room.players[room.juizIdx]
  const readyNames = room.revealReady || []

  return {
    code: room.code,
    host: room.host,
    juizIdx: room.juizIdx,
    juizName: juizPlayer?.name,
    players: publicPlayers(room.players),
    settings: room.settings,
    status: room.status,
    nightStep: room.nightStep || null,
    nightScript: room.nightStep ? stepScript(room.nightStep) : '',
    dayNum: room.dayNum || 0,
    roundNum: room.roundNum,
    eliminated: [...room.eliminated],
    revealReady: readyNames.length,
    revealTotal: playingReadyTotal(room),
    rolesPublic,
    gameResult: room.gameResult,
    lastNight: room.lastNight,
    lastEliminatedIdx: room.lastEliminatedIdx,
    matchNum: room.matchNum || 1,
    deadNames: room.roles
      ? room.eliminated.map((i) => room.roles[i]?.name).filter(Boolean)
      : [],
    discussionEndsAt: room.discussionEndsAt || null,
    discussionSecondsLeft: room.discussionEndsAt
      ? Math.max(0, Math.ceil((room.discussionEndsAt - Date.now()) / 1000))
      : 0,
    votesCast: countValidVotes(room),
    votesExpected: aliveVoters(room).length,
    votingClosed: !!room.votingClosed,
    voteTally: room.voteTally || [],
    myVote: viewerName != null ? (room.dayVotes?.[viewerName] ?? null) : undefined,
    lastVoteEliminatedName: room.lastVoteEliminatedName || null,
    lastVoteTie: !!room.lastVoteTie,
  }
}

function sanitizeNarrator(room) {
  const na = room.narratorNight || {}
  return {
    wolfTarget: na.wolfTarget,
    medicTarget: na.medicTarget,
    sheriffTarget: na.sheriffTarget,
    sheriffIsWolf: na.sheriffTarget != null
      ? room.roles[na.sheriffTarget]?.role === 'lobo'
      : null,
    roleByIdx: Object.fromEntries((room.roles || []).map((r, i) => [i, r.role])),
  }
}

function emitToPlayer(io, room, player, event, payload) {
  if (player?.id && !player.disconnected) io.to(player.id).emit(event, payload)
}

function broadcastPhase(io, room) {
  const juiz = room.players[room.juizIdx]
  const base = sanitizeAm(room, false)
  io.to(room.code).emit('am_phase', base)

  room.players.filter((p) => p.id && !p.disconnected).forEach((p) => {
    const view = sanitizeAm(room, false, p.name)
    io.to(p.id).emit('am_phase', view)
    if (p.name === juiz?.name) {
      io.to(p.id).emit('am_narrator_state', {
        ...view,
        ...sanitizeNarrator(room),
      })
    }
  })
}

function markEliminated(room, idx) {
  if (!Number.isInteger(idx) || room.eliminated.includes(idx)) return false
  room.eliminated.push(idx)
  room.lastEliminatedIdx = idx
  const name = room.roles[idx]?.name
  if (name && room.dayVotes) delete room.dayVotes[name]
  return true
}

function applyNightDeath(room) {
  const outcome = resolveNight(room)
  room.lastNight = outcome
  if (outcome.killed != null) markEliminated(room, outcome.killed)
  return outcome
}

function checkWinOrContinue(room, io) {
  const end = checkEndCondition(room.roles, room.eliminated)
  if (end) {
    clearDayTimer(room)
    room.gameResult = end
    room.status = 'result'
    room.players.filter((p) => p.id && !p.disconnected).forEach((p) => {
      io.to(p.id).emit('am_phase', sanitizeAm(room, true, p.name))
    })
    return true
  }
  return false
}

function startDayVoting(room, io) {
  clearDayTimer(room)
  room.dayVotes = {}
  room.voteTally = []
  room.votingClosed = false
  room.lastVoteEliminatedName = null
  room.lastVoteTie = false
  const ms = (room.settings.discussionSeconds || 120) * 1000
  room.discussionEndsAt = Date.now() + ms
  room.discussionTimer = setTimeout(() => closeDayVoting(room, io), ms)
  broadcastPhase(io, room)
}

function advanceToNightAfterDay(room, io, reason = 'skip') {
  if (room.status === 'result') return
  room.status = 'night'
  room.nightStep = 'sleep'
  room.roundNum += 1
  resetNarratorNight(room)
  broadcastPhase(io, room)
  io.to(room.code).emit('am_day_skipped', { dayNum: room.dayNum, reason })
}

function emitVotingClosed(io, room, { skipElimination = false, tied = false } = {}) {
  broadcastPhase(io, room)
  io.to(room.code).emit('am_voting_closed', {
    tally: room.voteTally,
    eliminatedName: room.lastVoteEliminatedName,
    skipped: skipElimination,
    tied,
  })
}

function closeDayVoting(room, io, { skipElimination = false } = {}) {
  if (room.status !== 'day') return
  if (room.votingClosed) {
    emitVotingClosed(io, room, { skipElimination, tied: !!room.lastVoteTie })
    return
  }
  clearDayTimer(room)
  room.votingClosed = true
  room.discussionEndsAt = null

  const counts = computeVoteCounts(connectedDayVotes(room), room.roles, room.eliminated)
  room.voteTally = Object.entries(counts)
    .map(([idx, c]) => ({
      origIdx: Number(idx),
      name: room.roles[idx]?.name,
      votes: c,
    }))
    .sort((a, b) => b.votes - a.votes)

  room.lastVoteEliminatedName = null
  const tie = !skipElimination && isVoteTie(counts)
  room.lastVoteTie = tie

  if (!skipElimination && !tie) {
    const target = pickMostVoted(counts)
    if (target != null && markEliminated(room, target)) {
      room.lastVoteEliminatedName = room.roles[target]?.name
      if (checkWinOrContinue(room, io)) return
    }
  }

  emitVotingClosed(io, room, { skipElimination, tied: tie })

  if (skipElimination || tie) {
    advanceToNightAfterDay(room, io, tie ? 'tie' : 'skip')
  }
}

function skipDayToNight(room, io) {
  if (room.status !== 'day') return
  closeDayVoting(room, io, { skipElimination: true })
}

function startNewMatch(room) {
  const validation = validateSettings(room.settings, room.players.filter((p) => !p.disconnected).length)
  if (!validation.ok) return validation

  room.settings = validation.settings
  room.roles = assignRolesForRoom(room.players.map((p) => p.name), room.juizIdx, room.settings)
  room.eliminated = []
  room.revealReady = []
  room.gameResult = null
  room.lastNight = null
  room.lastEliminatedIdx = null
  room.roundNum = 1
  room.dayNum = 0
  room.matchNum = (room.matchNum || 0) + 1
  resetNarratorNight(room)
  room.nightStep = null
  room.status = 'reveal'
  room.dayVotes = {}
  room.voteTally = []
  room.votingClosed = false
  room.lastVoteEliminatedName = null
  clearDayTimer(room)
  return { ok: true }
}

function finishRejoin(io, room, socket, player) {
  const c = room.code
  socket.join(c)
  promoteHostIfNeeded(room)
  if (room.host === player.name) room.hostId = socket.id

  const idx = room.players.findIndex((p) => p.name === player.name)
  if (idx >= 0 && room.roles?.[idx] && isPlayingRole(room.roles[idx].role)) {
    socket.emit('am_your_role', {
      role: room.roles[idx].role,
      name: player.name,
      origIdx: idx,
    })
  }

  socket.emit('am_rejoined', {
    code: c,
    room: sanitizeAm(room, room.status === 'result', player.name),
    playerName: player.name,
    playerToken: player.token,
    isHost: room.host === player.name,
  })

  const juiz = room.players[room.juizIdx]
  const view = sanitizeAm(room, room.status === 'result', player.name)
  socket.emit('am_phase', view)
  if (juiz?.name === player.name) {
    socket.emit('am_narrator_state', { ...view, ...sanitizeNarrator(room) })
  }
  io.to(c).emit('am_room_updated', sanitizeAm(room))
}

function registerAldeiaMixHandlers(io, socket) {
  socket.on('am_create_room', ({ playerName, settings }) => {
    const name = normalizePlayerName(playerName)
    if (!name) { socket.emit('error', 'Nome inválido'); return }
    if (roomsAtCapacity(amRooms)) { socket.emit('error', 'Servidor cheio'); return }
    const code = allocRoomCode(amRooms)
    if (!code) { socket.emit('error', 'Não foi possível criar sala'); return }
    const token = generatePlayerToken()
    const cfg = settings || {}
    notifyDetachedAm(io, detachSocketFromRooms(amRooms, socket.id))
    amRooms[code] = touchRoom({
      code,
      host: name,
      hostId: socket.id,
      juizIdx: 0,
      players: [{ id: socket.id, name, token, disconnected: false }],
      settings: {
        ...defaultSettings(),
        numLobos: Math.max(1, Number(cfg.numLobos) || 1),
        numCurandeiras: Math.max(1, Number(cfg.numCurandeiras) || 1),
        numVidentes: Math.max(1, Number(cfg.numVidentes) || 1),
        discussionSeconds: [60, 90, 120, 180].includes(Number(cfg.discussionSeconds))
          ? Number(cfg.discussionSeconds) : 120,
      },
      status: 'waiting',
      roles: null,
      eliminated: [],
      roundNum: 1,
      dayNum: 0,
      matchNum: 0,
      revealReady: [],
      gameResult: null,
      narratorNight: { wolfTarget: null, medicTarget: null, sheriffTarget: null },
      nightStep: null,
      lastNight: null,
      dayVotes: {},
      voteTally: [],
      votingClosed: false,
    })
    socket.join(code)
    socket.emit('am_room_created', { code, room: sanitizeAm(amRooms[code]), playerToken: token, playerName: name })
  })

  socket.on('am_join_room', ({ code, playerName }) => {
    const c = String(code || '').toUpperCase()
    const room = amRooms[c]
    if (!room) { socket.emit('error', 'Sala não encontrada'); return }
    touchRoom(room)

    const name = normalizePlayerName(playerName)
    if (!name) { socket.emit('error', 'Nome inválido'); return }
    if (room.status !== 'waiting') { socket.emit('error', 'Jogo já começou — usa o mesmo nome para voltar'); return }
    if (socketSeatedIn(room, socket.id)) { socket.emit('error', 'Já estás nesta sala'); return }
    if (room.players.find((p) => p.name === name)) { socket.emit('error', 'Nome já em uso'); return }
    if (room.players.length >= 15) { socket.emit('error', 'Sala cheia (máx. 15)'); return }

    notifyDetachedAm(io, detachSocketFromRooms(amRooms, socket.id, c))
    const token = generatePlayerToken()
    room.players.push({ id: socket.id, name, token, disconnected: false })
    socket.join(c)
    socket.emit('am_room_joined', { code: c, room: sanitizeAm(room), playerToken: token, playerName: name })
    io.to(c).emit('am_room_updated', sanitizeAm(room))
  })

  socket.on('am_rejoin_room', ({ code, playerName, playerToken }) => {
    const c = String(code || '').toUpperCase()
    const room = amRooms[c]
    const auth = authorizeRejoin(room, { playerName, playerToken, socketId: socket.id })
    if (!auth.ok) { socket.emit('error', auth.error); return }
    touchRoom(room)
    auth.player.id = socket.id
    auth.player.disconnected = false
    auth.player.previousSocketId = null
    finishRejoin(io, room, socket, auth.player)
  })

  socket.on('am_update_settings', ({ code, settings }) => {
    const room = getAmRoom(code)
    if (!room || room.hostId !== socket.id || room.status !== 'waiting') return
    const next = normalizeSettings({ ...room.settings, ...settings })
    const prev = room.settings || {}
    const unchanged = prev.numLobos === next.numLobos
      && prev.numCurandeiras === next.numCurandeiras
      && prev.numVidentes === next.numVidentes
      && prev.discussionSeconds === next.discussionSeconds
      && prev.nightSeconds === next.nightSeconds
    if (unchanged) return
    room.settings = next
    io.to(room.code).emit('am_room_updated', sanitizeAm(room))
  })

  socket.on('am_start_game', ({ code }) => {
    const room = getAmRoom(code)
    if (!room || room.hostId !== socket.id) { socket.emit('error', 'Só o host pode iniciar'); return }
    if (room.status !== 'waiting') { socket.emit('error', 'O jogo já está a decorrer'); return }
    dropDisconnectedPlayers(room)
    const active = room.players.filter((p) => !p.disconnected).length
    const v = validateSettings(room.settings, active)
    if (!v.ok) { socket.emit('error', v.error); return }

    if (!room.matchNum) room.juizIdx = pickRandomConnectedIdx(room)

    const result = startNewMatch(room)
    if (!result.ok) { socket.emit('error', result.error); return }

    room.players.filter((p) => !p.disconnected && p.id).forEach((p) => {
      const idx = room.players.findIndex((pl) => pl.name === p.name)
      if (idx === room.juizIdx || !isPlayingRole(room.roles[idx]?.role)) return
      io.to(p.id).emit('am_your_role', {
        role: room.roles[idx].role,
        name: room.roles[idx].name,
        origIdx: idx,
      })
    })
    io.to(room.code).emit('am_game_started', sanitizeAm(room))
    broadcastPhase(io, room)
  })

  socket.on('am_reveal_ready', ({ code }) => {
    const room = getAmRoom(code)
    if (!room || room.status !== 'reveal') return
    const player = room.players.find((p) => p.id === socket.id)
    if (!player || player.disconnected) return
    const idx = room.players.findIndex((p) => p.id === socket.id)
    if (isNarratorIdx(room, idx)) return

    if (!room.revealReady.includes(player.name)) room.revealReady.push(player.name)

    const total = playingReadyTotal(room)
    io.to(room.code).emit('am_reveal_progress', {
      ready: room.revealReady.length,
      total,
    })

    if (room.revealReady.length >= total) {
      room.status = 'night'
      room.nightStep = 'sleep'
      resetNarratorNight(room)
      broadcastPhase(io, room)
    }
  })

  socket.on('am_narrator_next', ({ code }) => {
    const room = getAmRoom(code)
    if (!room || !isJuiz(room, socket.id)) return
    if (room.status !== 'night') return

    const next = nextNightStep(room.nightStep, room.settings)

    if (next === 'dawn' && room.nightStep !== 'dawn') {
      applyNightDeath(room)
      if (checkWinOrContinue(room, io)) return
    }

    if (room.nightStep === 'dawn') {
      room.dayNum = (room.dayNum || 0) + 1
      room.status = 'day'
      room.nightStep = null
      resetNarratorNight(room)
      io.to(room.code).emit('am_dawn_news', {
        killed: room.lastNight?.killed ?? null,
        killedName: room.lastNight?.killed != null ? room.roles[room.lastNight.killed]?.name : null,
        saved: room.lastNight?.saved,
        dayNum: room.dayNum,
      })
      startDayVoting(room, io)
      return
    }

    room.nightStep = next
    broadcastPhase(io, room)
  })

  socket.on('am_narrator_pick', ({ code, field, targetOrigIdx }) => {
    const room = getAmRoom(code)
    if (!room || !isJuiz(room, socket.id) || room.status !== 'night') return

    const target = Number(targetOrigIdx)
    if (!Number.isInteger(target) || room.eliminated.includes(target) || isNarratorIdx(room, target)) return
    if (!isValidNightPick(field, room.roles[target]?.role)) return

    if (!room.narratorNight) resetNarratorNight(room)
    const na = room.narratorNight

    if (field === 'wolfTarget' && room.nightStep === 'wolves') {
      na.wolfTarget = na.wolfTarget === target ? null : target
    } else if (field === 'medicTarget' && room.nightStep === 'medic') {
      na.medicTarget = na.medicTarget === target ? null : target
    } else if (field === 'sheriffTarget' && room.nightStep === 'sheriff') {
      na.sheriffTarget = target
      const isWolf = room.roles[target]?.role === 'lobo'
      socket.emit('am_narrator_intel', {
        targetOrigIdx: target,
        targetName: room.roles[target]?.name,
        isWolf,
        hint: isWolf ? '🐺 É Lobo' : '✓ Não é Lobo',
      })
    } else return

    broadcastPhase(io, room)
  })

  socket.on('am_cast_vote', ({ code, targetOrigIdx }) => {
    const room = getAmRoom(code)
    if (!room || room.status !== 'day' || room.votingClosed) return

    const player = room.players.find((p) => p.id === socket.id && !p.disconnected)
    if (!player) return

    const voterIdx = room.players.findIndex((p) => p.id === socket.id)
    if (voterIdx < 0 || isNarratorIdx(room, voterIdx)) return
    if (room.eliminated.includes(voterIdx)) {
      socket.emit('error', 'Os mortos não votam')
      return
    }

    const target = Number(targetOrigIdx)
    if (!isAlivePlayingTarget(room, target)) return
    if (target === voterIdx) {
      socket.emit('error', 'Não podes votar em ti próprio')
      return
    }

    room.dayVotes[player.name] = target

    const total = aliveVoters(room).length
    io.to(room.code).emit('am_vote_progress', {
      cast: countValidVotes(room),
      total,
    })

    room.players.filter((p) => p.id && !p.disconnected).forEach((p) => {
      io.to(p.id).emit('am_phase', sanitizeAm(room, false, p.name))
    })

    if (countValidVotes(room) >= total) {
      closeDayVoting(room, io)
    }
  })

  socket.on('am_close_voting', ({ code }) => {
    const room = getAmRoom(code)
    if (!room) { socket.emit('error', 'Sala não encontrada'); return }
    const allowed = isJuiz(room, socket.id) || room.hostId === socket.id
    if (!allowed) { socket.emit('error', 'Só o narrador pode fechar a votação'); return }
    if (room.status !== 'day') { socket.emit('error', 'A votação só fecha de dia'); return }
    closeDayVoting(room, io)
  })

  socket.on('am_skip_day', ({ code }) => {
    const room = getAmRoom(code)
    if (!room || !isJuiz(room, socket.id) || room.status !== 'day') return
    skipDayToNight(room, io)
  })

  socket.on('am_narrator_start_night', ({ code }) => {
    const room = getAmRoom(code)
    if (!room || !isJuiz(room, socket.id) || room.status !== 'day') return
    if (!room.votingClosed) {
      socket.emit('error', 'Espera que a votação termine')
      return
    }
    clearDayTimer(room)
    room.status = 'night'
    room.nightStep = 'sleep'
    room.roundNum += 1
    resetNarratorNight(room)
    broadcastPhase(io, room)
  })

  socket.on('am_play_again', ({ code }) => {
    const room = getAmRoom(code)
    if (!room) return
    if (!isJuiz(room, socket.id) && room.hostId !== socket.id) {
      socket.emit('error', 'Só o narrador ou host pode iniciar nova partida')
      return
    }
    if (room.status !== 'result') return
    dropDisconnectedPlayers(room)
    if (room.players.filter((p) => !p.disconnected).length < 4) {
      socket.emit('error', 'Precisas de pelo menos 4 jogadores')
      return
    }

    room.juizIdx = nextConnectedJuizIdx(room, room.juizIdx)

    const result = startNewMatch(room)
    if (!result.ok) { socket.emit('error', result.error); return }

    room.players.filter((p) => !p.disconnected && p.id).forEach((p) => {
      const idx = room.players.findIndex((pl) => pl.name === p.name)
      if (idx === room.juizIdx || !isPlayingRole(room.roles[idx]?.role)) return
      io.to(p.id).emit('am_your_role', {
        role: room.roles[idx].role,
        name: room.roles[idx].name,
        origIdx: idx,
      })
    })
    io.to(room.code).emit('am_game_started', sanitizeAm(room))
    broadcastPhase(io, room)
  })

  socket.on('am_end_session', ({ code }) => {
    const room = getAmRoom(code)
    if (!room) return
    if (room.hostId !== socket.id && !isJuiz(room, socket.id)) {
      socket.emit('error', 'Só o host ou narrador pode fechar a sala')
      return
    }
    clearDayTimer(room)
    io.to(room.code).emit('am_session_ended')
    delete amRooms[room.code]
  })

  socket.on('am_request_state', ({ code }) => {
    const room = getAmRoom(code)
    if (!room) return
    const player = room.players.find((p) => p.id === socket.id && !p.disconnected)
    if (!player) return
    const view = sanitizeAm(room, room.status === 'result', player.name)
    socket.emit('am_phase', view)
    if (isJuiz(room, socket.id)) {
      socket.emit('am_narrator_state', { ...view, ...sanitizeNarrator(room) })
    }
  })
}

function notifyDetachedAm(io, detached) {
  for (const room of detached) {
    promoteHostIfNeeded(room)
    io.to(room.code).emit('am_room_updated', sanitizeAm(room))
  }
}

function handleAldeiaDisconnect(io, socket) {
  const code = Object.keys(amRooms).find((c) => amRooms[c].players.some((p) => p.id === socket.id))
  if (!code) return
  const room = amRooms[code]
  const idx = room.players.findIndex((p) => p.id === socket.id)
  if (idx === -1) return

  const player = room.players[idx]
  player.disconnected = true
  player.previousSocketId = socket.id
  player.id = null

  if (room.hostId === socket.id) promoteHostIfNeeded(room)

  const connected = room.players.filter((p) => !p.disconnected)
  if (connected.length === 0) {
    clearDayTimer(room)
  }

  io.to(room.code).emit('am_room_updated', sanitizeAm(room))
  broadcastPhase(io, room)
  if (room.status === 'day' && !room.votingClosed) {
    const expected = aliveVoters(room).length
    if (expected > 0 && countValidVotes(room) >= expected) {
      closeDayVoting(room, io)
    }
  }
}

module.exports = {
  amRooms,
  registerAldeiaMixHandlers,
  handleAldeiaDisconnect,
  sanitizeAm,
  _test: {
    aliveVoters,
    countValidVotes,
    connectedDayVotes,
    isAlivePlayingTarget,
  },
}
