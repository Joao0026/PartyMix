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
  })
    .catch((e) => {
      const m = e?.message || 'Erro de rede'
      if (m === 'Failed to fetch' || m.includes('NetworkError')) {
        throw new Error(
          'Sem ligação ao servidor. Confirma VITE_API_BASE_URL e que o backend está online.'
        )
      }
      throw e
    })
    .then(async (r) => {
      const text = await r.text()
      try {
        return text ? JSON.parse(text) : {}
      } catch {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        throw new Error('Resposta inválida do servidor')
      }
    })

const post = async (url, body) => {
  let r
  try {
    r = await fetch(`${BASE}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
    })
  } catch (e) {
    const m = e?.message || 'Erro de rede'
    if (m === 'Failed to fetch' || m.includes('NetworkError')) {
      throw new Error(
        'Sem ligação ao servidor (rede/CORS/URL). Confirma VITE_API_BASE_URL no Netlify e que o backend Render está acordado.'
      )
    }
    throw new Error(m)
  }
  const text = await r.text()
  let data = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    throw new Error(!r.ok ? `Erro ${r.status} do servidor` : 'Resposta inválida (não JSON)')
  }
  if (!r.ok) throw new Error(typeof data.error === 'string' ? data.error : `HTTP ${r.status}`)
  return data
}

const del = async (url) => {
  let r
  try {
    r = await fetch(`${BASE}${url}`, {
      method: 'DELETE',
      headers: { ...authHeaders() },
    })
  } catch (e) {
    const m = e?.message || 'Erro de rede'
    if (m === 'Failed to fetch' || m.includes('NetworkError')) {
      throw new Error(
        'Sem ligação ao servidor (rede/CORS/URL). Confirma VITE_API_BASE_URL no Netlify e que o backend Render está acordado.'
      )
    }
    throw new Error(m)
  }
  const text = await r.text()
  let data = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    throw new Error(!r.ok ? `Erro ${r.status} do servidor` : 'Resposta inválida (não JSON)')
  }
  if (!r.ok) throw new Error(typeof data.error === 'string' ? data.error : `HTTP ${r.status}`)
  return data
}

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
  importPack:         (pack) => post('/admin/import-pack', { pack }),
  updateCommunityMeta:(id, d) => post(`/admin/community/${id}/meta`, d),

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

  // players: string[] | { name, drink? }[]
  generateChallenge: (players, mode, lang = 'pt') => post('/ai/challenge', { players, mode, lang }),
  generateCards:     (players, lang = 'pt') => post('/ai/cards', { players, lang }),

  // Community
  getCommunity:       (p = {}) => get(`/community?${new URLSearchParams(p)}`),
  getCommunityStats:  () => get('/community/stats', { auth: true }),
  submitCommunity:    (d) => post('/community', d),
  voteCommunity:      (id) => post(`/community/${id}/vote`, {}),
  approveCommunity:   (id) => post(`/community/${id}/approve`, {}),
  rejectCommunity:    (id) => post(`/community/${id}/reject`, {}),
  deleteCommunity:    (id) => del(`/community/${id}`),
}
