#!/usr/bin/env node
/** Remove legendas duplicadas ou muito parecidas entre packs MemeMix. */
const fs = require('fs')
const path = require('path')

const dir = path.join(__dirname, '../data/mememix')
const APPLY = process.argv.includes('--apply')
const SIM_THRESHOLD = 0.88

const priority = [
  'legendas-pack.json',
  'legendas-house-party-pack.json',
  'legendas-nostalgia-pack.json',
  'legendas-relacionamentos-pack.json',
  'legendas-trabalho-pack.json',
  'legendas-picante-pack.json',
  'legendas-br-pack.json',
  'legendascommunity-pack.json',
  'legendasamigos.json',
]

const files = fs.readdirSync(dir).filter((f) => f.startsWith('legendas') && f.endsWith('.json'))
const ordered = priority.filter((f) => files.includes(f)).concat(files.filter((f) => !priority.includes(f)))

function norm(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[«»"'`]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[.,!?…:;()]/g, '')
}

function compact(s) {
  return norm(s).replace(/\s/g, '')
}

function similarity(a, b) {
  const x = compact(a)
  const y = compact(b)
  if (!x || !y) return 0
  if (x === y) return 1
  if (x.includes(y) || y.includes(x)) {
    return Math.min(x.length, y.length) / Math.max(x.length, y.length)
  }
  const bg = (s) => {
    const out = new Map()
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2)
      out.set(g, (out.get(g) || 0) + 1)
    }
    return out
  }
  const A = bg(x)
  const B = bg(y)
  let inter = 0
  let total = 0
  for (const [g, c] of A) {
    inter += Math.min(c, B.get(g) || 0)
    total += c
  }
  for (const [, c] of B) total += c
  return (2 * inter) / total
}

const kept = new Map()
const exactDups = []
const similarDups = []
const packs = []

for (const file of ordered) {
  const full = path.join(dir, file)
  const json = JSON.parse(fs.readFileSync(full, 'utf8'))
  const legendas = (json.legendas || []).map((s) => String(s).trim()).filter(Boolean)
  const filtered = []

  for (const text of legendas) {
    const n = norm(text)
    if (!n) continue

    if (kept.has(n)) {
      exactDups.push({ text, from: file, keep: kept.get(n).file })
      continue
    }

    let similar = null
    for (const [, meta] of kept) {
      const sim = similarity(text, meta.text)
      if (sim >= SIM_THRESHOLD) {
        similar = { sim, keep: meta.file, other: meta.text }
        break
      }
    }
    if (similar) {
      similarDups.push({
        text,
        from: file,
        keep: similar.keep,
        similarTo: similar.other,
        sim: similar.sim,
      })
      continue
    }

    kept.set(n, { file, text })
    filtered.push(text)
  }

  packs.push({ file, full, json, before: legendas.length, after: filtered.length, filtered })
}

console.log(`Exact duplicates removed: ${exactDups.length}`)
exactDups.forEach((d) => {
  console.log(`  [${d.from}] -> keep [${d.keep}]: ${d.text.slice(0, 72)}`)
})

console.log(`\nSimilar (>= ${SIM_THRESHOLD}) removed: ${similarDups.length}`)
similarDups.forEach((d) => {
  console.log(`  [${d.from}] sim=${d.sim.toFixed(2)} keep [${d.keep}]`)
  console.log(`    - ${d.text.slice(0, 72)}`)
  console.log(`    + ${d.similarTo.slice(0, 72)}`)
})

console.log('\nPack counts:')
for (const p of packs) {
  console.log(`  ${p.file}: ${p.before} -> ${p.after} (-${p.before - p.after})`)
}

if (APPLY) {
  for (const p of packs) {
    p.json.legendas = p.filtered
    fs.writeFileSync(p.full, `${JSON.stringify(p.json, null, 2)}\n`, 'utf8')
  }
  console.log('\nApplied changes to JSON files.')
} else {
  console.log('\nDry run. Pass --apply to write files.')
}
