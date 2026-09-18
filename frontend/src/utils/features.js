import { api } from './api'

const DEFAULTS = { cards: true, aldeia: true, mememix: true, mw: true }

let cache = null
let inflight = null

export async function loadOnlineFeatures() {
  if (cache) return cache
  if (inflight) return inflight
  inflight = api.getFeatures()
    .then((data) => {
      cache = { ...DEFAULTS, ...(data?.online || {}) }
      return cache
    })
    .catch(() => {
      cache = { ...DEFAULTS }
      return cache
    })
    .finally(() => { inflight = null })
  return inflight
}

export function peekOnlineFeatures() {
  return cache || DEFAULTS
}
