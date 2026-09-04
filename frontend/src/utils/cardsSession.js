const KEY = 'partymix_cards_session'

export function saveCardsSession({ code, playerName, isHost, playerToken }) {
  try {
    const prev = loadCardsSession() || {}
    sessionStorage.setItem(KEY, JSON.stringify({
      code,
      playerName,
      isHost: !!isHost,
      playerToken: playerToken || prev.playerToken || null,
    }))
  } catch { /* ignore */ }
}

export function loadCardsSession() {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearCardsSession() {
  try {
    sessionStorage.removeItem(KEY)
  } catch { /* ignore */ }
}
