const AGE_KEY = 'partymix_age_gate_v1'

const ADULT_PATHS = [
  '/DrinkGame',
  '/DrinkTv',
  '/CoupleGame',
  '/daily',
  '/CardsLobby',
  '/CardsGame',
  '/MisterWhite',
  '/MisterWhiteGame',
  '/MisterWhiteLobby',
  '/MisterWhiteOnline',
  '/AldeiaMix',
  '/AldeiaMixLobby',
  '/AldeiaMixOnline',
  '/MemeMix',
  '/MemeMixLobby',
  '/MemeMixOnline',
  '/admin',
  '/ChallengesOnly',
]

export function loadAgeGate() {
  try {
    const v = localStorage.getItem(AGE_KEY)
    if (v === '18' || v === 'under') return v
  } catch { /* ignore */ }
  return null
}

export function saveAgeGate(value) {
  try {
    if (value === '18' || value === 'under') localStorage.setItem(AGE_KEY, value)
    else localStorage.removeItem(AGE_KEY)
  } catch { /* ignore */ }
}

export function isAdultConfirmed() {
  return loadAgeGate() === '18'
}

export function isUnder18() {
  return loadAgeGate() === 'under'
}

export function isAdultPath(pathname, search = '') {
  if (ADULT_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true
  if (pathname.startsWith('/join/')) {
    const mode = pathname.split('/')[2]
    return mode !== 'family'
  }
  if (pathname === '/GameSetup') {
    const mode = new URLSearchParams(search).get('mode')
    return mode !== 'family'
  }
  if (pathname === '/community') return false
  return false
}
