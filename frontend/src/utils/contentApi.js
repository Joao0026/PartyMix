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
export function hasValidDrinkCards(decks) {
  return Array.isArray(decks?.categories) && decks.categories.some((category) => (
    Array.isArray(category?.cards) && category.cards.some((card) => (
      typeof card === 'string'
        ? Boolean(card.trim())
        : Boolean(card && typeof card === 'object' && String(card.text || '').trim())
    ))
  ))
}

export async function fetchDrinkDecks(pack = 'base') {
  try {
    const decks = await api.getDrinkDecks(pack)
    if (hasValidDrinkCards(decks)) return decks
  } catch (error) {
    if (error?.status === 403 && error?.data?.premium) {
      return { pack, premium: true, blocked: true, categories: [] }
    }
  }
  const local = getLocalDrinkDecks(pack)
  return hasValidDrinkCards(local) ? local : { pack, unavailable: true, categories: [] }
}

/** Packs disponíveis no Modo Beber. */
export async function fetchDrinkPacks() {
  const local = getLocalDrinkPacks()
  try {
    const packs = await api.getDrinkPacks()
    if (Array.isArray(packs) && packs.length) {
      const merged = new Map(local.map((pack) => [pack.pack, pack]))
      for (const pack of packs) {
        merged.set(pack.pack, { ...(merged.get(pack.pack) || {}), ...pack })
      }
      return [...merged.values()].sort((a, b) => Number(a.premium) - Number(b.premium))
    }
  } catch { /* offline */ }
  return local
}
