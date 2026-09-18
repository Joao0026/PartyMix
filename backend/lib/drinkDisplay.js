const boards = new Map()
const TTL_MS = 6 * 60 * 60 * 1000
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function prune(now = Date.now()) {
  for (const [code, row] of boards) {
    if (now - row.updatedAt > TTL_MS) boards.delete(code)
  }
}

function normalizeCode(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6)
}

function publicBoard(row) {
  if (!row) return null
  return {
    code: row.code,
    card: row.card || null,
    readerName: row.readerName || '',
    turnCount: row.turnCount || 0,
    rules: Array.isArray(row.rules) ? row.rules : [],
    updatedAt: row.updatedAt,
  }
}

function putBoard(code, patch = {}) {
  prune()
  const key = normalizeCode(code)
  if (key.length < 4) return null
  const prev = boards.get(key) || {
    code: key,
    card: null,
    readerName: '',
    turnCount: 0,
    rules: [],
    updatedAt: Date.now(),
  }
  const card = patch.card && typeof patch.card === 'object'
    ? {
        type: String(patch.card.type || '').slice(0, 40),
        title: String(patch.card.title || '').slice(0, 80),
        text: String(patch.card.text || '').slice(0, 400),
        emoji: String(patch.card.emoji || '').slice(0, 8),
      }
    : (patch.card === null ? null : prev.card)
  const row = {
    ...prev,
    card,
    readerName: patch.readerName != null ? String(patch.readerName).slice(0, 40) : prev.readerName,
    turnCount: Number.isFinite(Number(patch.turnCount)) ? Number(patch.turnCount) : prev.turnCount,
    rules: Array.isArray(patch.rules)
      ? patch.rules.map((rule) => String(rule || '').slice(0, 200)).filter(Boolean).slice(0, 8)
      : prev.rules,
    updatedAt: Date.now(),
  }
  boards.set(key, row)
  return publicBoard(row)
}

function getBoard(code) {
  prune()
  return publicBoard(boards.get(normalizeCode(code)) || null)
}

function _resetForTests() {
  boards.clear()
}

module.exports = {
  putBoard,
  getBoard,
  normalizeCode,
  _resetForTests,
  CODE_CHARS,
}
