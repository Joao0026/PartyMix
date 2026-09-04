const ADULT_CATEGORIES = new Set([
  'erotico', 'picante', 'roleplay', 'casal_pergunta', 'caos',
])

const ADULT_COMMUNITY_MODES = new Set(['couple', 'drink', 'cards', 'mememix'])

const FAMILY_MODES = new Set(['family'])

function familyChallengeMongoFilter() {
  return {
    mode_type: 'family',
    audience: { $nin: ['adult'] },
  }
}

function familyCategoryClause(requestedCats) {
  const banned = [...ADULT_CATEGORIES]
  if (Array.isArray(requestedCats) && requestedCats.length) {
    return { $in: requestedCats.filter((c) => !ADULT_CATEGORIES.has(c)), $nin: banned }
  }
  return { $nin: banned }
}

function isFamilySafeChallenge(row = {}) {
  if (row.mode_type && row.mode_type !== 'family') return false
  if (row.audience === 'adult') return false
  if (ADULT_CATEGORIES.has(row.category)) return false
  return true
}

const INJECTION_RE = /ignore\s+(all|previous)|system\s*prompt|developer\s*mode|instru[cç][oõ]es?\s+do\s+sistema|you\s+are\s+now|\[\s*INST\s*\]/i

function sanitizeAiName(name) {
  let s = String(name || '')
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/[\n\r\t]/g, ' ')
    .trim()
    .slice(0, 20)
  if (!s || INJECTION_RE.test(s)) return 'Jogador'
  s = s.replace(/[^A-Za-zÀ-ÿ0-9 .'\-]/g, '').trim().slice(0, 20)
  return s || 'Jogador'
}

function sanitizeAiDrink(drink) {
  return String(drink || '')
    .replace(/<[^>]*>/g, '')
    .replace(/[\n\r\t]/g, ' ')
    .replace(/[^A-Za-zÀ-ÿ0-9 .'\-]/g, '')
    .trim()
    .slice(0, 32)
}

function cardroomPointsForResult(result) {
  const key = String(result || '').toLowerCase()
  if (key === 'completed' || key === 'success' || key === 'win') return 1
  return 0
}

module.exports = {
  ADULT_CATEGORIES,
  ADULT_COMMUNITY_MODES,
  FAMILY_MODES,
  familyChallengeMongoFilter,
  familyCategoryClause,
  isFamilySafeChallenge,
  sanitizeAiName,
  sanitizeAiDrink,
  cardroomPointsForResult,
}
