/** Lógica Mister White partilhada (servidor) */

const Card = require('../models/Card')

const WORD_PAIRS = [
  ['Futebol', 'Rugby'], ['Pizza', 'Focaccia'], ['Gato', 'Leopardo'], ['Praia', 'Piscina'],
  ['Café', 'Chá'], ['Carro', 'Mota'], ['Sol', 'Lâmpada'], ['Médico', 'Enfermeiro'],
  ['Leão', 'Tigre'], ['Cinema', 'Teatro'], ['Guitarra', 'Violino'], ['Crocodilo', 'Lagarto'],
  ['Avião', 'Helicóptero'], ['Coca-Cola', 'Pepsi'], ["McDonald's", 'Burger King'],
  ['Instagram', 'TikTok'], ['Neve', 'Granizo'], ['Castelo', 'Palácio'], ['Tubarão', 'Baleia'],
  ['Computador', 'Tablet'], ['Vinho', 'Cerveja'], ['Montanha', 'Colina'], ['Janela', 'Porta'],
]

const WORD_PACKS = {
  geral: { pairs: WORD_PAIRS.map(([civil, undercover]) => ({ civil, undercover, difficulty: 'normal' })) },
  comida: {
    pairs: [
      { civil: 'Pizza', undercover: 'Focaccia', difficulty: 'facil' },
      { civil: 'Café', undercover: 'Chá', difficulty: 'facil' },
      { civil: 'Chocolate', undercover: 'Caramelo', difficulty: 'normal' },
      { civil: 'Bacalhau', undercover: 'Polvo', difficulty: 'dificil' },
    ],
  },
  portugal: {
    pairs: [
      { civil: 'Benfica', undercover: 'Sporting', difficulty: 'facil' },
      { civil: 'Lisboa', undercover: 'Porto', difficulty: 'facil' },
      { civil: 'Pastel de nata', undercover: 'Queijada', difficulty: 'normal' },
      { civil: 'Fado', undercover: 'Cante alentejano', difficulty: 'dificil' },
    ],
  },
  marcas: {
    pairs: [
      { civil: 'Civil', undercover: 'Pepsi', difficulty: 'facil' },
      { civil: "McDonald's", undercover: 'Burger King', difficulty: 'facil' },
      { civil: 'Instagram', undercover: 'TikTok', difficulty: 'normal' },
      { civil: 'Netflix', undercover: 'HBO', difficulty: 'normal' },
    ],
  },
  filmes: {
    pairs: [
      { civil: 'Cinema', undercover: 'Teatro', difficulty: 'facil' },
      { civil: 'Harry Potter', undercover: 'Senhor dos Anéis', difficulty: 'normal' },
      { civil: 'Batman', undercover: 'Superman', difficulty: 'normal' },
      { civil: 'Terror', undercover: 'Suspense', difficulty: 'dificil' },
    ],
  },
  escola: {
    pairs: [
      { civil: 'Professor', undercover: 'Aluno', difficulty: 'facil' },
      { civil: 'Teste', undercover: 'Exame', difficulty: 'normal' },
      { civil: 'Recreio', undercover: 'Intervalo', difficulty: 'normal' },
      { civil: 'Caderno', undercover: 'Manual', difficulty: 'dificil' },
    ],
  },
  comunidade: { pairs: [] },
}

// Fix typo I accidentally introduced - Coca-Cola not Civil
WORD_PACKS.marcas.pairs[0] = { civil: 'Coca-Cola', undercover: 'Pepsi', difficulty: 'facil' }

let communityPairsCache = null
let communityCacheAt = 0
const COMMUNITY_CACHE_MS = 30_000

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

async function loadCommunityPairs() {
  const now = Date.now()
  if (communityPairsCache && now - communityCacheAt < COMMUNITY_CACHE_MS) {
    return communityPairsCache
  }
  const rows = await Card.find({ mode_type: 'mister', pack: 'community' }).lean()
  communityPairsCache = rows
    .filter((r) => r.civil_word && r.undercover_word)
    .map((r) => ({ civil: r.civil_word, undercover: r.undercover_word, difficulty: 'normal' }))
  communityCacheAt = now
  WORD_PACKS.comunidade.pairs = communityPairsCache
  return communityPairsCache
}

function invalidateCommunityPairsCache() {
  communityPairsCache = null
  communityCacheAt = 0
}

function pickWordPairFromPool(packPairs, communityPairs, wordPack, difficulty) {
  let base = packPairs
  if (wordPack === 'comunidade') {
    base = communityPairs.length ? communityPairs : packPairs
  } else if (communityPairs.length) {
    base = [...packPairs, ...communityPairs]
  }
  const candidates = base.filter((p) => (difficulty === 'normal' ? true : p.difficulty === difficulty))
  const pool = candidates.length ? candidates : base
  return pool[Math.floor(Math.random() * pool.length)]
}

function pickWordPair(wordPack, difficulty, communityPairs = []) {
  const packPairs = WORD_PACKS[wordPack]?.pairs || WORD_PACKS.geral.pairs
  return pickWordPairFromPool(packPairs, communityPairs, wordPack, difficulty)
}

async function pickWordPairAsync(wordPack, difficulty) {
  const communityPairs = await loadCommunityPairs()
  return pickWordPair(wordPack, difficulty, communityPairs)
}

function assignRoles(playerNames, settings, communityPairs = []) {
  const valid = playerNames.filter((n) => String(n).trim())
  const { numMW = 1, numUndercover = 1, wordPack = 'geral', difficulty = 'normal' } = settings
  const pair = pickWordPair(wordPack, difficulty, communityPairs)
  const indices = Array.from({ length: valid.length }, (_, i) => i)
  const shuffledIdxs = shuffle(indices)
  const roleMap = {}
  shuffledIdxs.slice(0, numMW).forEach((i) => { roleMap[i] = { role: 'mister_white', word: '' } })
  shuffledIdxs.slice(numMW, numMW + numUndercover).forEach((i) => {
    roleMap[i] = { role: 'undercover', word: pair.undercover }
  })
  shuffledIdxs.slice(numMW + numUndercover).forEach((i) => {
    roleMap[i] = { role: 'civil', word: pair.civil }
  })
  const roles = valid.map((name, i) => ({
    name: String(name).trim(),
    origIdx: i,
    colorIdx: i,
    ...roleMap[i],
  }))
  return { roles, civilWord: pair.civil, undercoverWord: pair.undercover }
}

async function assignRolesAsync(playerNames, settings) {
  const communityPairs = await loadCommunityPairs()
  return assignRoles(playerNames, settings, communityPairs)
}

function checkEndCondition(roles, eliminatedIdxs) {
  const remaining = roles.filter((_, i) => !eliminatedIdxs.includes(i))
  const mwAlive = remaining.some((r) => r.role === 'mister_white')
  const civils = remaining.filter((r) => r.role === 'civil').length
  const undercoveres = remaining.filter((r) => r.role === 'undercover').length
  if (civils <= 1) return mwAlive ? 'mw_wins' : undercoveres > 0 ? 'undercover_wins' : 'civils_win'
  if (undercoveres >= civils) return 'undercover_wins'
  if (!mwAlive && undercoveres === 0) return 'civils_win'
  return null
}

module.exports = {
  assignRoles,
  assignRolesAsync,
  checkEndCondition,
  WORD_PACKS,
  loadCommunityPairs,
  invalidateCommunityPairsCache,
}
