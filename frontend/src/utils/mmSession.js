const KEY = 'partymix_mm_session'

export function saveMmSession({ code, playerName, uploadToken, isHost }) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ code, playerName, uploadToken, isHost }))
  } catch { /* ignore */ }
}

export function loadMmSession() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearMmSession() {
  try {
    localStorage.removeItem(KEY)
  } catch { /* ignore */ }
}

export function patchMmSession(patch) {
  const cur = loadMmSession()
  if (!cur) return
  saveMmSession({ ...cur, ...patch })
}
