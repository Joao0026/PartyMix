/** Pack = produto. Baralho = mecânica. Quotas para 817 cartas (sem agents, sem extreme). */

const PACK_TARGETS = {
  'noite-academica': 280,
  base: 230,
  'sem-filtros': 200,
  'casais-festa': 107,
}

/** Quantas cartas de cada mecânica vão para cada pack. O resto de cada mecânica cai no Essencial. */
const PACK_QUOTAS = {
  'casais-festa': {
    picante: 23, preferias: 20, eununca: 12, provavel: 15, waterfall: 6,
    desafios: 8, poder: 6, especiais: 8, bluff: 5, historia: 4,
  },
  'sem-filtros': {
    eununca: 28, provavel: 40, desafios: 18, picante: 6, bluff: 10,
    caos: 16, maldicao: 18, cadeia: 6, especiais: 22, waterfall: 12,
    poder: 12, preferias: 8, historia: 4,
  },
  'noite-academica': {
    waterfall: 54, cadeia: 24, historia: 28, desafios: 32, regras: 24,
    caos: 20, poder: 28, especiais: 14, provavel: 20, eununca: 12,
    preferias: 8, bluff: 6, maldicao: 10,
  },
}

const ASSIGN_ORDER = ['casais-festa', 'sem-filtros', 'noite-academica']

const COUPLE_RE = /namorad|casal|parceir|\bex\b|beijo|cama|ci[úu]me|transa|sexo|ficante|crush|colo|pele|atraente|flert|\bamor\b|rela[cç][aã]o|tes[aã]o|\bnu[asz]?\b|cueca|suti[ãa]|oral|orgasmo|ficarias|ficar com|vida sexual|atrevido|contacto f[ií]sico|bochecha/i
const FILTROS_RE = /vomit|ilegal|humilh|nojo|[oó]dio|vergonha|segredo|nunca disseste|inc[oó]mod|confess|drog|strip|apanhad|embara[cç]|trai[cç]|infiel|mais suj|podre|ilegal/i
const UNI_RE = /curso|faculdade|univers|praxe|exame|erasmus|resid[eê]ncia|cantina|tese|professor|\baula\b|jantar de curso/i
const GROUP_RE = /todos|grupo|mesa|esquerda|direita|sentido hor[aá]rio|volta [aà] mesa|cada um|toda a gente/i

function cardBlob(card) {
  return [
    card?.title,
    card?.text,
    card?.secretMission,
    card?.correctQuestion,
    card?.wrongQuestion,
    ...(Array.isArray(card?.choices) ? card.choices : []),
  ].map((part) => String(part || '')).join(' ')
}

function splitFingerprint(card) {
  return [
    card?.type || '',
    card?.title || '',
    String(card?.text || '').replace(/\s+/g, ' ').trim(),
    card?.secretMission || '',
    card?.correctQuestion || '',
    card?.wrongQuestion || '',
    Array.isArray(card?.choices) ? card.choices.join('|') : '',
  ].join('::')
}

function coupleScore(card, deckId) {
  const text = cardBlob(card)
  let score = 0
  if (deckId === 'picante') score += 8
  if (card?.type === 'alliance') score += 3
  if (card?.type === 'preferencia' && COUPLE_RE.test(text)) score += 5
  if (COUPLE_RE.test(text)) score += 6
  return score
}

function filtrosScore(card, deckId) {
  const text = cardBlob(card)
  let score = 0
  if (card?.type === 'impostor') score += 5
  if (deckId === 'maldicao' || card?.type === 'maldicao') score += 2
  if (deckId === 'bluff') score += 1
  if (FILTROS_RE.test(text)) score += 6
  return score
}

function academicaScore(card, deckId) {
  const text = cardBlob(card)
  let score = 0
  if (UNI_RE.test(text)) score += 10
  if (GROUP_RE.test(text)) score += 3
  if (['waterfall', 'cadeia', 'historia', 'regras', 'caos'].includes(deckId)) score += 2
  if (card?.type === 'miniboss') score += 5
  if (card?.type === 'beber') score += 1
  return score
}

