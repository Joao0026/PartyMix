export const JOIN_MODES = {
  cards: { path: '/CardsLobby', label: 'Cartas' },
  mister: { path: '/MisterWhiteLobby', label: 'Mister White' },
  mememix: { path: '/MemeMixLobby', label: 'MemeMix' },
  aldeia: { path: '/AldeiaMixLobby', label: 'AldeiaMix' },
}

export function buildJoinUrl(mode, code) {
  const key = String(mode || '').toLowerCase()
  const c = String(code || '').trim().toUpperCase()
  if (!JOIN_MODES[key] || !c) return ''
  if (typeof window === 'undefined') return `/join/${key}/${c}`
  return `${window.location.origin}/join/${key}/${c}`
}

export async function copyJoinLink(mode, code) {
  const url = buildJoinUrl(mode, code)
  if (!url) return false
  try {
    await navigator.clipboard.writeText(url)
    return true
  } catch {
    const el = document.createElement('input')
    el.value = url
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
    return true
  }
}
