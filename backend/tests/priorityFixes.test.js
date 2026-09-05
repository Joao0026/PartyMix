const assert = require('node:assert/strict')
const test = require('node:test')

const { normalizeVoterId, unvoteUpdate, voteUpdate } = require('../lib/communityVotes')
const { getLocalLegendaPacks, getLocalLegendas } = require('../lib/localMememix')

const VOTER_ID = '12345678-1234-4123-8123-123456789abc'

test('community voter ids are validated and accepted from compatible inputs', () => {
  assert.equal(normalizeVoterId({ voterId: VOTER_ID }), VOTER_ID)
  assert.equal(normalizeVoterId({ voter_id: VOTER_ID }), VOTER_ID)
  assert.equal(normalizeVoterId({}, { 'x-voter-id': VOTER_ID }), VOTER_ID)
  assert.throws(() => normalizeVoterId({ voterId: 'short' }), /voterId is invalid/)
})

test('community vote updates are identity-scoped and idempotency-ready', () => {
  assert.deepEqual(voteUpdate(VOTER_ID), {
    filter: { voters: { $ne: VOTER_ID } },
    update: { $addToSet: { voters: VOTER_ID }, $inc: { votes: 1 } },
  })
  assert.deepEqual(unvoteUpdate(VOTER_ID), {
    filter: { voters: VOTER_ID, votes: { $gt: 0 } },
    update: { $pull: { voters: VOTER_ID }, $inc: { votes: -1 } },
  })
})

test('MemeMix local fallback exposes real base and selected-pack captions', () => {
  const packs = getLocalLegendaPacks({ includeCommunity: false })
  assert.ok(packs.some((pack) => pack.pack === 'base' && pack.count >= 10))
  assert.ok(packs.some((pack) => pack.pack === 'amigos' && pack.name.toLowerCase().includes('malta') && pack.count >= 40))
  assert.ok(!packs.some((pack) => pack.pack === 'community'))

  const base = getLocalLegendas({ packs: ['base'], includeCommunity: false })
  const houseParty = getLocalLegendas({ packs: ['house-party'], includeCommunity: false })
  const amigos = getLocalLegendas({ packs: ['amigos'], includeCommunity: false })
  const community = getLocalLegendas({ packs: ['community'], includeCommunity: true })
  assert.ok(base.length >= 10)
  assert.ok(houseParty.length >= 10)
  assert.ok(amigos.length >= 40)
  assert.ok(amigos.every((caption) => !community.includes(caption)))
  assert.notDeepEqual(base, houseParty)
})
