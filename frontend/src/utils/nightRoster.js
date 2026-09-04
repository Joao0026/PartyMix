const KEY = 'partyMixNightRoster'
const MAX_NAMES = 20

function cleanName(name) {
  return String(name || '').trim().slice(0, 20)
}

function cleanGender(g) {
  return g === 'm' || g === 'f' ? g : null
}

export function loadNightRoster() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { names: [], genders: [] }
    const data = JSON.parse(raw)
    const names = (Array.isArray(data?.names) ? data.names : [])
      .map(cleanName)
      .filter(Boolean)
      .slice(0, MAX_NAMES)
    const genders = names.map((_, i) => cleanGender(data?.genders?.[i]))
    return { names, genders }
  } catch {
    return { names: [], genders: [] }
  }
}

export function saveNightRoster(names, genders = []) {
  const cleanNames = (names || []).map(cleanName).filter(Boolean).slice(0, MAX_NAMES)
  if (cleanNames.length < 2) return loadNightRoster()
  const next = {
    names: cleanNames,
    genders: cleanNames.map((_, i) => cleanGender(genders?.[i])),
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* quota / private mode */
  }
  return next
}

export function clearNightRoster() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
  return { names: [], genders: [] }
}