function rarityOf(card) {
  if (['impostor', 'miniboss', 'alliance'].includes(card?.type)) return 'rare'
  if (card?.caos && String(card.caos.text || '').trim()) return 'rare'
  return 'common'
}

function intensityOf(card, deckId) {
  let n = 3
  if (card?.type === 'impostor' || deckId === 'picante') n = 5
  else if (card?.type === 'maldicao' || deckId === 'maldicao' || card?.type === 'caos' || deckId === 'caos') n = 4
  else if (card?.type === 'miniboss') n = 4
  else if (card?.type === 'alliance') n = 3
  else if (['eununca', 'provavel', 'bluff', 'desafios', 'cadeia', 'historia', 'preferias'].includes(deckId)) n = 3
  else if (card?.type === 'beber' || deckId === 'waterfall' || card?.type === 'regra' || deckId === 'regras') n = 2
  else if (card?.type === 'poder' || card?.type === 'sorte') n = 2
  else if (card?.type === 'azar') n = 3
  const text = cardBlob(card)
  if (FILTROS_RE.test(text) || COUPLE_RE.test(text)) n = Math.min(5, n + 1)
  return n
}

function actOf(card, deckId) {
  const intensity = intensityOf(card, deckId)
  if (intensity <= 2 && ['waterfall', 'regras', 'poder', 'eununca'].includes(deckId)) return 1
  if (['picante', 'maldicao', 'caos', 'especiais'].includes(deckId) || intensity >= 4) return 3
  return 2
}

function stampCard(card, pack, deckId) {
  card.pack = pack
  card.intensity = intensityOf(card, deckId)
  card.rarity = rarityOf(card)
  card.act = actOf(card, deckId)
  return card
}

const SCORE_FOR = {
  'casais-festa': coupleScore,
  'sem-filtros': filtrosScore,
  'noite-academica': academicaScore,
}

function assignCardsToPacks(items) {
  const byDeck = {}
  for (const item of items) {
    const deckId = item.deckId || 'outros'
    if (!byDeck[deckId]) byDeck[deckId] = []
    byDeck[deckId].push(item)
  }

  const assigned = []
  for (const [deckId, list] of Object.entries(byDeck)) {
    const remaining = [...list]
    for (const pack of ASSIGN_ORDER) {
      const quota = PACK_QUOTAS[pack]?.[deckId] || 0
      if (!quota || !remaining.length) continue
      const scoreFn = SCORE_FOR[pack]
      remaining.sort((a, b) => {
        const diff = scoreFn(b.card, deckId) - scoreFn(a.card, deckId)
        if (diff) return diff
        return splitFingerprint(a.card).localeCompare(splitFingerprint(b.card))
      })
      const taken = remaining.splice(0, Math.min(quota, remaining.length))
      for (const item of taken) assigned.push({ ...item, pack })
    }
    for (const item of remaining) assigned.push({ ...item, pack: 'base' })
  }

  return assigned.map((item) => {
    stampCard(item.card, item.pack, item.deckId)
    return item
  })
}

function applyDrinkPackSplit(packDocs) {
  const items = []
  for (const doc of packDocs) {
    const decks = doc.decks && typeof doc.decks === 'object' ? doc.decks : {}
    for (const [deckId, deck] of Object.entries(decks)) {
      if (deckId === 'comunidade') continue
      for (const card of deck.cards || []) {
        items.push({ deckId, card, fromPack: doc.pack })
      }
    }
  }
  return assignCardsToPacks(items)
}

function splitSummary(items) {
  const byPack = {}
  const byPackDeck = {}
  for (const item of items) {
    byPack[item.pack] = (byPack[item.pack] || 0) + 1
    const key = `${item.pack}/${item.deckId}`
    byPackDeck[key] = (byPackDeck[key] || 0) + 1
  }
  return { total: items.length, byPack, byPackDeck }
}

module.exports = {
  PACK_TARGETS,
  PACK_QUOTAS,
  coupleScore,
  filtrosScore,
  academicaScore,
  assignCardsToPacks,
  applyDrinkPackSplit,
  splitSummary,
  stampCard,
}
