const themeDoc = require('../../data/mister/pares.json')

const THEME_LABELS = {
  comida: '🍕 Comida',
  animais: '🐾 Animais',
  casa: '🏠 Casa',
  objetos: '📦 Objetos',
  profissoes: '💼 Profissões',
  desporto: '⚽ Desporto',
  transportes: '🚌 Transportes',
  entretenimento: '🎬 Entretenimento',
}

function cleanWord(value) {
  return String(value || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 40)
}

function sanitizeMisterPair(raw, extra = {}) {
  const civil = cleanWord(raw?.civil)
  const undercover = cleanWord(raw?.undercover)
  if (!civil || !undercover) return null
  if (civil.normalize('NFKC').toLowerCase() === undercover.normalize('NFKC').toLowerCase()) return null
  const difficulty = ['facil', 'normal', 'dificil'].includes(raw?.difficulty) ? raw.difficulty : 'normal'
  return { civil, undercover, difficulty, ...extra }
}

function pairKey(pair) {
  return `${pair.civil.normalize('NFKC').toLowerCase()}|${pair.undercover.normalize('NFKC').toLowerCase()}`
}

function dedupePairs(list) {
  const seen = new Set()
  const out = []
  for (const raw of list || []) {
    const pair = raw?.civil ? raw : null
    if (!pair) continue
    const key = pairKey(pair)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(pair)
  }
  return out
}

function sanitizeCustomPairs(list) {
  return dedupePairs((Array.isArray(list) ? list : []).map((row) => sanitizeMisterPair(row, { custom: true }))).slice(0, 30)
}

function themePacksFromDoc(doc = themeDoc) {
  const out = {}
  for (const [id, pack] of Object.entries(doc.packs || {})) {
    out[id] = {
      label: THEME_LABELS[id] || pack.label || id,
      pairs: dedupePairs((pack.pairs || []).map((row) => sanitizeMisterPair(row))),
    }
  }
  return out
}

const PACK_IDS = [
  'geral', 'comida', 'animais', 'casa', 'objetos', 'profissoes', 'desporto',
  'transportes', 'entretenimento', 'portugal', 'marcas', 'filmes', 'escola', 'sala', 'comunidade',
]
const DIFFICULTY_IDS = ['facil', 'normal', 'dificil']

function sanitizeWordPacks(list, fallback = ['geral']) {
  const allowed = new Set(PACK_IDS)
  const out = PACK_IDS.filter((id) => (Array.isArray(list) ? list : []).includes(id) && allowed.has(id))
  return out.length ? out : fallback
}

function sanitizeDifficulties(list, fallback = DIFFICULTY_IDS) {
  const allowed = new Set(DIFFICULTY_IDS)
  const out = DIFFICULTY_IDS.filter((id) => (Array.isArray(list) ? list : []).includes(id) && allowed.has(id))
  return out.length ? out : fallback
}

function normalizeMatchSettings(settings = {}) {
  const wordPacks = Array.isArray(settings.wordPacks)
    ? sanitizeWordPacks(settings.wordPacks, [])
    : sanitizeWordPacks(settings.wordPack ? [settings.wordPack] : ['geral'])
  const difficulties = Array.isArray(settings.difficulties)
    ? sanitizeDifficulties(settings.difficulties, [])
    : sanitizeDifficulties(settings.difficulty ? [settings.difficulty] : DIFFICULTY_IDS)
  return {
    wordPacks: wordPacks.length ? wordPacks : ['geral'],
    difficulties: difficulties.length ? difficulties : DIFFICULTY_IDS,
    customPairs: sanitizeCustomPairs(settings.customPairs),
  }
}

module.exports = {
  THEME_LABELS,
  PACK_IDS,
  DIFFICULTY_IDS,
  cleanWord,
  sanitizeMisterPair,
  sanitizeCustomPairs,
  sanitizeWordPacks,
  sanitizeDifficulties,
  normalizeMatchSettings,
  dedupePairs,
  themePacksFromDoc,
  themePacks: themePacksFromDoc(),
}
