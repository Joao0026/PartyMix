const ADMIN_TOKEN_KEY = 'partymix_admin_token'

const rawInput = (import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:3001`).trim()

/** REST base always ends with `/api` */
function toRestBase(raw) {
  let u = raw.replace(/\/+$/, '')
  if (u.endsWith('/api')) return u
  return u.endsWith('/') ? `${u}api` : `${u}/api`
}

const BASE = toRestBase(rawInput)

/** Socket.IO origin (no `/api` path) */
export function getSocketUrl() {
  return BASE.endsWith('/api') ? BASE.slice(0, -4) : BASE
}

export function getAdminToken() {
  if (typeof sessionStorage === 'undefined') return null
  return sessionStorage.getItem(ADMIN_TOKEN_KEY)
}

export function setAdminToken(token) {
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token)
}

export function clearAdminToken() {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY)
}

const authHeaders = () => {
  const t = getAdminToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

const get = (url, opts = {}) =>
  fetch(`${BASE}${url}`, {
    headers: { ...(opts.auth ? authHeaders() : {}) },
  }).then((r) => r.json())

const post = (url, body) =>
  fetch(`${BASE}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  }).then((r) => r.json())

const del = (url) =>
  fetch(`${BASE}${url}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  }).then((r) => r.json())

export const api = {
  adminLogin: async (password) => {
    const r = await fetch(`${BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(data.error || 'Login failed')
    setAdminToken(data.token)
    return data
  },

  // Challenges
  getChallenges:      (p = {}) => get(`/challenges?${new URLSearchParams(p)}`),
  getRandomChallenge: (p = {}) => get(`/challenges/random?${new URLSearchParams(p)}`),
  createChallenge:    (d) => post('/challenges', d),
  deleteChallenge:    (id) => del(`/challenges/${id}`),

  // Cards
  getCards:           (p = {}) => get(`/cards?${new URLSearchParams(p)}`),
  createCard:         (d) => post('/cards', d),
  deleteCard:         (id) => del(`/cards/${id}`),

  // Dice
  getDice:            (p = {}) => get(`/dice?${new URLSearchParams(p)}`),
  rollDice:           () => get('/dice/roll'),
  createDice:         (d) => post('/dice', d),
  deleteDice:         (id) => del(`/dice/${id}`),

  // Positions
  getPositions:       () => get('/positions'),
  getRandomPosition:  () => get('/positions/random'),

  // Lobby
  createLobby:        (host) => post('/lobby/create', { host }),
  getLobby:           (code) => get(`/lobby/${code}`),
  joinLobby:          (code, name) => post(`/lobby/${code}/join`, { name }),
  startLobby:         (code, data) => post(`/lobby/${code}/start`, { gameData: data }),

  // AI
  generateDrinkCards: (players, lang = 'pt') => post('/ai/drink-cards', { players, lang }),
  generateChallenge:  (players, mode, lang = 'pt') => post('/ai/challenge', { players, mode, lang }),

  // Community
  getCommunity:       (p = {}) => get(`/community?${new URLSearchParams(p)}`),
  getCommunityStats:  () => get('/community/stats', { auth: true }),
  submitCommunity:    (d) => post('/community', d),
  voteCommunity:      (id) => post(`/community/${id}/vote`, {}),
  approveCommunity:   (id) => post(`/community/${id}/approve`, {}),
  rejectCommunity:    (id) => post(`/community/${id}/reject`, {}),
  deleteCommunity:    (id) => del(`/community/${id}`),
}
