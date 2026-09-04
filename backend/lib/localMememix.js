const fs = require('fs')
const path = require('path')

const DATA_DIR = path.join(__dirname, '../../data/mememix')
let cache

function legendaText(entry) {
  if (typeof entry === 'string') return entry.trim()
  if (!entry || typeof entry !== 'object') return ''
  return String(entry.text || entry.legenda || '').trim()
}

function loadLocalPacks() {
  if (cache) return cache
  const files = fs.readdirSync(DATA_DIR).filter((name) => (
    /^legendas(?:-[a-z0-9-]+)?-pack\.json$/i.test(name)
    || name === 'legendas-pack.json'
    || name === 'legendascommunity-pack.json'
    || name === 'legendasamigos.json'
  ))
  cache = files.map((file) => {
    const json = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'))
    const pack = String(json.pack || '').trim()
    const entries = Array.isArray(json.legendas) ? json.legendas : []
    return {
      pack,
      name: json.name || pack,
      description: json.description || '',
      audience: json.audience || '',
      entries,
    }
  }).filter((row) => row.pack)
  return cache
}

function getLocalLegendaPacks({ includeCommunity = true } = {}) {
  return loadLocalPacks()
    .filter((row) => includeCommunity || row.pack !== 'community')
    .map((row) => ({
      pack: row.pack,
      name: row.name,
      description: row.description,
      audience: row.audience,
      count: row.entries.map(legendaText).filter(Boolean).length,
    }))
}

function getLocalLegendas({
  packs = ['todas'],
  includeCommunity = true,
  difficulty,
} = {}) {
  const selected = new Set(Array.isArray(packs) ? packs : [packs])
  const all = selected.has('todas') || selected.has('all')
  const seen = new Set()
  const result = []

  for (const row of loadLocalPacks()) {
    if (row.pack === 'community' && !includeCommunity) continue
    if (!all && !selected.has(row.pack) && !(includeCommunity && row.pack === 'community')) continue
    for (const entry of row.entries) {
      if (difficulty && typeof entry === 'object' && entry.difficulty && entry.difficulty !== difficulty) continue
      const text = legendaText(entry)
      const key = text.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ')
      if (!text || seen.has(key)) continue
      seen.add(key)
      result.push(text)
    }
  }
  return result
}

module.exports = {
  getLocalLegendaPacks,
  getLocalLegendas,
}
