const assert = require('node:assert/strict')
const test = require('node:test')

function shouldSpinRoulette({ drawnCount = 0, recentTypes = [], random = Math.random } = {}) {
  if (drawnCount < 2) return false
  if (recentTypes.slice(-10).includes('roleta')) return false
  return random() < 1 / 13
}

test('roulette stays quiet on the first two cards', () => {
  assert.equal(shouldSpinRoulette({ drawnCount: 0, random: () => 0 }), false)
  assert.equal(shouldSpinRoulette({ drawnCount: 1, random: () => 0 }), false)
  assert.equal(shouldSpinRoulette({ drawnCount: 2, random: () => 0 }), true)
})

test('roulette does not repeat immediately', () => {
  assert.equal(shouldSpinRoulette({ drawnCount: 5, recentTypes: ['beber', 'roleta'], random: () => 0 }), false)
})
