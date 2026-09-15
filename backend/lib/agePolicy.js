const ADULT_PATHS = [
  '/DrinkGame',
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

function isAdultPath(pathname, search = '') {
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
  if (pathname === '/privacy' || pathname === '/terms') return false
  return false
}

module.exports = { ADULT_PATHS, isAdultPath }
