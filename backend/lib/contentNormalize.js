function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function exactKey(textKey) {
  return normalizeText(textKey)
}

function formatLocation(item) {
  if (!item) return '?'
  if (item.source === 'file') return item.location || item.file || '?'
  return item.location || '?'
}

function locationLabel(loc) {
  if (!loc) return '?'
  if (loc.startsWith('db:')) return loc.replace(/^db:/, 'BD · ')
  return loc
}

function levenshtein(a, b) {
  const m = a.length
  const n = b.length
  if (!m) return n
  if (!n) return m
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[m][n]
}

function similarityRatio(a, b) {
  const na = normalizeText(a)
  const nb = normalizeText(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  const maxLen = Math.max(na.length, nb.length)
  if (!maxLen) return 1
  return 1 - levenshtein(na, nb) / maxLen
}

module.exports = {
  normalizeText,
  exactKey,
  formatLocation,
  locationLabel,
  levenshtein,
  similarityRatio,
}
