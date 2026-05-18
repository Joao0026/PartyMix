// Import PartyMix content packs from JSON without hardcoding card lists in code.
// Usage: node seeds/importPack.js ../data/example-pack.json

const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')
require('dotenv').config({ path: path.join(__dirname, '../.env') })

const { collectCards, collectChallenges } = require('../lib/packImport')

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/partymix'

async function insertUnique(Model, doc, counters) {
  if (!doc.text) {
    counters.invalid += 1
    return
  }

  const exists = await Model.findOne({ text: doc.text })
  if (exists) {
    counters.skipped += 1
    return
  }

  await new Model(doc).save()
  counters.inserted += 1
}

async function main() {
  const fileArg = process.argv[2]
  if (!fileArg) {
    console.error('Usage: node seeds/importPack.js <pack.json>')
    process.exit(1)
  }

  const filePath = path.resolve(process.cwd(), fileArg)
  const pack = JSON.parse(fs.readFileSync(filePath, 'utf8'))

  const cards = collectCards(pack)
  const challenges = collectChallenges(pack)
  const cardCounters = { inserted: 0, skipped: 0, invalid: 0 }
  const challengeCounters = { inserted: 0, skipped: 0, invalid: 0 }

  await mongoose.connect(MONGO_URI)
  const Card = require('../models/Card')
  const Challenge = require('../models/Challenge')
  for (const card of cards) await insertUnique(Card, card, cardCounters)
  for (const challenge of challenges) await insertUnique(Challenge, challenge, challengeCounters)
  await mongoose.disconnect()

  console.log(`Imported pack: ${pack.name || path.basename(filePath)}`)
  console.log(`Cards: ${cardCounters.inserted} inserted, ${cardCounters.skipped} skipped, ${cardCounters.invalid} invalid`)
  console.log(`Challenges: ${challengeCounters.inserted} inserted, ${challengeCounters.skipped} skipped, ${challengeCounters.invalid} invalid`)
}

main().catch(async (err) => {
  console.error('Import failed:', err.message)
  await mongoose.disconnect().catch(() => {})
  process.exit(1)
})
