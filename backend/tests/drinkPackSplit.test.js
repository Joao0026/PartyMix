const assert = require('node:assert/strict')
const test = require('node:test')

const {
  PACK_TARGETS,
  PACK_QUOTAS,
  coupleScore,
  assignCardsToPacks,
  splitSummary,
} = require('../lib/drinkPackSplit')

const STOCK = {
  waterfall: 99, eununca: 76, regras: 40, caos: 49, especiais: 54,
  desafios: 84, poder: 81, picante: 29, preferias: 53, provavel: 103,
  bluff: 27, maldicao: 37, historia: 48, cadeia: 37,
}

function especialType(i) {
  if (i < 23) return 'impostor'
  if (i < 38) return 'miniboss'
  return 'alliance'
}

function makeStock() {
  const items = []
  for (const [deckId, n] of Object.entries(STOCK)) {
    for (let i = 0; i < n; i++) {
      const couple = i % 7 === 0
      const group = i % 3 === 0
      items.push({
        deckId,
        card: {
          type: deckId === 'especiais' ? especialType(i) : 'desafio',
          title: `${deckId}-${i}`,
          text: couple ? 'casal namorado beijo' : group ? 'todos na mesa sentido horário' : 'bebe 1 golo',
          correctQuestion: deckId === 'especiais' ? `q${i}` : undefined,
          wrongQuestion: deckId === 'especiais' ? `w${i}` : undefined,
        },
      })
    }
  }
  return items
}

test('coupleScore ranks couple text above generic drinks', () => {
  const couple = coupleScore({ type: 'desafio', text: 'O casal dá um beijo ou bebe.' }, 'desafios')
  const generic = coupleScore({ type: 'beber', text: 'O mais alto bebe 2 golos.' }, 'waterfall')
  assert.ok(couple > generic)
})

test('assignCardsToPacks hits the 280/230/200/107 split on full stock', () => {
  const assigned = assignCardsToPacks(makeStock())
  const { total, byPack } = splitSummary(assigned)
  assert.equal(total, 817)
  assert.equal(byPack['noite-academica'], PACK_TARGETS['noite-academica'])
  assert.equal(byPack.base, PACK_TARGETS.base)
  assert.equal(byPack['sem-filtros'], PACK_TARGETS['sem-filtros'])
  assert.equal(byPack['casais-festa'], PACK_TARGETS['casais-festa'])
})

test('picante quota: 23 casais + 6 sem-filtros + 0 essencial', () => {
  const assigned = assignCardsToPacks(makeStock()).filter((item) => item.deckId === 'picante')
  const { byPack } = splitSummary(assigned)
  assert.equal(byPack['casais-festa'], PACK_QUOTAS['casais-festa'].picante)
  assert.equal(byPack['sem-filtros'], PACK_QUOTAS['sem-filtros'].picante)
  assert.equal(byPack.base || 0, 0)
})

test('stamped cards keep destination pack and session fields', () => {
  const assigned = assignCardsToPacks(makeStock())
  for (const item of assigned) {
    assert.equal(item.card.pack, item.pack)
    assert.ok([1, 2, 3].includes(item.card.act))
    assert.ok(item.card.intensity >= 1 && item.card.intensity <= 5)
    assert.ok(['common', 'rare'].includes(item.card.rarity))
  }
})
