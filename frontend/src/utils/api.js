const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// 2. Garantimos que o caminho termina com /api para os pedidos abaixo
const BASE = BASE_URL.endsWith('/') ? `${BASE_URL}api` : `${BASE_URL}/api`;

export const api = {
  getChallenges: (p={}) => fetch(`${BASE}/challenges?${new URLSearchParams(p)}`).then(r=>r.json()),
  getRandomChallenge: (p={}) => fetch(`${BASE}/challenges/random?${new URLSearchParams(p)}`).then(r=>r.json()),
  createChallenge: (d) => fetch(`${BASE}/challenges`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}).then(r=>r.json()),
  deleteChallenge: (id) => fetch(`${BASE}/challenges/${id}`,{method:'DELETE'}).then(r=>r.json()),
  
  getCards: (p={}) => fetch(`${BASE}/cards?${new URLSearchParams(p)}`).then(r=>r.json()),
  createCard: (d) => fetch(`${BASE}/cards`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}).then(r=>r.json()),
  deleteCard: (id) => fetch(`${BASE}/cards/${id}`,{method:'DELETE'}).then(r=>r.json()),
  
  getDice: (p={}) => fetch(`${BASE}/dice?${new URLSearchParams(p)}`).then(r=>r.json()),
  rollDice: () => fetch(`${BASE}/dice/roll`).then(r=>r.json()),
  createDice: (d) => fetch(`${BASE}/dice`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}).then(r=>r.json()),
  deleteDice: (id) => fetch(`${BASE}/dice/${id}`,{method:'DELETE'}).then(r=>r.json()),
  
  getRandomPosition: () => fetch(`${BASE}/positions/random`).then(r=>r.json()),
  
  createLobby: (host) => fetch(`${BASE}/lobby/create`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({host})}).then(r=>r.json()),
  getLobby: (code) => fetch(`${BASE}/lobby/${code}`).then(r=>r.json()),
  joinLobby: (code,name) => fetch(`${BASE}/lobby/${code}/join`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name})}).then(r=>r.json()),
  startLobby: (code,gameData) => fetch(`${BASE}/lobby/${code}/start`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({gameData})}).then(r=>r.json()),
}
