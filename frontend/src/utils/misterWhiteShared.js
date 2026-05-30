import { shuffle } from './game'

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
    pairs: [
      { civil: 'Pizza', undercover: 'Focaccia', difficulty: 'facil' },
      { civil: 'Café', undercover: 'Chá', difficulty: 'facil' },
      { civil: 'Chocolate', undercover: 'Caramelo', difficulty: 'normal' },
      { civil: 'Bacalhau', undercover: 'Polvo', difficulty: 'dificil' },
    ],
  },
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
}

export const MW_COLORS = [
  'from-pink-400 to-rose-500', 'from-cyan-400 to-blue-500', 'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500', 'from-violet-400 to-purple-500', 'from-fuchsia-400 to-pink-500',
  'from-lime-400 to-green-500', 'from-sky-400 to-indigo-500', 'from-red-400 to-rose-600',
  'from-teal-400 to-cyan-500', 'from-orange-400 to-amber-500', 'from-indigo-400 to-violet-500',
]

export function pickWordPair(wordPack, difficulty) {
  const packPairs = WORD_PACKS[wordPack]?.pairs || WORD_PACKS.geral.pairs
  const candidates = packPairs.filter((p) => (difficulty === 'normal' ? true : p.difficulty === difficulty))
  const pool = candidates.length ? candidates : packPairs
  return pool[Math.floor(Math.random() * pool.length)]
}

export function assignRoles(playerNames, { numMW, numUndercover, wordPack, difficulty }) {
  const valid = playerNames.filter((n) => n.trim())
  const pair = pickWordPair(wordPack, difficulty)
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
