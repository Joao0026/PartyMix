const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const DrinkPack = require('../models/DrinkPack')

const DATA_DIR = path.join(__dirname, '../../data/drink')

const PACK_FILES = {
  base: 'decks.json',
  'noite-academica': 'noite-academica-pack.json',
  'sem-filtros': 'sem-filtros-pack.json',
  'casais-festa': 'casais-festa-pack.json',
}

const OFFICIAL_DECKS = [
  'waterfall', 'eununca', 'regras', 'caos', 'especiais', 'desafios',
  'poder', 'picante', 'preferias', 'provavel', 'bluff', 'maldicao',
  'historia', 'cadeia',
]

const PACK_ALIASES = {
  base: 'base',
  essencial: 'base',
  'noite-academica': 'noite-academica',
  academica: 'noite-academica',
  'noite academica': 'noite-academica',
  'sem-filtros': 'sem-filtros',
  semfiltros: 'sem-filtros',
  'sem filtros': 'sem-filtros',
  'casais-festa': 'casais-festa',
  casais: 'casais-festa',
  'casais na festa': 'casais-festa',
}

function normalizePackId(value) {
  const key = String(value || '').trim().toLowerCase()
  return PACK_ALIASES[key] || (PACK_FILES[key] ? key : '')
}

function normalizeDeckId(value) {
  const key = String(value || '').trim().toLowerCase()
  return OFFICIAL_DECKS.includes(key) ? key : ''
}

function cardDestination(card, fallbackPack, fallbackDeck) {
  const pack = normalizePackId(card?.pack || card?.targetPack) || fallbackPack
  const deck = normalizeDeckId(card?.deck || card?.baralho || card?.deckId) || fallbackDeck
  return { pack, deck }
}

function cardFingerprint(card) {
  const raw = !card || typeof card !== 'object'
    ? String(card || '')
    : [
      card.type || '',
      card.title || '',
      card.emoji || '',
      String(card.text || '').replace(/\s+/g, ' ').trim(),
    ].join('|')
  return crypto.createHash('sha1').update(raw).digest('hex')
}

function cloneCard(card) {
  return JSON.parse(JSON.stringify(card))
}

function deckCards(packDoc, deckId) {
  const deck = packDoc?.decks?.[deckId]
  return Array.isArray(deck?.cards) ? deck.cards : []
}

function flattenDrinkCards(packDocs) {
  const cards = []
  const packs = []
  const deckCounts = {}

  for (const doc of packDocs) {
    const decks = doc.decks && typeof doc.decks === 'object' ? doc.decks : {}
    let count = 0
    for (const [deckId, deck] of Object.entries(decks)) {
      if (deckId === 'comunidade') continue
      const list = Array.isArray(deck?.cards) ? deck.cards : []
      deckCounts[deckId] = (deckCounts[deckId] || 0) + list.length
      list.forEach((card, index) => {
        count += 1
        cards.push({
          pack: doc.pack,
          packName: doc.name || doc.pack,
          deckId,
          deckLabel: deck.label || deckId,
          index,
          fingerprint: cardFingerprint(card),
          card,
        })
      })
    }
    packs.push({
      pack: doc.pack,
      name: doc.name || doc.pack,
      premium: Boolean(doc.premium),
      intensity: doc.intensity || 'moderada',
      count,
    })
  }

  return { packs, cards, deckCounts }
}

function ensureDeck(packDoc, deckId, sourceDeck) {
  if (!packDoc.decks || typeof packDoc.decks !== 'object' || Array.isArray(packDoc.decks)) {
    packDoc.decks = {}
  }
  if (!packDoc.decks[deckId] || typeof packDoc.decks[deckId] !== 'object') {
    packDoc.decks[deckId] = {
      label: sourceDeck?.label || deckId,
      desc: sourceDeck?.desc || '',
      premium: false,
      cards: [],
    }
  }
  if (!Array.isArray(packDoc.decks[deckId].cards)) {
    packDoc.decks[deckId].cards = []
  }
  return packDoc.decks[deckId]
}

function moveCardInPacks(packDocs, { fromPack, fromDeck, index, fingerprint, toPack }) {
  if (fromPack === toPack) {
    return { ok: false, error: 'A carta já está neste pack' }
  }
  const source = packDocs.find((doc) => doc.pack === fromPack)
  const dest = packDocs.find((doc) => doc.pack === toPack)
  if (!source) return { ok: false, error: 'Pack de origem não encontrado' }
  if (!dest) return { ok: false, error: 'Pack de destino não encontrado' }

  const sourceDeck = source.decks?.[fromDeck]
  const cards = deckCards(source, fromDeck)
  const card = cards[index]
  if (!card) return { ok: false, error: 'Carta não encontrada' }
  if (fingerprint && cardFingerprint(card) !== fingerprint) {
    return { ok: false, error: 'A carta mudou — recarrega a lista' }
  }

  const moved = cloneCard(card)
  cards.splice(index, 1)
  source.decks[fromDeck].cards = cards

  const destDeck = ensureDeck(dest, fromDeck, sourceDeck)
  destDeck.cards.push(moved)

  return {
    ok: true,
    moved: {
      fromPack,
      fromDeck,
      toPack,
      fingerprint: cardFingerprint(moved),
      destIndex: destDeck.cards.length - 1,
      card: moved,
    },
  }
}

function drinkJsonPath(pack) {
  const file = PACK_FILES[pack]
  return file ? path.join(DATA_DIR, file) : null
}

