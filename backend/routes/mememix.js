const express = require('express')
const router = express.Router()
const Card = require('../models/Card')
const { asyncRoute, cleanString } = require('../lib/validate')
const { buildPackFilter } = require('../lib/packQuery')
const {
  verifyUploadToken,
  saveMemeImage,
  getMemeFilePath,
} = require('../lib/mememixSessions')
const { mmRooms, removeMemeFromRoom } = require('../lib/mememixSocket')

const MAX_BYTES = 5 * 1024 * 1024

router.use(express.json({ limit: '6mb' }))

router.get('/legendas', asyncRoute(async (req, res) => {
  const pack = cleanString(req.query.pack, { defaultValue: 'base', max: 60 }) || 'base'
  const rows = await Card.find({
    mode_type: 'mememix',
    category: 'legenda',
    pack: buildPackFilter(pack, req.query.include_community),
  }).lean()
  res.json(rows.map((r) => r.text))
}))

router.post('/rooms/:code/upload', asyncRoute(async (req, res) => {
  const code = String(req.params.code || '').toUpperCase()
  const token = req.headers['x-mememix-token'] || req.body?.token
  const auth = verifyUploadToken(token, code)
  if (!auth) return res.status(403).json({ error: 'Sessão inválida ou expirada' })

  const room = mmRooms[code]
  if (!room) return res.status(404).json({ error: 'Sala não encontrada' })
  if (room.status !== 'waiting' || room.uploadsLocked) {
    return res.status(400).json({ error: 'Uploads fechados — jogo já começou' })
  }
  if (room.settings.uploads === 'host' && room.host !== auth.playerName) {
    return res.status(403).json({ error: 'Só o host pode enviar fotos nesta sala' })
  }

  const player = room.players.find((p) => p.id === auth.socketId || p.name === auth.playerName)
  if (!player || player.disconnected) return res.status(403).json({ error: 'Não estás nesta sala' })

  const mine = room.memes.filter((m) => m.uploadedBy === player.name || m.playerId === auth.socketId).length
  if (mine >= room.settings.maxMemesPerPlayer) {
    return res.status(400).json({ error: `Máximo ${room.settings.maxMemesPerPlayer} fotos por jogador` })
  }

  let buffer
  let ext = '.webp'
  if (req.body?.imageBase64) {
    const raw = String(req.body.imageBase64)
    const match = raw.match(/^data:(image\/\w+);base64,(.+)$/)
    const b64 = match ? match[2] : raw
    const mime = match ? match[1] : 'image/jpeg'
    buffer = Buffer.from(b64, 'base64')
    if (mime.includes('png')) ext = '.png'
    else if (mime.includes('jpeg') || mime.includes('jpg')) ext = '.jpg'
  } else {
    return res.status(400).json({ error: 'Envia imageBase64 no body' })
  }

  if (!buffer?.length || buffer.length > MAX_BYTES) {
    return res.status(400).json({ error: 'Imagem demasiado grande (máx. 5 MB)' })
  }

  const saved = saveMemeImage(code, buffer, ext)
  res.status(201).json({
    id: saved.id,
    url: saved.url,
    filename: saved.filename,
  })
}))

async function handleMemeRemove(req, res) {
  const code = String(req.params.code || '').toUpperCase()
  const token = req.headers['x-mememix-token'] || req.query?.token || req.body?.token
  const auth = verifyUploadToken(token, code)
  if (!auth) return res.status(403).json({ error: 'Sessão inválida ou expirada' })

  const result = removeMemeFromRoom(code, req.params.memeId, {
    playerName: auth.playerName,
    socketId: auth.socketId,
  })
  if (!result.ok) return res.status(400).json({ error: result.error })
  res.json({ ok: true, room: result.room })
}

router.delete('/rooms/:code/memes/:memeId', asyncRoute(handleMemeRemove))
router.post('/rooms/:code/memes/:memeId/remove', asyncRoute(handleMemeRemove))

router.get('/rooms/:code/memes/:file', asyncRoute(async (req, res) => {
  const code = String(req.params.code || '').toUpperCase()
  const token = req.query.token
  const auth = verifyUploadToken(token, code)
  if (!auth && !mmRooms[code]) return res.status(403).json({ error: 'Acesso negado' })

  const filePath = getMemeFilePath(code, req.params.file)
  if (!filePath) return res.status(404).json({ error: 'Meme não encontrado' })
  res.sendFile(filePath)
}))

module.exports = router
