#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const dir = path.join(__dirname, '../data/mememix')
const files = fs.readdirSync(dir).filter((f) => f.startsWith('legendas') && f.endsWith('.json'))

function norm(s) {
  return String(s || '').trim().toLowerCase().replace(/[«»"'`]/g, '').replace(/\s+/g, ' ')
}

function skeleton(s) {
  return norm(s)
    .replace(/\b(eu|pov|quando|a cara de quem|aquele|ninguém|absolutamente|o|a|os|as|de|da|do|dos|das|em|no|na|nos|nas|que|e|é|ser|um|uma|teu|tua|meu|minha)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function similarity(a, b) {
  const x = norm(a).replace(/\s/g, '')
  const y = norm(b).replace(/\s/g, '')
  if (!x || !y) return 0
  if (x === y) return 1
  const bg = (s) => {
    const out = new Map()
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2)
      out.set(g, (out.get(g) || 0) + 1)
    }
    return out
  }
  const A = bg(x), B = bg(y)
  let inter = 0, total = 0
  for (const [g, c] of A) { inter += Math.min(c, B.get(g) || 0); total += c }
  for (const [, c] of B) total += c
  return (2 * inter) / total
}

const all = []
for (const file of files) {
  const json = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
  for (const text of json.legendas || []) {
    const t = String(text).trim()
    if (t) all.push({ file, text: t })
  }
}

console.log('Total legendas:', all.length)

// exact cross-pack
const byNorm = new Map()
const exact = []
for (const item of all) {
  const n = norm(item.text)
  if (byNorm.has(n)) exact.push([byNorm.get(n), item])
  else byNorm.set(n, item)
}
console.log('Exact duplicates:', exact.length)
exact.forEach(([a, b]) => console.log(`  [${a.file}] vs [${b.file}]\n    ${a.text}\n    ${b.text}`))

// similar pairs >= 0.75
const pairs = []
for (let i = 0; i < all.length; i++) {
  for (let j = i + 1; j < all.length; j++) {
    if (all[i].file === all[j].file) continue
    const sim = similarity(all[i].text, all[j].text)
    if (sim >= 0.75) pairs.push({ sim, a: all[i], b: all[j] })
  }
}
pairs.sort((x, y) => y.sim - x.sim)
console.log('\nSimilar pairs (>=0.75, cross-pack):', pairs.length)
pairs.slice(0, 40).forEach(({ sim, a, b }) => {
  console.log(`  sim=${sim.toFixed(2)} [${a.file}] vs [${b.file}]`)
  console.log(`    A: ${a.text}`)
  console.log(`    B: ${b.text}`)
})

// same skeleton (template)
const bySk = new Map()
const skGroups = []
for (const item of all) {
  const sk = skeleton(item.text)
  if (sk.length < 8) continue
  if (!bySk.has(sk)) bySk.set(sk, [])
  bySk.get(sk).push(item)
}
for (const [sk, items] of bySk) {
  if (items.length < 2) continue
  const filesSet = new Set(items.map((i) => i.file))
  if (filesSet.size < 2) continue
  skGroups.push(items)
}
console.log('\nSame skeleton across packs:', skGroups.length)
skGroups.slice(0, 20).forEach((items) => {
  console.log('  ---')
  items.forEach((i) => console.log(`  [${i.file}] ${i.text}`))
})

// substring containment cross-pack
let sub = 0
for (let i = 0; i < all.length; i++) {
  for (let j = i + 1; j < all.length; j++) {
    if (all[i].file === all[j].file) continue
    const a = norm(all[i].text)
    const b = norm(all[j].text)
    if (a.length > 15 && b.length > 15 && (a.includes(b) || b.includes(a))) {
      sub++
      console.log(`\n[SUB] [${all[i].file}] vs [${all[j].file}]`)
      console.log(`  ${all[i].text}`)
      console.log(`  ${all[j].text}`)
    }
  }
}
console.log('\nSubstring overlaps cross-pack:', sub)
