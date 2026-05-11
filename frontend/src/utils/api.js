const BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001`

// Ensure /api exists at the end
const BASE = BASE_URL.endsWith('/api')
  ? BASE_URL
  : BASE_URL.endsWith('/')
    ? `${BASE_URL}api`
    : `${BASE_URL}/api`

const get = (url) =>
  fetch(`${BASE}${url}`).then(r => r.json())

const post = (url, body) =>
  fetch(`${BASE}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(r => r.json())

const del = (url) =>
  fetch(`${BASE}${url}`, {
    method: 'DELETE'
  }).then(r => r.json())

export const api = {
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
  getCommunityStats:  () => get('/community/stats'),
  submitCommunity:    (d) => post('/community', d),
  voteCommunity:      (id) => post(`/community/${id}/vote`, {}),
  approveCommunity:   (id) => post(`/community/${id}/approve`, {}),
  rejectCommunity:    (id) => post(`/community/${id}/reject`, {}),
  deleteCommunity:    (id) => del(`/community/${id}`)
}