import { loadAgeGate } from './ageGate'

const ADMIN_TOKEN_KEY = 'partymix_admin_token'
const COMMUNITY_VOTER_KEY = 'partymix_community_voter_id'

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

function logoutAdminIfUnauthorized(status) {
  if (status !== 401) return
  if (typeof sessionStorage === 'undefined' || !sessionStorage.getItem(ADMIN_TOKEN_KEY)) return
  clearAdminToken()
  window.dispatchEvent(new Event('partymix-admin-auth'))
}

export function getCommunityVoterId() {
  const stored = localStorage.getItem(COMMUNITY_VOTER_KEY)
  if (stored) return stored
  const id = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `anon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
  localStorage.setItem(COMMUNITY_VOTER_KEY, id)
  return id
}

function ageHeaders() {
  return loadAgeGate() === 'under' ? { 'X-PartyMix-Age': 'under' } : {}
}

const authHeaders = () => {
  const t = getAdminToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

const get = (url, opts = {}) =>
  fetch(`${BASE}${url}`, {
    credentials: 'include',
    headers: { ...ageHeaders(), ...(opts.auth ? authHeaders() : {}) },
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
      let data
      try {
        data = text ? JSON.parse(text) : {}
      } catch {
        if (!r.ok) {
          logoutAdminIfUnauthorized(r.status)
          const error = new Error(text.trim() || `HTTP ${r.status}`)
          error.status = r.status
          throw error
        }
        throw new Error('Resposta inválida do servidor')
      }
      if (!r.ok) {
        logoutAdminIfUnauthorized(r.status)
        const error = new Error(
          typeof data.error === 'string'
            ? data.error
            : typeof data.message === 'string'
              ? data.message
              : `HTTP ${r.status}`
        )
        error.status = r.status
        error.data = data
        throw error
      }
      return data
    })

const post = async (url, body) => {
  let r
  try {
    r = await fetch(`${BASE}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...ageHeaders(), ...authHeaders() },
      credentials: 'include',
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
  if (!r.ok) {
    logoutAdminIfUnauthorized(r.status)
    throw new Error(typeof data.error === 'string' ? data.error : `HTTP ${r.status}`)
  }
  return data
}

const del = async (url) => {
  let r
  try {
    r = await fetch(`${BASE}${url}`, {
      method: 'DELETE',
      headers: { ...ageHeaders(), ...authHeaders() },
      credentials: 'include',
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
  if (!r.ok) {
    logoutAdminIfUnauthorized(r.status)
    throw new Error(typeof data.error === 'string' ? data.error : `HTTP ${r.status}`)
  }
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
  listAdminPacks:     () => get('/admin/packs', { auth: true }),
  exportAdminPack:    (pack) => get(`/admin/packs/${encodeURIComponent(pack)}/export`, { auth: true }),
  listDrinkAssign:    () => get('/admin/drink-cards', { auth: true }),
  assignDrinkCard:    (d) => post(`/admin/drink-cards/assign`, d),
  updateCommunityMeta:(id, d) => post(`/admin/community/${id}/meta`, d),
  getContentAudit:    (p = {}) => get(`/admin/content-audit?${new URLSearchParams(p)}`, { auth: true }),
  previewSubmissionWarnings: (id) => get(`/admin/community/${id}/warnings`, { auth: true }),

  adminLogout:        () => post('/admin/logout', {}),
  getHealth:          () => get('/health'),
  setAgeGate:         (age) => post('/age', { age }),
  clearAgeGate:       () => del('/age'),
  getDrinkDecks:      (pack = 'base') => get(`/drink/decks?pack=${encodeURIComponent(pack)}`),
  getDrinkPacks:      () => get('/drink/packs'),
  getDrinkTv:         (code) => get(`/drink/tv/${encodeURIComponent(String(code || '').toUpperCase())}`),
  publishDrinkTv:     (code, d) => post(`/drink/tv/${encodeURIComponent(String(code || '').toUpperCase())}`, d),

  // Challenges
  getChallengePacks:  (p = {}) => get(`/challenges/packs?${new URLSearchParams(p)}`),
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
  getCommunity:       (p = {}, opts = {}) => get(`/community?${new URLSearchParams(p)}`, { auth: !!opts.auth }),
  getCommunityStats:  () => get('/community/stats', { auth: true }),
  submitCommunity:    (d) => post('/community', d),
  voteCommunity:      (id) => post(`/community/${id}/vote`, { voterId: getCommunityVoterId() }),
  unvoteCommunity:    (id) => post(`/community/${id}/unvote`, { voterId: getCommunityVoterId() }),
  reportCommunity:    (id, d) => post(`/community/${id}/report`, { ...d, voterId: getCommunityVoterId() }),
  blockCommunity:     (id) => post(`/community/${id}/block`, { voterId: getCommunityVoterId() }),
  approveCommunity:   (id) => post(`/community/${id}/approve`, {}),
  rejectCommunity:    (id) => post(`/community/${id}/reject`, {}),
  deleteCommunity:    (id) => del(`/community/${id}`),
  getReports:         (p = {}) => get(`/reports?${new URLSearchParams(p)}`, { auth: true }),
  reviewReport:       (id, action) => post(`/reports/${id}/review`, { action }),
  getMisterPairs:     () => get('/mister/pairs'),
  getFeatures:        () => get('/features'),

  getMemeMixPacks:    () => get('/mememix/packs'),

  uploadMemeMixPhoto: (roomCode, token, imageBase64) =>
    fetch(`${BASE}/mememix/rooms/${encodeURIComponent(roomCode)}/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-MemeMix-Token': token,
      },
      body: JSON.stringify({ imageBase64 }),
    }).then(async (r) => {
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Upload falhou')
      return data
    }),

  deleteMemeMixPhoto: (roomCode, token, memeId) =>
    fetch(`${BASE}/mememix/rooms/${encodeURIComponent(roomCode)}/memes/${encodeURIComponent(memeId)}/remove`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-MemeMix-Token': token,
      },
      body: JSON.stringify({ token }),
    }).then(async (r) => {
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Não foi possível remover')
      return data
    }),

  reportMemeMixPhoto: (roomCode, token, memeId, body) =>
    fetch(`${BASE}/mememix/rooms/${encodeURIComponent(roomCode)}/memes/${encodeURIComponent(memeId)}/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-MemeMix-Token': token,
      },
      body: JSON.stringify({ token, ...body }),
    }).then(async (r) => {
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Não foi possível denunciar')
      return data
    }),
}
