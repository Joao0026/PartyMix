const assert = require('node:assert/strict')
const test = require('node:test')

const { cardFingerprint, flattenDrinkCards, moveCardInPacks, routeDrinkCards } = require('../lib/drinkPackAssign')

function samplePacks() {
  return [
    {
      pack: 'base',
      name: 'Essencial',
      premium: false,
      decks: {
        waterfall: {
          label: 'Beber',
          cards: [
            { type: 'beber', title: 'Bebe 2', text: 'Bebe 2 goles.' },
            { type: 'beber', title: 'Waterfall', text: 'Cascata!' },
          ],
        },
      },
    },
    {
      pack: 'noite-academica',
      name: 'Noite Académica',
      premium: true,
      decks: {},
    },
  ]
}

test('flattenDrinkCards counts cards per pack and skips comunidade', () => {
  const packs = samplePacks()
  packs[0].decks.comunidade = { cards: [{ text: 'skip' }] }
  const state = flattenDrinkCards(packs)
  assert.equal(state.packs.find((p) => p.pack === 'base').count, 2)
  assert.equal(state.cards.length, 2)
  assert.equal(state.deckCounts.waterfall, 2)
})

test('routeDrinkCards moves cards from pack/deck fields on the card', () => {
  const packs = samplePacks()
  packs[0].decks.waterfall.cards[0].pack = 'noite-academica'
  const result = routeDrinkCards(packs)
  assert.equal(result.ok, true)
  assert.equal(result.moves.length, 1)
  assert.equal(packs[0].decks.waterfall.cards.length, 1)
  assert.equal(packs[0].decks.waterfall.cards[0].title, 'Waterfall')
  assert.equal(packs[1].decks.waterfall.cards[0].title, 'Bebe 2')
  assert.equal(packs[1].decks.waterfall.cards[0].pack, 'noite-academica')
})

test('moveCardInPacks moves one card to the same internal deck of another pack', () => {
  const packs = samplePacks()
  const first = packs[0].decks.waterfall.cards[0]
  const result = moveCardInPacks(packs, {
    fromPack: 'base',
    fromDeck: 'waterfall',
    index: 0,
    fingerprint: cardFingerprint(first),
    toPack: 'noite-academica',
  })
  assert.equal(result.ok, true)
  assert.equal(packs[0].decks.waterfall.cards.length, 1)
  assert.equal(packs[0].decks.waterfall.cards[0].title, 'Waterfall')
  assert.equal(packs[1].decks.waterfall.cards.length, 1)
  assert.equal(packs[1].decks.waterfall.cards[0].title, first.title)
  assert.equal(packs[1].decks.waterfall.premium, false)
})
