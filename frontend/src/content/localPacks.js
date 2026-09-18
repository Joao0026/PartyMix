import friendsBase from '../../../data/friends/base.json'
import friendsFesta from '../../../data/friends/festa.json'
import friendsCommunity from '../../../data/friends/community.json'
import familyBase from '../../../data/family/base.json'
import familyFesta from '../../../data/family/festa.json'
import familyCommunity from '../../../data/family/community.json'
import coupleBase from '../../../data/couple/base.json'
import coupleFesta from '../../../data/couple/festa.json'
import coupleCommunity from '../../../data/couple/community.json'
import drinkDecks from '../../../data/drink/decks.json'
import drinkNoiteAcademica from '../../../data/drink/noite-academica-pack.json'
import drinkSemFiltros from '../../../data/drink/sem-filtros-pack.json'
import drinkCasaisFesta from '../../../data/drink/casais-festa-pack.json'
import drinkCommunity from '../../../data/drink/communitydrink.json'

const DRINK_PACK_DOCS = [drinkDecks, drinkNoiteAcademica, drinkSemFiltros, drinkCasaisFesta, drinkCommunity]

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
  impostor: 'impostor',
}

const CHALLENGE_PACKS = {
  friends: { base: friendsBase, festa: friendsFesta, community: friendsCommunity },
  family: { base: familyBase, festa: familyFesta, community: familyCommunity },
  couple: { base: coupleBase, festa: coupleFesta, community: coupleCommunity },
}

const DRINK_PACKS = DRINK_PACK_DOCS

function clean(value, max = 300) {
  return String(value ?? '').replace(/<[^>]*>/g, '').trim().slice(0, max)
}

function defaultTimeLimit(type) {
  if (type === 'desenho') return 60
  if (type === 'mimica') return 45
  if (type === 'telepatia') return 10
  return 0
}

function normalizeChallengeEntry(entry, mode, type, packName) {
  const raw = typeof entry === 'string' ? { text: entry } : entry
  const mappedType = CATEGORY_MAP[type] || type
  const category = mappedType === 'impostor' || raw.type === 'impostor' || raw.category === 'impostor'
    ? 'impostor'
    : CATEGORY_MAP[type] || CATEGORY_MAP[raw.category] || raw.category || 'acao'

  if (category === 'impostor') {
    const correctQuestion = clean(raw.correctQuestion || raw.correct_question || raw.text, 300)
    const wrongQuestion = clean(raw.wrongQuestion || raw.wrong_question, 300)
    return {
      text: correctQuestion,
      category: 'impostor',
      correct_question: correctQuestion,
      wrong_question: wrongQuestion,
      mode_type: mode === 'drink' ? 'friends' : mode,
      difficulty: raw.difficulty || 'medio',
      answer: '',
      choices: [],
      forbiddenWords: [],
      sips_penalty: Number.isFinite(Number(raw.sips_penalty)) ? Number(raw.sips_penalty) : 3,
      time_limit: 0,
      is_ongoing: false,
      ongoing_rounds: 0,
      ongoing_instruction: '',
      pack: clean(raw.pack || packName, 60),
    }
  }

  return {
    text: clean(raw.text),
    category,
    mode_type: mode === 'drink' ? 'friends' : mode,
    difficulty: raw.difficulty || 'medio',
    answer: clean(raw.answer, 200),
    choices: (Array.isArray(raw.choices) ? raw.choices : []).map((c) => clean(c, 120)).filter(Boolean).slice(0, 4),
    forbiddenWords: (Array.isArray(raw.forbiddenWords) ? raw.forbiddenWords : []).map((w) => clean(w, 40)).filter(Boolean).slice(0, 5),
    sips_penalty: Number.isFinite(Number(raw.sips_penalty)) ? Number(raw.sips_penalty) : (mode === 'friends' || mode === 'drink' ? 2 : 0),
    time_limit: Number.isFinite(Number(raw.time_limit)) ? Number(raw.time_limit) : defaultTimeLimit(type),
    is_ongoing: Boolean(raw.is_ongoing),
    ongoing_rounds: Number.isFinite(Number(raw.ongoing_rounds)) ? Number(raw.ongoing_rounds) : 0,
    ongoing_instruction: clean(raw.ongoing_instruction, 300),
    pack: clean(raw.pack || packName, 60),
  }
}

