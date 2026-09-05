import { shuffle } from './game'
import themeDoc from '../../../data/mister/pares.json'

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

export const WORD_PACK_ORDER = [
  'geral', 'comida', 'animais', 'casa', 'objetos', 'profissoes', 'desporto',
  'transportes', 'entretenimento', 'portugal', 'marcas', 'filmes', 'escola', 'sala', 'comunidade',
]

function cleanWord(value) {
  return String(value || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 40)
}

export function sanitizeMisterPair(raw, extra = {}) {
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
  for (const pair of list || []) {
    if (!pair?.civil) continue
    const key = pairKey(pair)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(pair)
  }
  return out
}

export function sanitizeCustomPairs(list) {
  return dedupePairs((Array.isArray(list) ? list : []).map((row) => sanitizeMisterPair(row, { custom: true }))).slice(0, 30)
}

function themePacksFromDoc(doc) {
  const out = {}
  for (const [id, pack] of Object.entries(doc.packs || {})) {
    out[id] = {
      label: THEME_LABELS[id] || pack.label || id,
      pairs: dedupePairs((pack.pairs || []).map((row) => sanitizeMisterPair(row))),
    }
  }
  return out
}

const themePacks = themePacksFromDoc(themeDoc)

export const WORD_PAIRS = [
  ['Futebol', 'Rugby'], ['Pizza', 'Focaccia'], ['Gato', 'Leopardo'], ['Praia', 'Piscina'],
  ['Café', 'Chá'], ['Carro', 'Mota'], ['Sol', 'Lâmpada'], ['Médico', 'Enfermeiro'],
  ['Leão', 'Tigre'], ['Cinema', 'Teatro'], ['Guitarra', 'Violino'], ['Crocodilo', 'Lagarto'],
  ['Avião', 'Helicóptero'], ['Coca-Cola', 'Pepsi'], ["McDonald's", 'Burger King'],
  ['Instagram', 'TikTok'], ['Neve', 'Granizo'], ['Castelo', 'Palácio'], ['Tubarão', 'Baleia'],
  ['Computador', 'Tablet'], ['Vinho', 'Cerveja'], ['Montanha', 'Colina'], ['Janela', 'Porta'],
]

export const WORD_PACKS = {
  geral: {
    label: '🌍 Geral',
    pairs: WORD_PAIRS.map(([civil, undercover]) => ({ civil, undercover, difficulty: 'normal' })),
  },
  comida: {
    label: '🍕 Comida',
    pairs: dedupePairs([
      { civil: 'Pizza', undercover: 'Focaccia', difficulty: 'facil' },
      { civil: 'Café', undercover: 'Chá', difficulty: 'facil' },
      { civil: 'Chocolate', undercover: 'Caramelo', difficulty: 'normal' },
      { civil: 'Bacalhau', undercover: 'Polvo', difficulty: 'dificil' },
      ...(themePacks.comida?.pairs || []),
    ]),
  },
  animais: themePacks.animais || { label: THEME_LABELS.animais, pairs: [] },
  casa: themePacks.casa || { label: THEME_LABELS.casa, pairs: [] },
  objetos: themePacks.objetos || { label: THEME_LABELS.objetos, pairs: [] },
  profissoes: themePacks.profissoes || { label: THEME_LABELS.profissoes, pairs: [] },
  desporto: themePacks.desporto || { label: THEME_LABELS.desporto, pairs: [] },
  transportes: themePacks.transportes || { label: THEME_LABELS.transportes, pairs: [] },
  entretenimento: themePacks.entretenimento || { label: THEME_LABELS.entretenimento, pairs: [] },
  portugal: {
    label: '🇵🇹 Portugal',
    pairs: [
      { civil: 'Benfica', undercover: 'Sporting', difficulty: 'facil' },
      { civil: 'Lisboa', undercover: 'Porto', difficulty: 'facil' },
      { civil: 'Pastel de nata', undercover: 'Queijada', difficulty: 'normal' },
      { civil: 'Fado', undercover: 'Cante alentejano', difficulty: 'dificil' },
    ],
  },
  marcas: {
    label: '🏷️ Marcas',
    pairs: [
      { civil: 'Coca-Cola', undercover: 'Pepsi', difficulty: 'facil' },
      { civil: "McDonald's", undercover: 'Burger King', difficulty: 'facil' },
      { civil: 'Instagram', undercover: 'TikTok', difficulty: 'normal' },
      { civil: 'Netflix', undercover: 'HBO', difficulty: 'normal' },
    ],
  },
  filmes: {
    label: '🎬 Filmes',
    pairs: [
      { civil: 'Cinema', undercover: 'Teatro', difficulty: 'facil' },
      { civil: 'Harry Potter', undercover: 'Senhor dos Anéis', difficulty: 'normal' },
      { civil: 'Batman', undercover: 'Superman', difficulty: 'normal' },
      { civil: 'Terror', undercover: 'Suspense', difficulty: 'dificil' },
    ],
  },
  escola: {
    label: '🎒 Escola',
    pairs: [
      { civil: 'Professor', undercover: 'Aluno', difficulty: 'facil' },
      { civil: 'Teste', undercover: 'Exame', difficulty: 'normal' },
      { civil: 'Recreio', undercover: 'Intervalo', difficulty: 'normal' },
      { civil: 'Caderno', undercover: 'Manual', difficulty: 'dificil' },
    ],
  },
  sala: {
    label: 'Da sala',
    pairs: [],
  },
  comunidade: {
    label: '🌍 Comunidade',
    pairs: [],
  },
}

