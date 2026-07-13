/**
 * Correções mínimas PT-PT em data/drink/decks.json — mantém o texto do autor.
 * Só: goles em falta no fim de frase, «Quem já bebe» → «Quem já fez, bebe».
 * NÃO altera BRINDEEE (inside joke).
 * Run: node scripts/fix-drink-decks-pt.js
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FILE = path.join(__dirname, '../data/drink/decks.json')

function golesWord(n) {
  const num = parseInt(n, 10)
  return num === 1 ? 'gole' : 'goles'
}

/** Apenas gramática e typos — não reescreve frases. */
function fixText(text) {
  if (!text || typeof text !== 'string') return text
  let t = text

  t = t.replace(/Quem já bebe (\d+)(?!\s*gole)/g, (_, n) => `Quem já fez, bebe ${n} ${golesWord(n)}`)

  t = t.replace(/\bbebe mais (\d+)(?!\s*gole)(?=[.!?]|$)/g, (_, n) => `bebe mais ${n} ${golesWord(n)}`)
  t = t.replace(/\bbebe (\d+)(?!\s*gole)(?=[.!?]|$)/g, (_, n) => `bebe ${n} ${golesWord(n)}`)
  t = t.replace(/\bbebem (\d+)(?!\s*gole)(?=[.!?]|$)/g, (_, n) => `bebem ${n} ${golesWord(n)}`)
  t = t.replace(/\bdistribui (\d+)(?!\s*gole)(?=[.!?]|$)/g, (_, n) => `distribui ${n} ${golesWord(n)}`)
  t = t.replace(/\bdistribuem (\d+)(?!\s*gole)(?=[.!?]|$)/g, (_, n) => `distribuem ${n} ${golesWord(n)}`)

  // «bebe 2!» no fim (Eu nunca já tratado acima; outros casos)
  t = t.replace(/\bbebe (\d+)(?!\s*gole)(?=!)/g, (_, n) => `bebe ${n} ${golesWord(n)}`)

  t = t.replace(/\bgoles goles\b/g, 'goles')

  return t
}

const data = JSON.parse(fs.readFileSync(FILE, 'utf8'))
let changed = 0

for (const deck of Object.values(data.decks)) {
  for (const card of deck.cards) {
    if (card.text) {
      const next = fixText(card.text)
      if (next !== card.text) {
        card.text = next
        changed++
      }
    }
  }
}

fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n', 'utf8')
console.log(`Gramática mínima: ${changed} textos alterados`)
