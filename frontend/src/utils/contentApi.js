import { api } from './api'
import {
  getLocalChallenges,
  getLocalDrinkDecks,
  getLocalDrinkPacks,
  pickLocalRandomChallenge,
} from '../content/localPacks'

/** Desafio aleatório: API primeiro, JSON local se falhar. */
export async function fetchRandomChallenge(params = {}) {
  try {
    const c = await api.getRandomChallenge(params)
    if (c && !c.error && c.text) return { ...c, _source: 'api' }
  } catch { /* offline */ }
  const local = pickLocalRandomChallenge(params)
  if (local) return { ...local, _source: 'local' }
  return null
}

/** Lista de desafios (ex.: impostor no mapa). */
export async function fetchChallenges(params = {}) {
  try {
    const rows = await api.getChallenges(params)
    if (Array.isArray(rows) && rows.length) return rows
  } catch { /* offline */ }
  return getLocalChallenges(params)
}

/** Baralhos do Modo Beber. */
export async function fetchDrinkDecks(pack = 'base') {
  try {
    const decks = await api.getDrinkDecks(pack)
    if (decks?.categories?.length) return decks
  } catch { /* offline */ }
  return getLocalDrinkDecks(pack)
}

/** Packs disponíveis no Modo Beber. */
export async function fetchDrinkPacks() {
  try {
    const packs = await api.getDrinkPacks()
    if (Array.isArray(packs) && packs.length) return packs
  } catch { /* offline */ }
  return getLocalDrinkPacks()
}