function writeDrinkPackFile(packDoc) {
  const filePath = drinkJsonPath(packDoc.pack)
  if (!filePath || !fs.existsSync(filePath)) return false
  const current = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  current.decks = packDoc.decks
  if (packDoc.name) current.name = packDoc.name
  if (packDoc.description != null) current.description = packDoc.description
  current.premium = Boolean(packDoc.premium)
  fs.writeFileSync(filePath, `${JSON.stringify(current, null, 2)}\n`, 'utf8')
  return true
}

function packSummary(docs) {
  return flattenDrinkCards(docs)
}

function deckTemplate(packDocs, deckId) {
  for (const doc of packDocs) {
    const deck = doc.decks?.[deckId]
    if (deck && typeof deck === 'object') {
      return { label: deck.label, desc: deck.desc }
    }
  }
  return { label: deckId, desc: '' }
}

function routeDrinkCards(packDocs) {
  const knownPacks = new Set(packDocs.map((doc) => doc.pack))
  const collected = []
  const errors = []
  const moves = []

  for (const doc of packDocs) {
    const decks = doc.decks && typeof doc.decks === 'object' ? doc.decks : {}
    for (const [deckId, deck] of Object.entries(decks)) {
      if (deckId === 'comunidade') continue
      const cards = Array.isArray(deck?.cards) ? deck.cards : []
      for (const card of cards) {
        collected.push({ card, fromPack: doc.pack, fromDeck: deckId })
      }
      deck.cards = []
    }
  }

  for (const item of collected) {
    const dest = cardDestination(item.card, item.fromPack, item.fromDeck)
    if (!dest.pack || !knownPacks.has(dest.pack)) {
      errors.push({ title: item.card?.title || '(sem título)', error: `pack inválido: ${item.card?.pack || item.card?.targetPack || '—'}` })
      const origin = packDocs.find((doc) => doc.pack === item.fromPack)
      const originDeck = ensureDeck(origin, item.fromDeck || 'waterfall')
      originDeck.cards.push(item.card)
      continue
    }

    const destDoc = packDocs.find((doc) => doc.pack === dest.pack)
    const template = deckTemplate(packDocs, dest.deck || item.fromDeck)
    const destDeck = ensureDeck(destDoc, dest.deck || item.fromDeck, template)
    destDeck.cards.push(item.card)

    if (item.fromPack !== dest.pack || item.fromDeck !== dest.deck) {
      moves.push({
        title: item.card?.title || '(sem título)',
        from: `${item.fromPack}/${item.fromDeck}`,
        to: `${dest.pack}/${dest.deck}`,
      })
    }
  }

  return { ok: errors.length === 0, moves, errors }
}

function readAllDrinkPackFiles() {
  return Object.keys(PACK_FILES).map((pack) => {
    const json = readPackFile(pack)
    if (!json) return { pack, name: pack, decks: {} }
    return { ...json, pack: json.pack || pack }
  })
}

function writeAllDrinkPackFiles(packDocs) {
  return packDocs.filter((doc) => writeDrinkPackFile(doc)).length
}

function pruneEmptyDecks(packDocs) {
  for (const doc of packDocs) {
    const decks = doc.decks && typeof doc.decks === 'object' ? doc.decks : {}
    for (const [deckId, deck] of Object.entries(decks)) {
      if (deckId === 'comunidade') continue
      const n = Array.isArray(deck?.cards) ? deck.cards.length : 0
      if (n === 0) delete decks[deckId]
    }
  }
  return packDocs
}

const PACK_META = {
  base: { name: 'Essencial', premium: false },
  'noite-academica': { name: 'Noite Académica', premium: false },
  'sem-filtros': { name: 'Sem Filtros', premium: false },
  'casais-festa': { name: 'Casais na Festa', premium: false },
}

function readPackFile(pack) {
  const filePath = drinkJsonPath(pack)
  if (!filePath || !fs.existsSync(filePath)) return null
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

async function getOrCreatePack(pack) {
  let row = await DrinkPack.findOne({ pack })
  if (row) return row
  const json = readPackFile(pack) || {}
  const meta = PACK_META[pack] || { name: pack, premium: false }
  row = new DrinkPack({
    pack,
    name: json.name || meta.name,
    description: json.description || '',
    premium: json.premium != null ? Boolean(json.premium) : meta.premium,
    intensity: json.intensity || 'moderada',
    ageRating: json.ageRating || '18+',
    teaser: json.teaser || '',
    decks: json.decks && typeof json.decks === 'object' ? json.decks : {},
  })
  await row.save()
  return row
}

async function listDrinkAssignState() {
  const known = Object.keys(PACK_FILES)
  await Promise.all(known.map((pack) => getOrCreatePack(pack)))
  const docs = await DrinkPack.find({ pack: { $in: known } }).lean()
  return packSummary(docs)
}

async function assignDrinkCard({ fromPack, fromDeck, index, fingerprint, toPack }) {
  const docs = [await getOrCreatePack(fromPack), await getOrCreatePack(toPack)]
  const plain = docs.map((doc) => doc.toObject())
  const result = moveCardInPacks(plain, { fromPack, fromDeck, index, fingerprint, toPack })
  if (!result.ok) return result

  for (const updated of plain) {
    const row = docs.find((doc) => doc.pack === updated.pack)
    row.decks = updated.decks
    row.markModified('decks')
    await row.save()
    if (process.env.NODE_ENV !== 'production') writeDrinkPackFile(row.toObject())
  }

  const state = await listDrinkAssignState()
  return { ...result, ...state }
}

module.exports = {
  PACK_FILES,
  OFFICIAL_DECKS,
  cardFingerprint,
  flattenDrinkCards,
  moveCardInPacks,
  routeDrinkCards,
  readAllDrinkPackFiles,
  writeAllDrinkPackFiles,
  pruneEmptyDecks,
  listDrinkAssignState,
  assignDrinkCard,
}
