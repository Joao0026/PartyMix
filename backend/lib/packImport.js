const Card = require('../models/Card')
const Challenge = require('../models/Challenge')

const CHALLENGE_MODES = new Set(['family', 'friends', 'couple', 'drink'])
const CARD_MODES = new Set(['cards'])
const DEFAULT_CARD_CATEGORY = 'geral'

const CATEGORY_MAP = {
  telepatia: 'telepatia',
  perguntas: 'perguntas',
  desenho: 'desenho',
  mimica: 'mimica',
  proibido: 'proibido',
  caos: 'caos',
  beber: 'acao',
  regra: 'consequencia',
  desafio: 'acao',
  duelo: 'acao',
  poder: 'acao',
  sorte: 'consequencia',
  romantico: 'romantico',
  picante: 'picante',
  verdade: 'verdade',
  acao: 'acao',
  roleplay: 'roleplay',
  quiz: 'casal_pergunta',
}

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function clean(value, max = 300) {
  return String(value ?? '').replace(/<[^>]*>/g, '').trim().slice(0, max)
}

function cleanAudience(value) {
  const audience = clean(value, 20)
  return ['family', 'adult', 'all', ''].includes(audience) ? audience : ''
}

function normalizeChallengeMode(mode) {
  return mode === 'drink' ? 'friends' : mode
}

function normalizeCardEntry(entry, isBlack, packName) {
  if (typeof entry === 'string') {
    return {
      text: clean(entry),
      category: DEFAULT_CARD_CATEGORY,
      is_black: isBlack,
      mode_type: 'cards',
      pack: packName,
    }
  }

  return {
    text: clean(entry.text),
    category: clean(entry.category, 40) || DEFAULT_CARD_CATEGORY,
    is_black: entry.is_black ?? entry.isBlack ?? isBlack,
    mode_type: 'cards',
    pack: clean(entry.pack || packName, 60),
    audience: cleanAudience(entry.audience),
  }
}

function normalizeChallengeEntry(entry, mode, type, packName) {
  const raw = typeof entry === 'string' ? { text: entry } : entry
  const category = CATEGORY_MAP[type] || CATEGORY_MAP[raw.category] || raw.category || 'acao'

  return {
    text: clean(raw.text),
    category,
    mode_type: normalizeChallengeMode(mode),
    difficulty: raw.difficulty || 'medio',
    answer: clean(raw.answer, 200),
    choices: asArray(raw.choices).map((choice) => clean(choice, 120)).filter(Boolean).slice(0, 4),
    forbiddenWords: asArray(raw.forbiddenWords).map((w) => clean(w, 40)).filter(Boolean).slice(0, 5),
    sips_penalty: Number.isFinite(Number(raw.sips_penalty)) ? Number(raw.sips_penalty) : mode === 'friends' || mode === 'drink' ? 2 : 0,
    time_limit: Number.isFinite(Number(raw.time_limit)) ? Number(raw.time_limit) : defaultTimeLimit(type),
    is_ongoing: Boolean(raw.is_ongoing),
    ongoing_rounds: Number.isFinite(Number(raw.ongoing_rounds)) ? Number(raw.ongoing_rounds) : 0,
    ongoing_instruction: clean(raw.ongoing_instruction, 300),
    pack: clean(raw.pack || packName, 60),
    audience: cleanAudience(raw.audience),
  }
}

function defaultTimeLimit(type) {
  if (type === 'desenho') return 60
  if (type === 'mimica') return 45
  if (type === 'telepatia') return 10
  return 0
}

async function insertUnique(Model, doc, counters) {
  if (!doc.text) {
    counters.invalid += 1
    return
  }

  const exists = await Model.findOne({ text: doc.text })
  if (exists) {
    counters.skipped += 1
    return
  }

  await new Model(doc).save()
  counters.inserted += 1
}

function collectCards(pack) {
  const out = []
  const packName = clean(pack.pack || pack.name || pack.id || 'base', 60)
  const cards = pack.mode === 'cards'
    ? { white: pack.white || pack.cards?.white, black: pack.black || pack.cards?.black }
    : pack.cards || pack.modes?.cards || {}
  for (const entry of asArray(cards.white)) out.push(normalizeCardEntry(entry, false, packName))
  for (const entry of asArray(cards.black)) out.push(normalizeCardEntry(entry, true, packName))
  return out
}

function collectChallenges(pack) {
  const out = []
  const packName = clean(pack.pack || pack.name || pack.id || 'base', 60)

  if (CHALLENGE_MODES.has(pack.mode)) {
    const content = pack.categories || pack.items || pack.challengesByType || {}
    for (const [type, entries] of Object.entries(content)) {
      for (const entry of asArray(entries)) out.push(normalizeChallengeEntry(entry, pack.mode, type, packName))
    }
  }

  for (const [mode, content] of Object.entries(pack.modes || {})) {
    if (!CHALLENGE_MODES.has(mode) || CARD_MODES.has(mode)) continue
    for (const [type, entries] of Object.entries(content || {})) {
      for (const entry of asArray(entries)) out.push(normalizeChallengeEntry(entry, mode, type, packName))
    }
  }

  for (const entry of asArray(pack.challenges)) {
    const mode = entry.mode || pack.mode || 'friends'
    const type = entry.type || entry.cardType || entry.category || 'desafio'
    out.push(normalizeChallengeEntry(entry, mode, type, packName))
  }

  return out
}

async function importPackObject(pack) {
  const cards = collectCards(pack)
  const challenges = collectChallenges(pack)
  const cardCounters = { inserted: 0, skipped: 0, invalid: 0 }
  const challengeCounters = { inserted: 0, skipped: 0, invalid: 0 }

  for (const card of cards) await insertUnique(Card, card, cardCounters)
  for (const challenge of challenges) await insertUnique(Challenge, challenge, challengeCounters)

  return {
    pack: clean(pack.name || pack.pack || pack.id || 'Pack', 80),
    cards: cardCounters,
    challenges: challengeCounters,
  }
}

module.exports = {
  collectCards,
  collectChallenges,
  importPackObject,
}
