const fs = require('fs')
const path = require('path')
const file = path.join(__dirname, '../../frontend/src/pages/DrinkGame.jsx')
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/)
const start = lines.findIndex((l) => l.includes('DECK CATEGORIES'))
const end = lines.findIndex((l, i) => i > start && l.startsWith('const SECRET_AGENT'))
const insert = [
  "import { FALLBACK_DRINK_DECKS } from '../utils/drinkDecksFallback'",
  "import { parseCardPenalty, penaltyHint, formatGoles } from '../utils/penalties'",
  '',
]
const out = [...lines.slice(0, start), ...insert, ...lines.slice(end)]
fs.writeFileSync(file, out.join('\n'))
console.log('ok', end - start, 'lines removed')
