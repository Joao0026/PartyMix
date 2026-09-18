const storageKey = (code) => `partymix_drink_tv_${String(code || '').toUpperCase()}`

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function makeDrinkTvCode() {
  let code = ''
  for (let i = 0; i < 4; i += 1) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return code
}

export function drinkTvUrl(code) {
  const c = String(code || '').trim().toUpperCase()
  if (!c) return ''
  if (typeof window === 'undefined') return `/DrinkTv/${c}`
  return `${window.location.origin}/DrinkTv/${c}`
}

export function writeDrinkTvLocal(code, payload) {
  const c = String(code || '').trim().toUpperCase()
  if (!c) return
  try {
    localStorage.setItem(storageKey(c), JSON.stringify({ ...payload, updatedAt: Date.now() }))
  } catch { /* quota / private mode */ }
}

export function readDrinkTvLocal(code) {
  const c = String(code || '').trim().toUpperCase()
  if (!c) return null
  try {
    const raw = localStorage.getItem(storageKey(c))
    if (!raw) return null
    const data = JSON.parse(raw)
    return data && typeof data === 'object' ? data : null
  } catch {
    return null
  }
}
