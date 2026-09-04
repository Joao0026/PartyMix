/**
 * Carimba pack / intensity / act / rarity e move as cartas para os 4 ficheiros.
 * Uso: node backend/scripts/assignDrinkPacks.js
 */
const {
  readAllDrinkPackFiles,
  writeAllDrinkPackFiles,
  routeDrinkCards,
  pruneEmptyDecks,
} = require('../lib/drinkPackAssign')
const { applyDrinkPackSplit, splitSummary, PACK_TARGETS } = require('../lib/drinkPackSplit')

const packs = readAllDrinkPackFiles()
const assigned = applyDrinkPackSplit(packs)
const routed = routeDrinkCards(packs)
pruneEmptyDecks(packs)
for (const doc of packs) {
  for (const deck of Object.values(doc.decks || {})) {
    if (deck && typeof deck === 'object') deck.premium = false
  }
}
writeAllDrinkPackFiles(packs)

const summary = splitSummary(assigned)
console.log(`Cartas: ${summary.total}`)
for (const pack of ['noite-academica', 'base', 'sem-filtros', 'casais-festa']) {
  const n = summary.byPack[pack] || 0
  const target = PACK_TARGETS[pack]
  console.log(`  ${pack}: ${n} (alvo ${target})`)
}

if (routed.errors.length) {
  console.error(`\n${routed.errors.length} erro(s):`)
  for (const err of routed.errors) console.error(`  ${err.title}: ${err.error}`)
  process.exitCode = 1
} else {
  console.log(`\nMovidas ${routed.moves.length} carta(s) de ficheiro.`)
}

async function syncMongo() {
  const path = require('path')
  const mongoose = require('mongoose')
  require('dotenv').config({ path: path.join(__dirname, '../.env') })
  const DrinkPack = require('../models/DrinkPack')
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.log('Sem MONGODB_URI — corre npm run seed:packs à mão.')
    return
  }
  await mongoose.connect(uri)
  for (const doc of packs) {
    await DrinkPack.updateOne(
      { pack: doc.pack },
      {
        $set: {
          name: doc.name || doc.pack,
          description: doc.description || '',
          premium: Boolean(doc.premium),
          intensity: doc.intensity || 'moderada',
          ageRating: doc.ageRating || '18+',
          teaser: doc.teaser || '',
          decks: doc.decks || {},
        },
      },
      { upsert: true }
    )
    console.log(`Mongo: ${doc.pack} actualizado`)
  }
  await mongoose.disconnect()
}

syncMongo().catch((err) => {
  console.error('Mongo não actualizado:', err.message)
  console.log('Corre npm run seed:packs quando a base estiver no ar.')
})

