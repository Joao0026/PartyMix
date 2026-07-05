const { normalizeText } = require('./contentNormalize')

const DRINK_MECHANIC_TYPES = new Set([
  'beber', 'desafio', 'regra', 'caos', 'poder', 'sorte', 'azar', 'duelo',
])

function normalizeDrinkMechanic(text) {
  return normalizeText(text)
    .replace(/\d+/g, '#')
    .replace(/\bgolos?\b/g, 'golo')
    .replace(/\bgoles?\b/g, 'golo')
    .replace(/\s+/g, ' ')
    .trim()
}

function drinkTypeFromKind(kind) {
  if (!kind || !kind.startsWith('drink:')) return null
  return kind.slice('drink:'.length)
}

function isDrinkMechanicKind(kind) {
  const type = drinkTypeFromKind(kind)
  return type && DRINK_MECHANIC_TYPES.has(type)
}

/** Assinatura exacta (dedupe import / comunidade) */
function exactSignature(raw) {
  if (!raw || typeof raw !== 'object') return normalizeText(raw)
  if (raw.type === 'impostor' || raw.correctQuestion) {
    return normalizeText(`${raw.correctQuestion}|${raw.wrongQuestion}`)
  }
  if (raw.type === 'agent') {
    return normalizeText(raw.secretMission || raw.text)
  }
  if (raw.type === 'preferencia' && Array.isArray(raw.choices)) {
    return normalizeText(`${raw.text}|${raw.choices.join('|')}`)
  }
  return normalizeText(raw.text)
}

/** Fingerprint estrutural drink (ignora números de golos) */
function drinkMechanicFingerprint(kind, raw) {
  const type = drinkTypeFromKind(kind) || raw?.type
  if (!type || !DRINK_MECHANIC_TYPES.has(type)) return null
  const text = raw?.text || ''
  if (!text.trim()) return null
  return `${type}|${normalizeDrinkMechanic(text)}`
}

function buildDrinkDisplay(card) {
  let display = card.text || card.secretMission || ''
  if (card.type === 'impostor') {
    display = `${card.correctQuestion} | ${card.wrongQuestion}`
  }
  if (card.type === 'preferencia' && Array.isArray(card.choices)) {
    display = `${display} [${card.choices.join(' / ')}]`
  }
  return display
}

function drinkCardToItem(card, deckId, ctx) {
  const kind = `drink:${card.type || '?'}`
  const display = buildDrinkDisplay(card)
  return {
    ...ctx,
    deck: deckId,
    kind,
    textKey: display,
    display,
    raw: card,
    fingerprint: drinkMechanicFingerprint(kind, card),
  }
}

function submissionToAuditItem(sub) {
  const mode = sub.mode || 'friends'
  if (mode === 'drink') {
    const type = sub.cardType || 'desafio'
    const raw = {
      type,
      text: sub.text,
      choices: sub.choices,
      secretMission: sub.secretMission || sub.text,
      correctQuestion: sub.correctQuestion,
      wrongQuestion: sub.wrongQuestion,
    }
    const kind = `drink:${type}`
    const display = buildDrinkDisplay(raw)
    return {
      source: 'submission',
      location: `submission:${sub._id}`,
      mode: 'drink',
      pack: sub.pack || 'community',
      deck: 'comunidade',
      kind,
      textKey: display,
      display,
      raw,
      fingerprint: drinkMechanicFingerprint(kind, raw),
    }
  }
  if (mode === 'cards') {
    return {
      source: 'submission',
      location: `submission:${sub._id}`,
      mode: 'cards',
      pack: sub.pack || 'community',
      deck: sub.isBlack ? 'black' : 'white',
      kind: sub.isBlack ? 'card:black' : 'card:white',
      textKey: sub.text,
      display: sub.text,
      raw: { text: sub.text, is_black: sub.isBlack },
      fingerprint: null,
    }
  }
  const kind = sub.category === 'impostor' ? 'impostor' : 'challenge'
  let display = sub.text
  if (sub.correctQuestion) display = `impostor: ${sub.correctQuestion} | ${sub.wrongQuestion}`
  return {
    source: 'submission',
    location: `submission:${sub._id}`,
    mode,
    pack: sub.pack || 'community',
    deck: sub.cardType || 'geral',
    kind,
    textKey: display,
    display,
    raw: {
      text: sub.text,
      choices: sub.choices,
      answer: sub.answer,
      correctQuestion: sub.correctQuestion,
      wrongQuestion: sub.wrongQuestion,
    },
    fingerprint: null,
  }
}

module.exports = {
  DRINK_MECHANIC_TYPES,
  exactSignature,
  drinkMechanicFingerprint,
  isDrinkMechanicKind,
  buildDrinkDisplay,
  drinkCardToItem,
  submissionToAuditItem,
  normalizeDrinkMechanic,
}
