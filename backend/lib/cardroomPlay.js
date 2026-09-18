const { tokensEqual } = require('./gameAuth')
const { cardroomPointsForResult } = require('./contentSafety')

function cardroomResultLock(room, player) {
  const lock = {
    status: 'playing',
    currentPlayer: player.id,
    currentRound: room.currentRound,
    history: { $not: { $elemMatch: { round: room.currentRound, player: player.id } } },
  }
  if (room._id) lock._id = room._id
  else if (room.code) lock.code = room.code
  return lock
}

function cardroomStartFilter(id) {
  return { _id: id, status: 'waiting' }
}

function lobbyStartFilter(id) {
  return { _id: id, status: 'waiting' }
}

function applyCardRoomResult(room, { playerToken, result, cardId }) {
  if (!room) return { ok: false, status: 404, error: 'Room not found' }
  if (room.status !== 'playing') return { ok: false, status: 400, error: 'Game not in progress' }

  const player = (room.players || []).find((p) => tokensEqual(p.token, playerToken))
  if (!player) return { ok: false, status: 403, error: 'Jogador inválido' }
  if (player.id !== room.currentPlayer) {
    return { ok: false, status: 400, error: 'Não é a tua vez' }
  }
  if ((room.history || []).some((row) => row.round === room.currentRound && row.player === player.id)) {
    return { ok: false, status: 400, error: 'Esta ronda já foi registada' }
  }

  const lock = cardroomResultLock(room, player)
  const pointsEarned = cardroomPointsForResult(result)
  player.points = Math.max(0, (player.points || 0) + (pointsEarned || 0))
  room.history = room.history || []
  room.history.push({
    round: room.currentRound,
    player: player.id,
    cardId,
    result,
    pointsEarned,
  })

  if (player.points >= room.maxPoints) {
    room.status = 'finished'
    room.gameData = { winner: player.id, winnerName: player.name }
  } else {
    const currentIdx = room.players.findIndex((p) => p.id === player.id)
    const nextIdx = (currentIdx + 1) % room.players.length
    room.currentPlayer = room.players[nextIdx].id
    room.currentRound += 1
  }

  return { ok: true, room, lock }
}

function lobbyJoinFilter(code, name, maxPlayers = 15) {
  return {
    code,
    status: 'waiting',
    'players.name': { $ne: name },
    $expr: { $lt: [{ $size: '$players' }, maxPlayers] },
  }
}

function cardroomJoinFilter(code, playerName) {
  return {
    code,
    status: 'waiting',
    'players.name': { $ne: playerName },
    $expr: { $lt: [{ $size: '$players' }, '$maxPlayers'] },
  }
}

function publicLobby(lobby) {
  return {
    code: lobby.code,
    host: lobby.host,
    status: lobby.status,
    players: (lobby.players || []).map((p) => ({
      name: p.name,
      joinedAt: p.joinedAt,
    })),
  }
}

module.exports = {
  applyCardRoomResult,
  cardroomResultLock,
  cardroomStartFilter,
  lobbyStartFilter,
  lobbyJoinFilter,
  cardroomJoinFilter,
  publicLobby,
}
