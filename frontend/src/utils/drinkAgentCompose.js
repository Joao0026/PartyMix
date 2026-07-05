/** Tipos de carta dos baralhos normais que podem ser «fachada» do Agente Secreto */
export const AGENT_PUBLIC_TYPES = new Set(['desafio', 'regra', 'caos', 'beber', 'poder', 'sorte', 'azar', 'preferencia'])

/** Texto legível em voz alta (inclui opções do Would You Rather) */
export function drinkCardDisplayText(card) {
  if (!card) return ''
  const text = String(card.text || '').trim()
  const choices = Array.isArray(card.choices)
    ? card.choices.map((c) => String(c || '').trim()).filter(Boolean)
    : []
  if (card.type === 'preferencia' && choices.length >= 2) {
    const question = `Preferias ${choices[0]} ou ${choices[1]}?`
    return text ? `${question} ${text}` : question
  }
  return text
}

/** Pool de textos públicos = baralhos seleccionados excepto «especiais» */
export function buildAgentPublicPool(deckCategories, selectedCats) {
  if (!Array.isArray(deckCategories) || !selectedCats?.length) return []
  return deckCategories
    .filter((c) => selectedCats.includes(c.id) && c.id !== 'especiais')
    .flatMap((c) => c.cards || [])
    .filter((c) => AGENT_PUBLIC_TYPES.has(c.type) && drinkCardDisplayText(c).trim())
}

export function buildPlayableDrinkDeck(deckCategories, selectedCats, includeCommunity = false) {
  const cats = new Set(selectedCats || [])
  if (includeCommunity) cats.add('comunidade')
  const cards = (deckCategories || [])
    .filter((c) => cats.has(c.id))
    .flatMap((c) => c.cards || [])
  const agentEnabled = buildAgentPublicPool(deckCategories, [...cats]).length > 0
  if (agentEnabled) return cards
  return cards.filter((c) => c.type !== 'agent')
}

export function pickAgentPublicText(publicPool, recentTexts = []) {
  if (!publicPool.length) return ''
  let pool = publicPool.filter((c) => !recentTexts.includes(drinkCardDisplayText(c)))
  if (!pool.length) pool = publicPool
  const picked = pool[Math.floor(Math.random() * pool.length)]
  return drinkCardDisplayText(picked)
}

export function composeAgentCard(agentCard, publicPool, recentTexts = []) {
  const secretMission =
    String(agentCard.secretMission || '').trim() ||
    String(agentCard.text || '').trim() ||
    'Cumpre a missão secreta antes do teu próximo turno.'
  const publicText = pickAgentPublicText(publicPool, recentTexts)
  return {
    ...agentCard,
    type: 'agent',
    emoji: agentCard.emoji || '🕵️',
    title: agentCard.title || 'Agente Secreto',
    secretMission,
    publicText,
  }
}
