const assert = require('node:assert/strict')
const test = require('node:test')
const { buildDrinkCardFromSubmission } = require('../lib/communityDrink')

test('approved drink community cards are stamped as pack community', () => {
  const card = buildDrinkCardFromSubmission({
    text: 'O mais alto bebe 1 gole.',
    cardType: 'desafios',
  })
  assert.equal(card.pack, 'community')
  assert.equal(card.type, 'desafio')
  assert.match(card.text, /alto/)
})
