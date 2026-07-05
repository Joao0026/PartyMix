const path = require('path')
const { collectAllItems } = require('./contentCollect')
const { normalizeText, similarityRatio, locationLabel } = require('./contentNormalize')
const {
  findExactGroups,
  findVariantPairs,
  findNearPairs,
  findSemanticPairs,
  findWarningsForCandidate,
} = require('./contentSimilarity')
const { embedItems, isGroqConfigured } = require('./groqEmbeddings')
const { submissionToAuditItem } = require('./drinkFingerprint')

function validateItem(item) {
  const errors = []
  const raw = item.raw || {}

  if (item.kind === 'impostor' || raw.correctQuestion || raw.correct_question) {
    const cq = raw.correctQuestion || raw.correct_question
    const wq = raw.wrongQuestion || raw.wrong_question
    if (!cq) errors.push('impostor: falta correctQuestion')
    if (!wq) errors.push('impostor: falta wrongQuestion')
  }

  if (item.kind === 'challenge' && item.deck === 'perguntas') {
    const choices = Array.isArray(raw.choices) ? raw.choices : []
    if (choices.length > 0 && raw.answer && !choices.includes(raw.answer)) {
      errors.push('perguntas: answer não está em choices')
    }
    if (choices.length > 0 && choices.length < 2) {
      errors.push('perguntas: choices deve ter 2–4 alíneas')
    }
  }

  if (item.kind === 'drink:preferencia') {
    if (!raw.text) errors.push('preferencia: falta text')
    if (!Array.isArray(raw.choices) || raw.choices.length < 2) errors.push('preferencia: faltam 2 choices')
  }

  if (item.kind === 'drink:agent') {
    if (!raw.secretMission && !raw.text) errors.push('agent: falta secretMission')
  }

  if (item.kind === 'drink:impostor') {
    if (!raw.correctQuestion || !raw.wrongQuestion) errors.push('drink impostor: faltam perguntas')
  }

  if (item.kind === 'card:black' && raw.text && !raw.text.includes('___')) {
    errors.push('carta preta: falta ___ no texto')
  }

  if (!item.textKey || !String(item.textKey).trim()) {
    errors.push('texto vazio')
  }

  return errors
}

function mapPair(a, b, ratio, type) {
  return {
    type,
    ratio,
    a: {
      location: locationLabel(a.location || a.file),
      source: a.source,
      deck: a.deck,
      kind: a.kind,
      preview: a.display?.slice(0, 100),
    },
    b: {
      location: locationLabel(b.location || b.file),
      source: b.source,
      deck: b.deck,
      kind: b.kind,
      preview: b.display?.slice(0, 100),
    },
  }
}

function mapExactGroup(group) {
  return {
    text: group[0].display,
    count: group.length,
    locations: group.map((g) => ({
      location: locationLabel(g.location || g.file),
      source: g.source,
      deck: g.deck,
      kind: g.kind,
    })),
  }
}

