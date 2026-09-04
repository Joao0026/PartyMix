const express = require('express')
const router = express.Router()
const Card = require('../models/Card')
const { asyncRoute, cleanString } = require('../lib/validate')
const { buildPackFilter } = require('../lib/packQuery')
const { getLocalLegendaPacks, getLocalLegendas } = require('../lib/localMememix')
const {
  verifyUploadToken,
  saveMemeImage,
  getMemeFilePath,
  detectImageKind,
  verifyMemeView,
} = require('../lib/mememixSessions')
const {
  mmRooms,
  removeMemeFromRoom,
} = require('../lib/mememixSocket')

const MAX_BYTES = 5 * 1024 * 1024

router.use(express.json({ limit: '6mb' }))

router.get('/packs', asyncRoute(async (req, res) => {
  const rows = await Card.aggregate([
    { $match: { mode_type: 'mememix', category: 'legenda' } },
    { $group: { _id: '$pack', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ])
  const packs = new Map(getLocalLegendaPacks().map((r) => [r.pack, r]))
  for (const row of rows) {
    const pack = row._id || 'base'
    packs.set(pack, { ...(packs.get(pack) || {}), pack, count: row.count })
  }
  res.json([...packs.values()].sort((a, b) => a.pack.localeCompare(b.pack)))
}))

router.get('/legendas', asyncRoute(async (req, res) => {
  const pack = cleanString(req.query.pack, { defaultValue: 'base', max: 60 }) || 'base'
  const rows = await Card.find({
    mode_type: 'mememix',
    category: 'legenda',
    pack: buildPackFilter(pack, req.query.include_community),
  }).lean()
  const includeCommunity = req.query.include_community === true
    || req.query.include_community === 'true'
    || req.query.include_community === '1'
  const local = getLocalLegendas({ packs: [pack], includeCommunity })
  res.json([...new Set([...rows.map((r) => r.text), ...local])])
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
    const kind = detectImageKind(buffer)
    if (!kind) return res.status(400).json({ error: 'Ficheiro não é uma imagem válida' })
    ext = kind
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
  if (!verifyMemeView(code, req.params.file, req.query.exp, req.query.sig)) {
    return res.status(403).json({ error: 'Acesso negado' })
  }

  const room = mmRooms[code]
  if (!room) return res.status(404).json({ error: 'Sala não encontrada' })

  const filePath = getMemeFilePath(code, req.params.file)
  if (!filePath) return res.status(404).json({ error: 'Meme não encontrado' })
  res.setHeader('Cache-Control', 'private, max-age=60')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.sendFile(filePath)
}))

module.exports = router
