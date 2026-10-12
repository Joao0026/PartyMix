const router = require('express').Router()
const Lobby = require('../models/Lobby')
const { asyncRoute, roomCode } = require('../lib/validate')

const RETIRED = { error: 'Este lobby antigo já não aceita salas novas. Cria a sala dentro do jogo.' }

function publicLobby(lobby) {
  return {
    code: lobby.code,
    host: lobby.host,
    players: lobby.players,
    status: lobby.status,
  }
}

router.post('/create', (_req, res) => {
  res.status(410).json(RETIRED)
})

router.post('/:code/join', (_req, res) => {
  res.status(410).json(RETIRED)
})

router.post('/:code/start', (_req, res) => {
  res.status(410).json(RETIRED)
})

router.get('/:code', asyncRoute(async (req, res) => {
  const lobby = await Lobby.findOne({ code: roomCode(req.params.code), status: 'waiting' })
  if (!lobby) return res.status(404).json({ error: 'Lobby não encontrado' })
  res.json(publicLobby(lobby))
}))

module.exports = router