export const MW_COLORS = [
  'from-pink-400 to-rose-500', 'from-cyan-400 to-blue-500', 'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500', 'from-violet-400 to-purple-500', 'from-fuchsia-400 to-pink-500',
  'from-lime-400 to-green-500', 'from-sky-400 to-indigo-500', 'from-red-400 to-rose-600',
  'from-teal-400 to-cyan-500', 'from-orange-400 to-amber-500', 'from-indigo-400 to-violet-500',
]

/**
 * Ajusta Mister Whites/Infiltrados, reservando sempre pelo menos 2 civis.
 * Se o limite já estiver cheio, aumentar um papel troca uma vaga do outro.
 */
export function adjustSpecialRoleCounts(counts, role, delta, playerCount) {
  const current = {
    numMW: Math.max(0, Number(counts?.numMW) || 0),
    numUndercover: Math.max(0, Number(counts?.numUndercover) || 0),
  }
  const maxSpecial = Math.max(0, Number(playerCount) - 2)
  const key = role === 'mw' ? 'numMW' : 'numUndercover'
  const otherKey = key === 'numMW' ? 'numUndercover' : 'numMW'
  const total = current.numMW + current.numUndercover

  if (delta < 0) {
    if (current[key] <= 0 || total <= 1) return current
    return { ...current, [key]: current[key] - 1 }
  }

  if (maxSpecial <= 0) return current
  if (total < maxSpecial) return { ...current, [key]: current[key] + 1 }
  if (current[otherKey] > 0) {
    return {
      ...current,
      [key]: current[key] + 1,
      [otherKey]: current[otherKey] - 1,
    }
  }
  return current
}

/** Junta pares da comunidade e da sala aos packs oficiais. */
export function mergeCommunityPairs(packs, communityPairs, customPairs = []) {
  const community = Array.isArray(communityPairs) ? communityPairs : []
  const custom = sanitizeCustomPairs(customPairs)
  const merged = {
    ...packs,
    comunidade: { ...packs.comunidade, pairs: community },
    sala: { ...packs.sala, label: packs.sala?.label || 'Da sala', pairs: custom },
  }
  for (const key of Object.keys(merged)) {
    if (key === 'comunidade' || key === 'sala') continue
    const base = packs[key]?.pairs || []
    merged[key] = { ...merged[key], pairs: [...base, ...community, ...custom] }
  }
  return merged
}

export const DIFFICULTY_IDS = ['facil', 'normal', 'dificil']
export const DIFFICULTY_LABELS = { facil: 'Fácil', normal: 'Normal', dificil: 'Difícil' }
export const DISCUSSION_SECONDS = [60, 90, 120]

export function sanitizeWordPacks(list, fallback = ['geral']) {
  const allowed = new Set(WORD_PACK_ORDER)
  const out = WORD_PACK_ORDER.filter((id) => (Array.isArray(list) ? list : []).includes(id) && allowed.has(id))
  return out.length ? out : fallback
}

