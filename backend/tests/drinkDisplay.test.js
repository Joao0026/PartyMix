const assert = require('node:assert/strict')
const test = require('node:test')
const { putBoard, getBoard, _resetForTests } = require('../lib/drinkDisplay')

test('drink TV board stores the current card for a code', () => {
  _resetForTests()
  const saved = putBoard('ab12', {
    card: { type: 'sorte', title: 'Não bebo sozinho', text: 'Escolhe alguém.', emoji: '🍀' },
    readerName: 'Ana',
    turnCount: 1,
    rules: ['Quem disser sim bebe'],
  })
  assert.equal(saved.code, 'AB12')
  assert.equal(saved.readerName, 'Ana')
  assert.equal(saved.card.title, 'Não bebo sozinho')
  const got = getBoard('ab12')
  assert.equal(got.turnCount, 1)
  assert.equal(got.rules.length, 1)
})

test('unknown drink TV code is empty', () => {
  _resetForTests()
  assert.equal(getBoard('ZZZZ'), null)
})
