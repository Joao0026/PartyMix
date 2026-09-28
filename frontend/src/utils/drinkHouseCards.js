const KEY = 'partymix_drink_house_cards'

function cleanCard(card) {
  const text = String(card?.text || '').trim().slice(0, 300)
  if (!text) return null
  return {
    id: String(card?.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`),
    text,
    author: String(card?.author || '').trim().slice(0, 50),
    status: ['pending', 'sent', 'error'].includes(card?.status) ? card.status : 'pending',
  }
}

export function loadDrinkHouseCards() {
  try {
    const rows = JSON.parse(sessionStorage.getItem(KEY) || '[]')
    return Array.isArray(rows) ? rows.map(cleanCard).filter(Boolean).slice(-50) : []
  } catch {
    return []
  }
}

export function saveDrinkHouseCards(cards) {
  const rows = (cards || []).map(cleanCard).filter(Boolean).slice(-50)
  try {
    sessionStorage.setItem(KEY, JSON.stringify(rows))
  } catch {
    /* private mode / quota */
  }
  return rows
}

export function clearDrinkHouseCards() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