async function auditContent({
  dataRoot,
  includeFiles = true,
  includeDb = false,
  semantic = false,
} = {}) {
  const root = dataRoot || path.join(__dirname, '../../data')
  const { items, parseErrors, fileCount } = await collectAllItems({
    dataRoot: root,
    includeFiles,
    includeDb,
  })

  const validationErrors = []
  for (const item of items) {
    for (const message of validateItem(item)) {
      validationErrors.push({
        location: locationLabel(item.location || item.file),
        source: item.source,
        deck: item.deck,
        kind: item.kind,
        message,
        preview: item.display?.slice(0, 120),
      })
    }
  }

  const exactGroups = findExactGroups(items)
  const variantPairs = findVariantPairs(items)
  const nearPairs = findNearPairs(items)

  let semanticPairs = []
  let semanticSkipped = null
  const semanticRequested = semantic === true || semantic === 'true' || semantic === '1'

  if (semanticRequested) {
    if (!isGroqConfigured()) {
      semanticSkipped = 'GROQ_API_KEY em falta'
    } else {
      try {
        const embedded = await embedItems(items)
        semanticPairs = findSemanticPairs(items, embedded)
      } catch (e) {
        semanticSkipped = e.message || 'Erro Groq embeddings'
      }
    }
  }

  const byMode = {}
  const bySource = { file: 0, db: 0 }
  for (const item of items) {
    byMode[item.mode] = (byMode[item.mode] || 0) + 1
    if (item.source === 'db') bySource.db += 1
    else bySource.file += 1
  }

  return {
    ok: parseErrors.length === 0 && validationErrors.length === 0 && exactGroups.length === 0,
    stats: {
      files: fileCount,
      items: items.length,
      byMode,
      bySource,
      includeDb,
      semanticRequested,
      semanticAvailable: isGroqConfigured(),
      parseErrors: parseErrors.length,
      validationErrors: validationErrors.length,
      exactDuplicateGroups: exactGroups.length,
      drinkVariantPairs: variantPairs.length,
      nearDuplicatePairs: nearPairs.length,
      semanticPairs: semanticPairs.length,
    },
    parseErrors,
    validationErrors,
    exactDuplicates: exactGroups.map(mapExactGroup),
    drinkVariants: variantPairs.map(({ a, b, fingerprint }) => ({
      fingerprint,
      ...mapPair(a, b, null, 'variant'),
    })),
    nearDuplicates: nearPairs.map(({ a, b, ratio }) => mapPair(a, b, ratio, 'near')),
    semanticDuplicates: semanticPairs.map(({ a, b, ratio }) => mapPair(a, b, ratio, 'semantic')),
    semanticSkipped,
  }
}

/** @deprecated use auditContent */
function auditContentFiles(dataRoot) {
  const { items, parseErrors, fileCount } = require('./contentCollect').collectFromFiles(dataRoot)
  const validationErrors = []
  for (const item of items) {
    for (const message of validateItem(item)) {
      validationErrors.push({
        file: item.file,
        deck: item.deck,
        kind: item.kind,
        message,
        preview: item.display?.slice(0, 120),
      })
    }
  }
  const exactGroups = findExactGroups(items)
  const nearPairs = findNearPairs(items)
  const byMode = {}
  for (const item of items) byMode[item.mode] = (byMode[item.mode] || 0) + 1

  return {
    ok: parseErrors.length === 0 && validationErrors.length === 0 && exactGroups.length === 0,
    stats: {
      files: fileCount,
      items: items.length,
      byMode,
      parseErrors: parseErrors.length,
      validationErrors: validationErrors.length,
      exactDuplicateGroups: exactGroups.length,
      nearDuplicatePairs: nearPairs.length,
    },
    parseErrors,
    validationErrors,
    exactDuplicates: exactGroups.map(mapExactGroup),
    nearDuplicates: nearPairs.map(({ a, b, ratio }) => ({
      ratio,
      a: { file: a.file, deck: a.deck, preview: a.display?.slice(0, 100) },
      b: { file: b.file, deck: b.deck, preview: b.display?.slice(0, 100) },
    })),
  }
}

async function auditSubmissionWarnings(sub, { semantic = true } = {}) {
  const candidate = submissionToAuditItem(sub)
  const { items } = await collectAllItems({ includeFiles: true, includeDb: true })

  let embeddedCorpus = null
  const useSemantic = semantic && isGroqConfigured()
  if (useSemantic) {
    await embedItems([candidate])
    await embedItems(items)
    embeddedCorpus = items.filter((i) => i._embedding)
  }

  return findWarningsForCandidate(candidate, items, {
    semantic: useSemantic,
    embeddedCorpus,
  })
}

module.exports = {
  auditContent,
  auditContentFiles,
  auditSubmissionWarnings,
  validateItem,
  normalizeText,
  similarityRatio,
}
