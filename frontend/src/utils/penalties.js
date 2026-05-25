/** Extrai penalização de texto de carta: "bebe 3", "distribui 2", etc. */
export function parseCardPenalty(text = '') {
  const t = String(text || '').toLowerCase()
  const drinkMatch = t.match(/bebe(?:m)?\s+(\d+)/) || t.match(/(\d+)\s+gole?s?\b/)
  if (drinkMatch) {
    return { action: 'drink', amount: Math.min(12, parseInt(drinkMatch[1], 10) || 1), raw: drinkMatch[0] }
  }
  const giveMatch = t.match(/distribui(?:em)?\s+(\d+)/)
  if (giveMatch) {
    return { action: 'distribute', amount: Math.min(12, parseInt(giveMatch[1], 10) || 1), raw: giveMatch[0] }
  }
  return null
}

export function formatGoles(n) {
  const v = Number(n) || 0
  return `${v} gole${v === 1 ? '' : 's'}`
}

export function penaltyHint(text) {
  const p = parseCardPenalty(text)
  if (!p) return null
  if (p.action === 'drink') return `Bebe ${formatGoles(p.amount)}`
  return `Distribui ${formatGoles(p.amount)}`
}
