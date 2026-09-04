/**
 * Nas cartas que queres mudar de pack, acrescenta só:
 *   "pack": "noite-academica"
 * (o baralho fica o mesmo em que a carta já está)
 *
 * Packs: base | noite-academica | sem-filtros | casais-festa
 *
 * Uso: npm run drink:distribute
 */
const {
  readAllDrinkPackFiles,
  writeAllDrinkPackFiles,
  routeDrinkCards,
} = require('../lib/drinkPackAssign')

const packs = readAllDrinkPackFiles()
const result = routeDrinkCards(packs)
writeAllDrinkPackFiles(packs)

if (result.moves.length) {
  console.log(`Movidas ${result.moves.length} carta(s):`)
  for (const move of result.moves) {
    console.log(`  ${move.title}  ${move.from} → ${move.to}`)
  }
} else {
  console.log('Nenhuma carta precisava de ser movida.')
}

if (result.errors.length) {
  console.error(`\n${result.errors.length} erro(s):`)
  for (const err of result.errors) {
    console.error(`  ${err.title}: ${err.error}`)
  }
  process.exitCode = 1
} else {
  console.log('\nSeguinte: npm run seed:packs')
}
