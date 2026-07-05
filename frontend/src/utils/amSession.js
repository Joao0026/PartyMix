const KEY = 'partymix_am_session'

export function saveAmSession({ code, playerName, isHost }) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ code, playerName, isHost }))
  } catch { /* ignore */ }
}

export function loadAmSession() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearAmSession() {
  try {
    localStorage.removeItem(KEY)
  } catch { /* ignore */ }
}

export function patchAmSession(patch) {
  const cur = loadAmSession()
  if (!cur) return
  saveAmSession({ ...cur, ...patch })
}
