const DrinkPack = require('../models/DrinkPack')
const { exactSignature } = require('./drinkFingerprint')

/** id do baralho (decks.json) → type no motor + apresentação */
const DRINK_BARALHO = {
  waterfall: { type: 'beber', emoji: '🌊', title: 'Comunidade!' },
  eununca: { type: 'desafio', emoji: '🙅', title: 'Eu Nunca' },
  regras: { type: 'regra', emoji: '📜', title: 'Nova Regra!' },
  caos: { type: 'caos', emoji: '💥', title: 'Caos!' },
  desafios: { type: 'desafio', emoji: '⚡', title: 'Desafio!' },
  poder: { type: 'poder', emoji: '👑', title: 'Poder!' },
  picante: { type: 'desafio', emoji: '🔥', title: 'Picante!' },
  preferias: { type: 'preferencia', emoji: '🤔', title: 'Preferias?' },
  provavel: { type: 'desafio', emoji: '👉', title: 'Quem é mais provável?' },
  bluff: { type: 'desafio', emoji: '🎭', title: 'Bluff!' },
  maldicao: { type: 'desafio', emoji: '🔮', title: 'Maldição!' },
  historia: { type: 'desafio', emoji: '🎬', title: 'História' },
  cadeia: { type: 'desafio', emoji: '🔗', title: 'Cadeia!' },
  extreme: { type: 'beber', emoji: '💣', title: 'Extremo!' },
}

/** Cartas do baralho Especiais */
const ESPECIAL_KIND = {
  agent: { type: 'agent', emoji: '🕵️', title: 'Agente Secreto' },
  impostor: { type: 'impostor', emoji: '🎭', title: 'Impostor!' },
  alliance: { type: 'alliance', emoji: '🤝', title: 'Aliança!' },
  miniboss: { type: 'miniboss', emoji: '👹', title: 'Mini Boss!' },
}

/** Submissões antigas (tipo de carta, não baralho) */
const LEGACY_KIND = {
  beber: DRINK_BARALHO.waterfall,
  regra: DRINK_BARALHO.regras,
  desafio: DRINK_BARALHO.desafios,
  preferencia: DRINK_BARALHO.preferias,
  sorte: { type: 'sorte', emoji: '🍀', title: 'Sorte!' },
  azar: { type: 'azar', emoji: '💀', title: 'Azar!' },
  duelo: DRINK_BARALHO.desafios,
}

function resolveKind(sub) {
  const baralho = String(sub.cardType || sub.drinkType || 'desafios').trim() || 'desafios'
  if (baralho === 'especiais') {
    const special = String(sub.drinkSpecialType || '').trim()
    if (special && ESPECIAL_KIND[special]) return ESPECIAL_KIND[special]
    return ESPECIAL_KIND.agent
  }
  return DRINK_BARALHO[baralho] || LEGACY_KIND[baralho] || DRINK_BARALHO.desafios
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function cardSignature(card) {
  return exactSignature(card)
}

function ensureComunidadeDeck(decks) {
  if (!decks.comunidade) {
    decks.comunidade = {
      label: '🌍 Comunidade',
      desc: 'Cartas aprovadas pela comunidade',
      premium: false,
      cards: [],
    }
  }
  if (!Array.isArray(decks.comunidade.cards)) decks.comunidade.cards = []
  return decks.comunidade
}

function buildDrinkCardFromSubmission(sub) {
  const kind = resolveKind(sub)
  const emoji = String(sub.drinkEmoji || sub.emoji || kind.emoji || '🌍').slice(0, 8)
  const title = String(sub.drinkTitle || sub.title || kind.title || 'Comunidade!').slice(0, 80)
  const engineType = kind.type

  if (engineType === 'impostor') {
    return {
      type: 'impostor',
      emoji,
      title,
      correctQuestion: String(sub.correctQuestion || sub.text || '').trim(),
      wrongQuestion: String(sub.wrongQuestion || '').trim(),
    }
  }

  if (engineType === 'agent') {
    return {
      type: 'agent',
      emoji,
      title,
      secretMission: String(sub.secretMission || sub.text || '').trim(),
    }
  }

  if (engineType === 'preferencia') {
    const choices = Array.isArray(sub.choices)
      ? sub.choices.map((c) => String(c || '').trim()).filter(Boolean).slice(0, 2)
      : []
    return {
      type: 'preferencia',
      emoji,
      title,
      text: String(sub.text || '').trim(),
      choices,
    }
  }

  return {
    type: engineType,
    emoji,
    title,
    text: String(sub.text || '').trim(),
  }
}

function validateDrinkCard(card) {
  if (card.type === 'impostor') {
    if (!card.correctQuestion || !card.wrongQuestion) return 'impostor precisa de correctQuestion e wrongQuestion'
    return null
  }
  if (card.type === 'agent') {
    if (!card.secretMission) return 'agent precisa de secretMission (ou text)'
    return null
  }
  if (card.type === 'preferencia') {
    if (!card.text) return 'preferencia precisa de text (regra de quem bebe)'
    if (!Array.isArray(card.choices) || card.choices.length < 2) return 'preferencia precisa de 2 choices'
    return null
  }
  if (!card.text) return 'text em falta'
  return null
}

async function appendDrinkCommunityCard(sub, { drinkPackId = 'base' } = {}) {
  let row = await DrinkPack.findOne({ pack: drinkPackId })
  if (!row) row = await DrinkPack.findOne({ pack: 'base' })
  if (!row) throw new Error('DrinkPack não encontrado. Corre npm run seed:packs.')

  const card = buildDrinkCardFromSubmission(sub)
  const invalid = validateDrinkCard(card)
  if (invalid) throw new Error(invalid)

  const decks = row.decks && typeof row.decks === 'object' ? { ...row.decks } : {}
  const deck = ensureComunidadeDeck(decks)
  const sig = cardSignature(card)
  if (deck.cards.some((c) => cardSignature(c) === sig)) {
    return { duplicate: true, drinkPack: row.pack }
  }

  deck.cards = [...deck.cards, card]
  decks.comunidade = deck
  row.decks = decks
  row.markModified('decks')
  await row.save()
  return { duplicate: false, drinkPack: row.pack, card }
}

module.exports = {
  appendDrinkCommunityCard,
  buildDrinkCardFromSubmission,
  normalizeText,
  cardSignature,
  DRINK_BARALHO,
  ESPECIAL_KIND,
}
