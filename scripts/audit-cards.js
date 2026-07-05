#!/usr/bin/env node
const path = require('path')

const args = process.argv.slice(2)
const includeDb = args.includes('--db') || args.includes('--both')
const semantic = args.includes('--semantic')

async function main() {
  const backendModules = path.join(__dirname, '../backend/node_modules')

  if (includeDb) {
    require(path.join(backendModules, 'dotenv')).config({
      path: path.join(__dirname, '../backend/.env'),
    })
    const mongoose = require(path.join(backendModules, 'mongoose'))
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/partymix'
    await mongoose.connect(uri)
  }

  const { auditContent } = require('../backend/lib/contentAudit')
  const report = await auditContent({
    dataRoot: path.join(__dirname, '../data'),
    includeFiles: true,
    includeDb,
    semantic,
  })

  const { stats } = report
  const sources = includeDb ? 'data/ + MongoDB' : 'data/'

  console.log(`PartyMix — auditoria de cartas (${sources})`)
  console.log('─'.repeat(48))
  console.log(`Ficheiros: ${stats.files} | Itens: ${stats.items}`)
  if (stats.bySource) {
    console.log(`Origem: ficheiros ${stats.bySource.file} | BD ${stats.bySource.db}`)
  }
  console.log(`Por modo: ${JSON.stringify(stats.byMode)}`)
  console.log(`Erros JSON: ${stats.parseErrors} | Validação: ${stats.validationErrors}`)
  console.log(`Dup. exactos: ${stats.exactDuplicateGroups} | Variantes drink: ${stats.drinkVariantPairs || 0}`)
  console.log(`Quase iguais: ${stats.nearDuplicatePairs} | Semânticos: ${stats.semanticPairs || 0}`)
  if (semantic && report.semanticSkipped) {
    console.log(`Semântico: ${report.semanticSkipped}`)
  }

  if (report.parseErrors?.length) {
    console.log('\n❌ Erros de parse:')
    for (const e of report.parseErrors) console.log(`  ${e.file}: ${e.error}`)
  }

  if (report.validationErrors?.length) {
    console.log('\n⚠️ Validação (primeiros 15):')
    for (const e of report.validationErrors.slice(0, 15)) {
      console.log(`  [${e.location || e.file}/${e.deck}] ${e.message}`)
    }
  }

  if (report.exactDuplicates?.length) {
    console.log('\n🔴 Duplicados exactos (primeiros 8):')
    for (const g of report.exactDuplicates.slice(0, 8)) {
      console.log(`  "${String(g.text).slice(0, 70)}…" ×${g.count}`)
      for (const loc of g.locations.slice(0, 4)) {
        console.log(`    · ${loc.location || loc.file} (${loc.deck}) [${loc.source}]`)
      }
    }
  }

  if (report.drinkVariants?.length) {
    console.log('\n🍺 Variantes drink — mesma mecânica (primeiros 8):')
    for (const p of report.drinkVariants.slice(0, 8)) {
      console.log(`  A: ${p.a.preview?.slice(0, 55)}…`)
      console.log(`     ${p.a.location} [${p.a.source}]`)
      console.log(`  B: ${p.b.preview?.slice(0, 55)}…`)
      console.log(`     ${p.b.location} [${p.b.source}]`)
    }
  }

  if (report.nearDuplicates?.length) {
    console.log('\n💡 Quase duplicados (primeiros 5):')
    for (const p of report.nearDuplicates.slice(0, 5)) {
      console.log(`  ${Math.round((p.ratio || 0) * 100)}% — ${p.a.preview?.slice(0, 45)}…`)
      console.log(`         ${p.b.location} [${p.b.source}]`)
    }
  }

  if (report.semanticDuplicates?.length) {
    console.log('\n🤖 Similares semânticos Groq (primeiros 5):')
    for (const p of report.semanticDuplicates.slice(0, 5)) {
      console.log(`  ${Math.round((p.ratio || 0) * 100)}% — ${p.a.preview?.slice(0, 45)}…`)
      console.log(`         ${p.b.location} [${p.b.source}]`)
    }
  }

  console.log('\n' + (report.ok ? '✅ Audit OK (exactos/validação)' : '❌ Audit com problemas bloqueantes'))
  console.log('   Variantes e similares são avisos — não bloqueiam import.')

  if (includeDb) {
    const mongoose = require(path.join(__dirname, '../backend/node_modules/mongoose'))
    await mongoose.disconnect()
  }
  process.exit(report.ok ? 0 : 1)
}

main().catch(async (e) => {
  console.error(e)
  try {
    const mongoose = require(path.join(__dirname, '../backend/node_modules/mongoose'))
    await mongoose.disconnect()
  } catch { /* ignore */ }
  process.exit(1)
})
