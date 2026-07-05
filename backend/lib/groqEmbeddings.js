const crypto = require('crypto')
const ContentEmbeddingCache = require('../models/ContentEmbeddingCache')

const fetchFn = typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : null
const GROQ_EMBED_API = 'https://api.groq.com/openai/v1/embeddings'
const EMBED_MODEL = process.env.GROQ_EMBED_MODEL || 'nomic-embed-text-v1.5'
const BATCH_SIZE = 48

function isGroqConfigured() {
  return Boolean(process.env.GROQ_API_KEY && fetchFn)
}

function textHash(text) {
  return crypto.createHash('sha256').update(String(text || ''), 'utf8').digest('hex')
}

function cosineSimilarity(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  if (!na || !nb) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

function buildEmbedText(item) {
  const parts = [item.mode, item.kind, item.deck, item.display || item.textKey].filter(Boolean)
  return parts.join(' | ').slice(0, 800)
}

function isEmbedEligible(item) {
  if (!item?.textKey || !String(item.textKey).trim()) return false
  const len = String(item.display || item.textKey).trim().length
  if (item.kind?.startsWith('drink:')) {
    const shortTypes = new Set(['beber', 'regra', 'poder', 'sorte', 'azar', 'duelo'])
    const type = item.kind.slice('drink:'.length)
    if (shortTypes.has(type) && len < 50) return false
  }
  return len >= 20
}

async function callGroqEmbeddings(inputs) {
  const key = process.env.GROQ_API_KEY
  if (!key) throw new Error('GROQ_API_KEY not configured')
  if (!fetchFn) throw new Error('Global fetch not available')

  const res = await fetchFn(GROQ_EMBED_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: EMBED_MODEL,
      input: inputs,
      encoding_format: 'float',
    }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.error?.message || data?.error || `Groq embeddings error ${res.status}`)
  }

  const rows = Array.isArray(data?.data) ? data.data.slice() : []
  rows.sort((x, y) => (x.index ?? 0) - (y.index ?? 0))
  return rows.map((row) => row.embedding)
}

async function getEmbeddingsForTexts(texts, { useCache = true } = {}) {
  const unique = [...new Set(texts.map((t) => String(t || '').trim()).filter(Boolean))]
  const result = new Map()
  const toFetch = []

  if (useCache) {
    const hashes = unique.map((t) => ({ text: t, hash: textHash(t) }))
    const cached = await ContentEmbeddingCache.find({
      textHash: { $in: hashes.map((h) => h.hash) },
    }).lean()
    const cacheMap = new Map(cached.map((c) => [c.textHash, c.embedding]))
    for (const { text, hash } of hashes) {
      if (cacheMap.has(hash)) result.set(text, cacheMap.get(hash))
      else toFetch.push(text)
    }
  } else {
    toFetch.push(...unique)
  }

  for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
    const batch = toFetch.slice(i, i + BATCH_SIZE)
    const vectors = await callGroqEmbeddings(batch)
    for (let j = 0; j < batch.length; j++) {
      const text = batch[j]
      const embedding = vectors[j]
      if (!Array.isArray(embedding)) continue
      result.set(text, embedding)
      if (useCache) {
        await ContentEmbeddingCache.findOneAndUpdate(
          { textHash: textHash(text) },
          { embedText: text, embedding, model: EMBED_MODEL },
          { upsert: true }
        )
      }
    }
  }

  return result
}

async function embedItems(items) {
  const eligible = items.filter(isEmbedEligible)
  const embedTexts = eligible.map((item) => {
    const t = buildEmbedText(item)
    item._embedText = t
    return t
  })
  const map = await getEmbeddingsForTexts(embedTexts)
  for (const item of eligible) {
    item._embedding = map.get(item._embedText)
  }
  return eligible
}

module.exports = {
  isGroqConfigured,
  cosineSimilarity,
  buildEmbedText,
  isEmbedEligible,
  getEmbeddingsForTexts,
  embedItems,
  EMBED_MODEL,
}
