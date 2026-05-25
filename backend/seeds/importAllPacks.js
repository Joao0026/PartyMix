// Importa todos os JSON em data/**/*.json
// Usage: node seeds/importAllPacks.js

const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')
require('dotenv').config({ path: path.join(__dirname, '../.env') })

const { importPackObject } = require('../lib/packImport')

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/partymix'
const DATA_ROOT = path.join(__dirname, '../../data')

function walkJsonFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) walkJsonFiles(full, out)
    else if (name.endsWith('.json') && !full.includes(`${path.sep}_exemplo${path.sep}`)) out.push(full)
  }
  return out
}

async function main() {
  const files = walkJsonFiles(DATA_ROOT)
  if (!files.length) {
    console.error('Nenhum JSON em data/')
    process.exit(1)
  }

  await mongoose.connect(MONGO_URI)
  console.log(`📦 A importar ${files.length} ficheiro(s)...`)

  const summary = []
  for (const file of files.sort()) {
    const rel = path.relative(path.join(__dirname, '../..'), file)
    try {
      const pack = JSON.parse(fs.readFileSync(file, 'utf8'))
      const result = await importPackObject(pack)
      summary.push({ file: rel, ok: true, result })
      console.log(`✅ ${rel} — cartas +${result.cards.inserted} desafios +${result.challenges.inserted}${result.drinkPack ? ' drinkPack ok' : ''}`)
    } catch (e) {
      summary.push({ file: rel, ok: false, error: e.message })
      console.error(`❌ ${rel}:`, e.message)
    }
  }

  await mongoose.disconnect()
  const failed = summary.filter((s) => !s.ok).length
  console.log(failed ? `\n⚠️ ${failed} falha(s)` : '\n🎉 Todos os packs importados')
  if (failed) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
