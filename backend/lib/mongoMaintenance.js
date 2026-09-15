const LOBBY_TTL_MS = 2 * 60 * 60 * 1000
const CARDROOM_TTL_MS = 24 * 60 * 60 * 1000
const EMBED_TTL_MS = 30 * 24 * 60 * 60 * 1000

function staleLobbyFilter(now = Date.now()) {
  return { createdAt: { $lt: new Date(now - LOBBY_TTL_MS) } }
}

function staleCardRoomFilter(now = Date.now()) {
  return { createdAt: { $lt: new Date(now - CARDROOM_TTL_MS) } }
}

function staleEmbeddingFilter(now = Date.now()) {
  return { updatedAt: { $lt: new Date(now - EMBED_TTL_MS) } }
}

async function ensureIndexes() {
  const Lobby = require('../models/Lobby')
  const CardRoom = require('../models/CardRoom')
  const CommunitySubmission = require('../models/CommunitySubmission')
  const ContentEmbeddingCache = require('../models/ContentEmbeddingCache')
  await Promise.all([
    Lobby.syncIndexes(),
    CardRoom.syncIndexes(),
    CommunitySubmission.syncIndexes(),
    ContentEmbeddingCache.syncIndexes(),
  ])
}

async function purgeExpiredGameDocs(now = Date.now()) {
  const Lobby = require('../models/Lobby')
  const CardRoom = require('../models/CardRoom')
  const ContentEmbeddingCache = require('../models/ContentEmbeddingCache')
  const [lobby, cardroom, embeds] = await Promise.all([
    Lobby.deleteMany(staleLobbyFilter(now)),
    CardRoom.deleteMany(staleCardRoomFilter(now)),
    ContentEmbeddingCache.deleteMany(staleEmbeddingFilter(now)),
  ])
  return {
    lobby: lobby.deletedCount || 0,
    cardroom: cardroom.deletedCount || 0,
    embeds: embeds.deletedCount || 0,
  }
}

module.exports = {
  LOBBY_TTL_MS,
  CARDROOM_TTL_MS,
  EMBED_TTL_MS,
  staleLobbyFilter,
  staleCardRoomFilter,
  staleEmbeddingFilter,
  ensureIndexes,
  purgeExpiredGameDocs,
}
