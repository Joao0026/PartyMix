const fs = require('fs')
const path = require('path')
const Card = require('../models/Card')
const Challenge = require('../models/Challenge')
const DrinkPack = require('../models/DrinkPack')
const { drinkCardToItem } = require('./drinkFingerprint')

function walkJsonFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    if (fs.statSync(full).isDirectory()) {
      if (name === '_exemplo' || name === 'node_modules') continue
      walkJsonFiles(full, out)
    } else if (name.endsWith('.json') && !name.startsWith('.')) {
      out.push(full)
    }
  }
  return out
}

function pushItem(items, entry) {
  if (!entry.textKey) return
  items.push(entry)
}

function collectChallengeEntry(entry, ctx, items) {
  if (typeof entry === 'string') {
    pushItem(items, {
      ...ctx,
      kind: 'challenge',
      textKey: entry,
      display: entry,
      raw: { text: entry },
      fingerprint: null,
    })
    return
  }
  if (!entry || typeof entry !== 'object') return

  if (entry.correctQuestion || entry.wrongQuestion) {
    const display = `impostor: ${entry.correctQuestion} | ${entry.wrongQuestion}`
    pushItem(items, {
      ...ctx,
      kind: 'impostor',
      textKey: display,
      display,
      raw: entry,
      fingerprint: null,
    })
    return
  }

  if (entry.text) {
    pushItem(items, {
      ...ctx,
      kind: 'challenge',
      textKey: entry.text,
      display: entry.text,
      raw: entry,
      fingerprint: null,
    })
  }
}

function collectFromPackObject(pack, location, source = 'file') {
  const items = []
  const packName = pack.pack || 'base'
  const base = {
    source,
    location,
    file: source === 'file' ? location : undefined,
    mode: pack.mode || '?',
    pack: packName,
  }

  if (pack.mode === 'drink' && pack.decks && typeof pack.decks === 'object') {
    for (const [deckId, deck] of Object.entries(pack.decks)) {
      for (const card of deck.cards || []) {
        pushItem(items, drinkCardToItem(card, deckId, base))
      }
    }
    return items
  }

  if (pack.mode === 'mememix') {
    for (const entry of pack.legendas || []) {
      const text = typeof entry === 'string' ? entry : entry?.text
      if (!text) continue
      pushItem(items, {
        ...base,
        deck: 'legenda',
        kind: 'mememix:legenda',
        textKey: text,
        display: text,
        raw: typeof entry === 'string' ? { text } : entry,
        fingerprint: null,
      })
    }
    for (const entry of pack.memes || []) {
      const image = entry?.image || entry?.src
      if (!image) continue
      const display = entry.caption || entry.text || image
      pushItem(items, {
        ...base,
        deck: 'meme',
        kind: 'mememix:meme',
        textKey: `${image}|${display}`,
        display,
        raw: entry,
        fingerprint: null,
      })
    }
    return items
  }

  if (pack.mode === 'cards') {
    for (const text of pack.white || []) {
      pushItem(items, {
        ...base,
        deck: 'white',
        kind: 'card:white',
        textKey: text,
        display: text,
        raw: { text, is_black: false },
        fingerprint: null,
      })
    }
    for (const text of pack.black || []) {
      pushItem(items, {
        ...base,
        deck: 'black',
        kind: 'card:black',
        textKey: text,
        display: text,
        raw: { text, is_black: true },
        fingerprint: null,
      })
    }
    return items
  }

  const categories = pack.categories || {}
  for (const [cat, entries] of Object.entries(categories)) {
    for (const entry of entries || []) {
      collectChallengeEntry(entry, { ...base, deck: cat }, items)
    }
  }

  return items
}

function collectFromFiles(dataRoot) {
  const root = dataRoot || path.join(__dirname, '../../data')
  const files = walkJsonFiles(root)
  const items = []
  const parseErrors = []

  for (const file of files) {
    const rel = path.relative(path.join(root, '..'), file).replace(/\\/g, '/')
    try {
      const pack = JSON.parse(fs.readFileSync(file, 'utf8'))
      if (pack._meta || rel.includes('MODELOS-ESCREVER-CARTAS')) continue
      items.push(...collectFromPackObject(pack, rel, 'file'))
    } catch (e) {
      parseErrors.push({ file: rel, error: e.message })
    }
  }

  return { items, parseErrors, fileCount: files.length }
}

async function collectFromDatabase() {
  const items = []
  const [challenges, cards, drinkRows] = await Promise.all([
    Challenge.find({}, {
      text: 1, category: 1, mode_type: 1, pack: 1,
      correct_question: 1, wrong_question: 1, choices: 1, answer: 1,
    }).lean(),
    Card.find({}, { text: 1, is_black: 1, pack: 1, category: 1 }).lean(),
    DrinkPack.find({}, { pack: 1, decks: 1 }).lean(),
  ])

  for (const row of challenges) {
    const isImpostor = row.category === 'impostor' || row.correct_question
    let display = row.text
    let kind = 'challenge'
    if (isImpostor && row.correct_question) {
      display = `impostor: ${row.correct_question} | ${row.wrong_question}`
      kind = 'impostor'
    }
    pushItem(items, {
      source: 'db',
      location: `db:Challenge:${row._id}`,
      id: String(row._id),
      mode: row.mode_type || 'friends',
      pack: row.pack || 'base',
      deck: row.category || 'geral',
      kind,
      textKey: display,
      display,
      raw: row,
      fingerprint: null,
    })
  }

  for (const row of cards) {
    pushItem(items, {
      source: 'db',
      location: `db:Card:${row._id}`,
      id: String(row._id),
      mode: 'cards',
      pack: row.pack || 'base',
      deck: row.is_black ? 'black' : 'white',
      kind: row.is_black ? 'card:black' : 'card:white',
      textKey: row.text,
      display: row.text,
      raw: row,
      fingerprint: null,
    })
  }

  for (const row of drinkRows) {
    const packName = row.pack || 'base'
    for (const [deckId, deck] of Object.entries(row.decks || {})) {
      for (let i = 0; i < (deck.cards || []).length; i++) {
        const card = deck.cards[i]
        const item = drinkCardToItem(card, deckId, {
          source: 'db',
          location: `db:DrinkPack:${packName}/${deckId}#${i}`,
          mode: 'drink',
          pack: packName,
        })
        pushItem(items, item)
      }
    }
  }

  return items
}

async function collectAllItems({ dataRoot, includeFiles = true, includeDb = false } = {}) {
  let items = []
  let parseErrors = []
  let fileCount = 0

  if (includeFiles) {
    const fileResult = collectFromFiles(dataRoot)
    items = items.concat(fileResult.items)
    parseErrors = fileResult.parseErrors
    fileCount = fileResult.fileCount
  }

  if (includeDb) {
    items = items.concat(await collectFromDatabase())
  }

  return { items, parseErrors, fileCount }
}

module.exports = {
  collectAllItems,
  collectFromFiles,
  collectFromDatabase,
  collectFromPackObject,
  walkJsonFiles,
}