function collectChallengesFromPack(pack) {
  const out = []
  const packName = clean(pack.pack || pack.name || pack.id || 'base', 60)
  const mode = pack.mode || 'friends'
  const content = pack.categories || pack.items || pack.challengesByType || {}
  for (const [type, entries] of Object.entries(content)) {
    for (const entry of Array.isArray(entries) ? entries : []) {
      const doc = normalizeChallengeEntry(entry, mode, type, packName)
      if (doc.category === 'impostor' ? doc.correct_question && doc.wrong_question : doc.text) {
        out.push(doc)
      }
    }
  }
  return out
}

function resolvePackNames(pack, includeCommunity) {
  const base = clean(pack, 60) || 'base'
  if (includeCommunity) return [...new Set([base, 'community'])]
  return [base]
}

let challengeCache = null

function allLocalChallenges() {
  if (challengeCache) return challengeCache
  const rows = []
  for (const [mode, packs] of Object.entries(CHALLENGE_PACKS)) {
    for (const [packKey, json] of Object.entries(packs)) {
      for (const c of collectChallengesFromPack({ ...json, mode, pack: packKey })) {
        rows.push(c)
      }
    }
  }
  challengeCache = rows
  return rows
}

export function getLocalChallenges({ category, mode_type, pack, include_community, difficulty } = {}) {
  const packs = resolvePackNames(pack, include_community === true || include_community === 'true' || include_community === '1')
  const familyOnly = mode_type === 'family'
  const modes = familyOnly ? ['family'] : (mode_type ? [mode_type, 'all'] : ['friends', 'family', 'couple', 'all'])
  const adultCats = new Set(['erotico', 'picante', 'roleplay', 'casal_pergunta', 'caos'])

  return allLocalChallenges().filter((row) => {
    if (category && row.category !== category) return false
    if (mode_type && !modes.includes(row.mode_type)) return false
    if (familyOnly && (row.audience === 'adult' || adultCats.has(row.category))) return false
    if (pack && !packs.includes(row.pack)) return false
    if (difficulty && row.difficulty !== difficulty) return false
    return true
  })
}

export function pickLocalRandomChallenge(params = {}) {
  const pool = getLocalChallenges(params)
  if (!pool.length) return null
  return pool[Math.floor(Math.random() * pool.length)]
}

export function getLocalImpostorChallenges(params = {}) {
  return getLocalChallenges({
    category: 'impostor',
    mode_type: 'friends',
    ...params,
  })
}

export function getLocalDrinkDecks(pack = 'base') {
  const packId = clean(pack, 60) || 'base'
  const doc = DRINK_PACK_DOCS.find((entry) => entry.pack === packId)
  if (!doc) return null
  const categories = Object.entries(doc.decks || {}).map(([id, deck]) => ({
    id,
    label: deck.label || id,
    desc: deck.desc || '',
    premium: false,
    cards: Array.isArray(deck.cards) ? deck.cards : [],
  }))
  return {
    pack: doc.pack || packId,
    name: doc.name || 'Beber',
    description: doc.description || '',
    premium: false,
    intensity: doc.intensity || 'moderada',
    ageRating: doc.ageRating || '18+',
    categories,
  }
}

export function getLocalDrinkPacks() {
  return DRINK_PACKS.map((pack) => ({
    pack: pack.pack,
    name: pack.name || pack.pack,
    description: pack.description || '',
    premium: false,
    intensity: pack.intensity || 'moderada',
    ageRating: pack.ageRating || '18+',
    teaser: pack.teaser || '',
  }))
}
