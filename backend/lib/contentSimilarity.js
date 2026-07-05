const { exactKey, normalizeText, formatLocation } = require('./contentNormalize')
const { isDrinkMechanicKind } = require('./drinkFingerprint')
const { similarityRatio } = require('./contentNormalize')

const SEMANTIC_THRESHOLD = 0.92
const NEAR_THRESHOLD = 0.88

function sameItem(a, b) {
  if (!a || !b) return false
  if (a.location && b.location && a.location === b.location) return true
  return false
}

function findExactGroups(items) {
  const exactMap = new Map()
  for (const item of items) {
    const key = exactKey(item.textKey)
    if (!key) continue
    if (!exactMap.has(key)) exactMap.set(key, [])
    exactMap.get(key).push(item)
  }
  return [...exactMap.values()].filter((g) => g.length > 1)
}

function findVariantPairs(items) {
  const fpMap = new Map()
  const pairs = []

  for (const item of items) {
    if (!item.fingerprint || !isDrinkMechanicKind(item.kind)) continue
    if (!fpMap.has(item.fingerprint)) fpMap.set(item.fingerprint, [])
    fpMap.get(item.fingerprint).push(item)
  }

  for (const group of fpMap.values()) {
    if (group.length < 2) continue
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i]
        const b = group[j]
        if (exactKey(a.textKey) === exactKey(b.textKey)) continue
        pairs.push({ a, b, fingerprint: a.fingerprint })
      }
    }
  }

  return pairs.slice(0, 200)
}

function findNearPairs(items, { nearThreshold = NEAR_THRESHOLD } = {}) {
  const nearPairs = []
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i]
      const b = items[j]
      if (a.mode !== b.mode) continue
      const ratio = similarityRatio(a.textKey, b.textKey)
      if (ratio >= nearThreshold && exactKey(a.textKey) !== exactKey(b.textKey)) {
        nearPairs.push({ a, b, ratio: Math.round(ratio * 100) / 100 })
      }
    }
  }
  nearPairs.sort((x, y) => y.ratio - x.ratio)
  return nearPairs.slice(0, 200)
}

function findSemanticPairs(items, embeddedItems, { threshold = SEMANTIC_THRESHOLD } = {}) {
  const { cosineSimilarity } = require('./groqEmbeddings')
  const byBucket = new Map()

  for (const item of embeddedItems) {
    if (!item._embedding) continue
    const key = `${item.mode}|${item.kind}`
    if (!byBucket.has(key)) byBucket.set(key, [])
    byBucket.get(key).push(item)
  }

  const pairs = []
  for (const bucket of byBucket.values()) {
    for (let i = 0; i < bucket.length; i++) {
      for (let j = i + 1; j < bucket.length; j++) {
        const a = bucket[i]
        const b = bucket[j]
        if (exactKey(a.textKey) === exactKey(b.textKey)) continue
        const ratio = cosineSimilarity(a._embedding, b._embedding)
        if (ratio >= threshold) {
          pairs.push({ a, b, ratio: Math.round(ratio * 100) / 100 })
        }
      }
    }
  }

  pairs.sort((x, y) => y.ratio - x.ratio)
  return pairs.slice(0, 150)
}

function itemToWarningRef(item) {
  return {
    location: formatLocation(item),
    source: item.source,
    mode: item.mode,
    pack: item.pack,
    deck: item.deck,
    kind: item.kind,
    preview: item.display?.slice(0, 120),
  }
}

function findWarningsForCandidate(candidate, corpus, {
  semantic = false,
  embeddedCorpus = null,
  nearThreshold = NEAR_THRESHOLD,
} = {}) {
  const warnings = []
  const seen = new Set()

  const add = (type, similarTo, extra = {}) => {
    const loc = formatLocation(similarTo)
    const key = `${type}|${loc}|${extra.ratio || ''}`
    if (seen.has(key)) return
    seen.add(key)
    warnings.push({
      type,
      similarTo: itemToWarningRef(similarTo),
      preview: candidate.display?.slice(0, 120),
      ...extra,
    })
  }

  for (const item of corpus) {
    if (sameItem(candidate, item)) continue

    if (exactKey(candidate.textKey) === exactKey(item.textKey)) {
      add('exact', item, { message: 'Texto exactamente igual' })
    }
  }

  if (candidate.fingerprint && isDrinkMechanicKind(candidate.kind)) {
    for (const item of corpus) {
      if (sameItem(candidate, item)) continue
      if (item.fingerprint !== candidate.fingerprint) continue
      if (exactKey(candidate.textKey) === exactKey(item.textKey)) continue
      add('variant', item, { message: 'Mesma mecânica drink (números diferentes?)' })
    }
  }

  for (const item of corpus) {
    if (sameItem(candidate, item)) continue
    if (candidate.mode !== item.mode) continue
    const ratio = similarityRatio(candidate.textKey, item.textKey)
    if (ratio >= nearThreshold && exactKey(candidate.textKey) !== exactKey(item.textKey)) {
      add('near', item, { ratio, message: 'Texto muito parecido (Levenshtein)' })
    }
  }

  if (semantic && candidate._embedding && embeddedCorpus?.length) {
    const { cosineSimilarity } = require('./groqEmbeddings')
    for (const item of embeddedCorpus) {
      if (sameItem(candidate, item)) continue
      if (candidate.mode !== item.mode || candidate.kind !== item.kind) continue
      if (!item._embedding) continue
      const ratio = cosineSimilarity(candidate._embedding, item._embedding)
      if (ratio >= SEMANTIC_THRESHOLD && exactKey(candidate.textKey) !== exactKey(item.textKey)) {
        add('semantic', item, { ratio, message: 'Similar semântico (Groq)' })
      }
    }
  }

  const order = { exact: 0, variant: 1, near: 2, semantic: 3 }
  warnings.sort((a, b) => (order[a.type] ?? 9) - (order[b.type] ?? 9))
  return warnings.slice(0, 20)
}

module.exports = {
  findExactGroups,
  findVariantPairs,
  findNearPairs,
  findSemanticPairs,
  findWarningsForCandidate,
  itemToWarningRef,
  SEMANTIC_THRESHOLD,
  NEAR_THRESHOLD,
}
