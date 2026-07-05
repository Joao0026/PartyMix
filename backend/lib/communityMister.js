const Card = require('../models/Card')

function clean(value, max = 80) {
  return String(value ?? '').replace(/<[^>]*>/g, '').trim().slice(0, max)
}

function pairKey(civil, undercover) {
  return `${clean(civil).toLowerCase()}|${clean(undercover).toLowerCase()}`
}

async function appendMisterCommunityPair(sub) {
  const civil = clean(sub.civilWord, 80)
  const undercover = clean(sub.undercoverWord, 80)
  if (!civil || !undercover) throw new Error('Par Mister White: faltam palavra civil e undercover')

  const key = pairKey(civil, undercover)
  const existing = await Card.find({ mode_type: 'mister', pack: 'community' }).lean()
  const dup = existing.some((r) => pairKey(r.civil_word, r.undercover_word) === key)
  if (dup) return { duplicate: true }

  const linked = await new Card({
    text: `${civil} · ${undercover}`,
    category: 'geral',
    mode_type: 'mister',
    pack: 'community',
    civil_word: civil,
    undercover_word: undercover,
  }).save()

  return { duplicate: false, card: linked }
}

async function appendMememixCommunityLegenda(sub) {
  const text = clean(sub.text, 300)
  if (!text) throw new Error('Legenda MemeMix: texto em falta')

  const dup = await Card.findOne({ mode_type: 'mememix', category: 'legenda', pack: 'community', text })
  if (dup) return { duplicate: true, card: dup }

  const linked = await new Card({
    text,
    category: 'legenda',
    mode_type: 'mememix',
    pack: 'community',
  }).save()

  return { duplicate: false, card: linked }
}

module.exports = { appendMisterCommunityPair, appendMememixCommunityLegenda, pairKey }
