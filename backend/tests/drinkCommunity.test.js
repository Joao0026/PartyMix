const assert = require('node:assert/strict')
const test = require('node:test')
const { buildDrinkCardFromSubmission, emptyCommunityDrinkPack } = require('../lib/communityDrink')

test('approved drink community cards are stamped as pack community', () => {
  const card = buildDrinkCardFromSubmission({
    text: 'O mais alto bebe 1 gole.',
    cardType: 'desafios',
  })
  assert.equal(card.pack, 'community')
  assert.equal(card.type, 'desafio')
  assert.match(card.text, /alto/)
})

test('community drink pack document is the Beber Comunidade pack, not base', () => {
  const doc = emptyCommunityDrinkPack()
  assert.equal(doc.pack, 'community')
  assert.equal(doc.name, 'Comunidade')
  assert.ok(doc.decks.comunidade)
  assert.equal(doc.decks.comunidade.cards.length, 0)
})
