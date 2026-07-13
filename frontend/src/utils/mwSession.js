const KEY = 'partymix_mw_session'

export function saveMwSession({ code, playerName, isHost }) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ code, playerName, isHost: !!isHost }))
  } catch { /* ignore */ }
}

export function loadMwSession() {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearMwSession() {
  try {
    sessionStorage.removeItem(KEY)
  } catch { /* ignore */ }
}
