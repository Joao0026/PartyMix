/** Momento Caos — secção opcional `caos` na carta; aparece aleatoriamente no jogo. */

/** Probabilidade de activar Momento Caos quando a carta tem `caos` preenchido. */
export const CAOS_MOMENT_CHANCE = 0.3

export function getCardCaos(card) {
  const block = card?.caos ?? card?.chaosUpgrade
  if (!block || typeof block !== 'object') return null
  if (!String(block.text || '').trim()) return null
  return block
}

export function cardHasCaosOption(card) {
  return getCardCaos(card) != null
}

export function rollCaosMoment(card) {
  return cardHasCaosOption(card) && Math.random() < CAOS_MOMENT_CHANCE
}

export function caosActivatorIsSubject(caos) {
  return caos?.activator === 'subject'
}

export function getCaosPrompt(caos, { readerName = '' } = {}) {
  if (String(caos?.prompt || '').trim()) return caos.prompt
  if (caosActivatorIsSubject(caos)) {
    const who = String(caos.activatorLabel || '').trim() || 'Quem cumpre a carta'
    return `${who} pode evoluir o efeito — pagando o preço.`
  }
  if (readerName) return `${readerName} pode evoluir o efeito — pagando o preço.`
  return 'Quem tirou a carta pode evoluir o efeito — pagando o preço.'
}

export function applyCaosUpgrade(card) {
  const up = getCardCaos(card)
  if (!up) return card
  return {
    ...card,
    title: up.title || card.title,
    text: up.text,
    emoji: up.emoji || card.emoji || '⚡',
    _chaosActive: true,
    _chaosBaseText: card.text,
    _chaosCost: up.cost || null,
  }
}
