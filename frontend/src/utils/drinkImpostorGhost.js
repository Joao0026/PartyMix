/** Impostor fantasma — quem saiu da mesa pode ser o impostor da ronda. */

export function pickImpostorForRound({ players, departedPlayers = [] }) {
  if (!players.length) {
    return { ghostName: null, carrierName: null, isGhost: false }
  }
  const carrier = players[Math.floor(Math.random() * players.length)]
  if (departedPlayers.length > 0) {
    const ghost = departedPlayers[Math.floor(Math.random() * departedPlayers.length)]
    return {
      ghostName: ghost?.name || null,
      carrierName: carrier?.name ?? null,
      isGhost: Boolean(ghost?.name),
    }
  }
  return {
    ghostName: null,
    carrierName: carrier?.name ?? null,
    isGhost: false,
  }
}

export function enrichImpostorCard(card, { impostorPairs = [], ghostName = null, penaltyText = '' } = {}) {
  let next = { ...card }
  if ((!next.correctQuestion || !next.wrongQuestion) && impostorPairs.length) {
    const pair = impostorPairs[Math.floor(Math.random() * impostorPairs.length)]
    next = {
      ...pair,
      ...next,
      title: next.title || pair.title,
      emoji: next.emoji || pair.emoji,
      correctQuestion: next.correctQuestion || pair.correctQuestion,
      wrongQuestion: next.wrongQuestion || pair.wrongQuestion,
    }
  }
  if (ghostName) {
    const tag = (q) => {
      const clean = String(q || '').trim()
      return clean ? `${ghostName} saiu da mesa — ${clean}` : clean
    }
    next = {
      ...next,
      correctQuestion: tag(next.correctQuestion),
      wrongQuestion: tag(next.wrongQuestion),
      _ghostImpostor: ghostName,
    }
    if (!next.text?.trim() && penaltyText) {
      next.text = `${ghostName} (já saiu) é o impostor desta ronda. ${penaltyText}`
    }
  }
  return next
}