export function sanitizeDifficulties(list, fallback = DIFFICULTY_IDS) {
  const allowed = new Set(DIFFICULTY_IDS)
  const out = DIFFICULTY_IDS.filter((id) => (Array.isArray(list) ? list : []).includes(id) && allowed.has(id))
  return out.length ? out : fallback
}

export function toggleOrdered(list, id, ordered) {
  const has = list.includes(id)
  const next = has ? list.filter((x) => x !== id) : [...list, id]
  return ordered.filter((x) => next.includes(x))
}

export function normalizeMatchSettings(settings = {}) {
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
    discussionSeconds: DISCUSSION_SECONDS.includes(Number(settings.discussionSeconds))
      ? Number(settings.discussionSeconds)
      : 90,
  }
}

function pairMatchesDifficulties(pair, difficulties) {
  if (pair?.custom) return true
  if (!difficulties?.length || difficulties.length >= DIFFICULTY_IDS.length) return true
  return difficulties.includes(pair?.difficulty || 'normal')
}

export function collectPairPool(packs, settings = {}, communityPairs = []) {
  const { wordPacks, difficulties, customPairs } = normalizeMatchSettings({
    ...settings,
    customPairs: settings.customPairs ?? packs?.sala?.pairs,
  })
  const community = Array.isArray(communityPairs) && communityPairs.length
    ? communityPairs
    : (packs?.comunidade?.pairs || [])
  const raw = []
  for (const id of wordPacks) {
    if (id === 'sala') raw.push(...customPairs)
    else if (id === 'comunidade') raw.push(...community)
    else raw.push(...(packs[id]?.pairs || []))
  }
  if (customPairs.length && !wordPacks.includes('sala')) raw.push(...customPairs)
  const unique = dedupePairs(raw)
  const filtered = unique.filter((p) => pairMatchesDifficulties(p, difficulties))
  return filtered.length ? filtered : unique
}

export function pickWordPair(settingsOrPack, difficulty, packs = WORD_PACKS, communityPairs = []) {
  const settings = typeof settingsOrPack === 'string'
    ? { wordPack: settingsOrPack, difficulty, customPairs: packs?.sala?.pairs }
    : (settingsOrPack || {})
  const pool = collectPairPool(packs, settings, communityPairs)
  if (!pool.length) return { civil: 'Pizza', undercover: 'Focaccia', difficulty: 'facil' }
  return pool[Math.floor(Math.random() * pool.length)]
}

export function assignRoles(playerNames, settings = {}, packs = WORD_PACKS, communityPairs = []) {
  const valid = playerNames.filter((n) => n.trim())
  const { numMW = 0, numUndercover = 1 } = settings
  const pair = pickWordPair(settings, settings.difficulty, packs, communityPairs)
  const indices = Array.from({ length: valid.length }, (_, i) => i)
  const shuffledIdxs = shuffle([...indices])
  const roleMap = {}
  shuffledIdxs.slice(0, numMW).forEach((i) => { roleMap[i] = { role: 'mister_white', word: '' } })
  shuffledIdxs.slice(numMW, numMW + numUndercover).forEach((i) => {
    roleMap[i] = { role: 'undercover', word: pair.undercover }
  })
  shuffledIdxs.slice(numMW + numUndercover).forEach((i) => {
    roleMap[i] = { role: 'civil', word: pair.civil }
  })
  const roles = valid.map((name, i) => ({
    name,
    origIdx: i,
    color: MW_COLORS[i % MW_COLORS.length],
    ...roleMap[i],
  }))
  return { roles, civilWord: pair.civil, undercoverWord: pair.undercover }
}

export function checkEndCondition(roles, eliminated) {
  const remaining = roles.filter((_, i) => !eliminated.includes(i))
  const mwAlive = remaining.some((r) => r.role === 'mister_white')
  const civils = remaining.filter((r) => r.role === 'civil').length
  const undercoveres = remaining.filter((r) => r.role === 'undercover').length
  if (civils <= 1) {
    return mwAlive ? 'mw_wins' : undercoveres > 0 ? 'undercover_wins' : 'civils_win'
  }
  if (undercoveres >= civils) return 'undercover_wins'
  if (!mwAlive && undercoveres === 0) return 'civils_win'
  return null
}

export function roleLabel(role) {
  if (role === 'civil') return 'Civil'
  if (role === 'undercover') return 'Undercover'
  return 'Mister White'
}
