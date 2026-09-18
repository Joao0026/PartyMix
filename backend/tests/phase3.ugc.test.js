const assert = require('node:assert/strict')
const test = require('node:test')
const fs = require('node:fs')
const path = require('node:path')

const {
  createReport,
  resetUgcStore,
  listReports,
  reviewReport,
  isBlockedFor,
  blockedIdsFor,
  hiddenIds,
  pendingCount,
} = require('../lib/ugcStore')
const {
  MM_MAX_BYTES,
  MM_MAX_MEMES_PER_PLAYER,
  MM_MAX_MEMES_PER_ROOM,
  MM_DEFAULT_MEMES_PER_PLAYER,
  clampMaxMemesPerPlayer,
  assertImageSize,
  hashReporter,
  legalPayload,
  publicOrigin,
  reconnectBannerCopy,
  isExpiredRoomMessage,
  REQUIRED_PRIVACY_NEEDLES,
  REQUIRED_TERMS_NEEDLES,
  filterVisibleItems,
  canCreateReport,
  MAX_REPORTS_PER_REPORTER_HOUR,
} = require('../lib/ugcPolicy')
const { isAdultPath } = require('../lib/agePolicy')
const { MAX_MEMES_PER_PLAYER, reportMemeInRoom, mmRooms, blockedMemeIdsFor } = require('../lib/mememixSocket')

const root = path.join(__dirname, '..', '..')

test.afterEach(() => {
  resetUgcStore()
  for (const key of Object.keys(mmRooms)) delete mmRooms[key]
})

test('community report blocks for the reporter and hides from their feed', () => {
  const a = createReport({ kind: 'community', targetId: 'abc123', reporterId: 'voter-one-aaaaaaaaaaaaaa', reason: 'spam' })
  assert.equal(a.ok, true)
  assert.equal(a.blocked, true)
  assert.equal(isBlockedFor('voter-one-aaaaaaaaaaaaaa', 'community', 'abc123'), true)
  assert.equal(isBlockedFor('voter-two-bbbbbbbbbbbbbb', 'community', 'abc123'), false)
  const visible = filterVisibleItems(
    [{ _id: 'abc123', text: 'x' }, { _id: 'other', text: 'y' }],
    { blockedIds: blockedIdsFor('voter-one-aaaaaaaaaaaaaa', 'community') }
  )
  assert.equal(visible.length, 1)
  assert.equal(visible[0]._id, 'other')
  assert.equal(pendingCount(), 1)
})

test('duplicate report from same reporter does not create a second queue item', () => {
  createReport({ kind: 'community', targetId: 'card-1', reporterId: 'same-reporter-aaaaaaaaaa', reason: 'hate' })
  const second = createReport({ kind: 'community', targetId: 'card-1', reporterId: 'same-reporter-aaaaaaaaaa', reason: 'spam' })
  assert.equal(second.ok, false)
  assert.equal(second.blocked, true)
  assert.equal(listReports({ status: 'pending' }).length, 1)
})

test('invalid UGC reason is rejected', () => {
  const bad = createReport({ kind: 'community', targetId: 'z', reporterId: 'r1', reason: 'not-a-reason' })
  assert.equal(bad.ok, false)
  assert.match(bad.error, /Motivo/)
})

test('admin hide and remove change queue status and hide the target', () => {
  const created = createReport({ kind: 'mememix', targetId: 'meme-9', reporterId: 'host:Ana', reason: 'illegal' })
  const hid = reviewReport(created.report.id, 'hide')
  assert.equal(hid.ok, true)
  assert.equal(hid.report.status, 'hidden')
  assert.equal(hiddenIds('mememix').has('meme-9'), true)
  const created2 = createReport({ kind: 'community', targetId: 'card-9', reporterId: 'host:Ana', reason: 'illegal' })
  const gone = reviewReport(created2.report.id, 'remove')
  assert.equal(gone.remove, true)
  assert.equal(gone.report.status, 'removed')
})

test('report rate limit caps per reporter per hour', () => {
  const existing = Array.from({ length: MAX_REPORTS_PER_REPORTER_HOUR }, (_, i) => ({
    reporterId: 'hot',
    createdAtMs: Date.now() - 1000 - i,
  }))
  const blocked = canCreateReport({ existingForReporter: existing, reporterId: 'hot' })
  assert.equal(blocked.ok, false)
})

test('public report never includes raw reporter id', () => {
  const created = createReport({ kind: 'community', targetId: 'n1', reporterId: 'secret-voter-id-zzzzzz', reason: 'other' })
  const json = JSON.stringify(created.report)
  assert.equal(json.includes('secret-voter-id-zzzzzz'), false)
  assert.equal(created.report.reporterHash, hashReporter('secret-voter-id-zzzzzz'))
})

test('MemeMix upload caps are 2MB / 12 per player / 36 per room', () => {
  assert.equal(MM_MAX_BYTES, 2 * 1024 * 1024)
  assert.equal(MM_MAX_MEMES_PER_PLAYER, 12)
  assert.equal(MM_MAX_MEMES_PER_ROOM, 36)
  assert.equal(MAX_MEMES_PER_PLAYER, 12)
  assert.equal(clampMaxMemesPerPlayer(50), 12)
  assert.equal(clampMaxMemesPerPlayer(0), 1)
  assert.equal(clampMaxMemesPerPlayer(undefined), MM_DEFAULT_MEMES_PER_PLAYER)
  assert.equal(assertImageSize(MM_MAX_BYTES + 1).ok, false)
  assert.equal(assertImageSize(100).ok, true)
})

test('in-game meme report hides the meme only for the reporter', () => {
  mmRooms.ABCD12 = {
    code: 'ABCD12',
    host: 'Ana',
    hostId: 's1',
    players: [{ id: 's1', name: 'Ana', disconnected: false }, { id: 's2', name: 'Bruno', disconnected: false }],
    memes: [{ id: 'm1', url: '/api/mememix/rooms/ABCD12/memes/m1.webp', uploadedBy: 'Bruno' }],
    blockedByPlayer: {},
    status: 'playing',
    currentMeme: { id: 'm1' },
  }
  const res = reportMemeInRoom('ABCD12', 'm1', {
    socketId: 's1',
    playerName: 'Ana',
    reason: 'harassment',
  })
  assert.equal(res.ok, true)
  assert.equal(isBlockedFor('ABCD12:Ana', 'mememix', 'm1'), true)
  assert.deepEqual(blockedMemeIdsFor(mmRooms.ABCD12, 'Ana'), ['m1'])
  assert.deepEqual(blockedMemeIdsFor(mmRooms.ABCD12, 'Bruno'), [])
  assert.equal(mmRooms.ABCD12.memes.length, 1)
})

test('legal payload requires HTTPS public origin and lists analytics + UGC', () => {
  assert.equal(publicOrigin({ PUBLIC_ORIGIN: 'http://evil.example' }), '')
  assert.equal(publicOrigin({ PUBLIC_ORIGIN: 'https://partymix.example' }), 'https://partymix.example')
  const legal = legalPayload({ PUBLIC_ORIGIN: 'https://partymix.example' })
  assert.equal(legal.ageRating, '18+')
  assert.ok(legal.analyticsEvents.includes('room_created'))
  assert.ok(legal.analyticsEvents.includes('ugc_reported'))
  assert.equal(legal.ugc.mmMaxBytes, MM_MAX_BYTES)
})

test('privacy and terms pages cover UGC, analytics, álcool, 18+ and HTTPS', () => {
  const privacy = fs.readFileSync(path.join(root, 'frontend/src/pages/Privacy.jsx'), 'utf8')
  const terms = fs.readFileSync(path.join(root, 'frontend/src/pages/Terms.jsx'), 'utf8')
  for (const needle of REQUIRED_PRIVACY_NEEDLES) {
    assert.ok(privacy.includes(needle), `privacy missing ${needle}`)
  }
  for (const needle of REQUIRED_TERMS_NEEDLES) {
    assert.ok(terms.includes(needle), `terms missing ${needle}`)
  }
})

test('AgeGate keeps /community family-accessible and adult modes 18+', () => {
  assert.equal(isAdultPath('/community'), false)
  assert.equal(isAdultPath('/privacy'), false)
  assert.equal(isAdultPath('/DrinkGame'), true)
  assert.equal(isAdultPath('/MemeMixOnline'), true)
  assert.equal(isAdultPath('/GameSetup', '?mode=family'), false)
  assert.equal(isAdultPath('/GameSetup', '?mode=couple'), true)
})

test('reconnect copy distinguishes expired room from a dropped socket', () => {
  const expired = reconnectBannerCopy({ expired: true })
  assert.match(expired.title, /já não existe/)
  assert.equal(expired.action, 'Voltar ao início')
  const drop = reconnectBannerCopy({ disconnected: true })
  assert.equal(drop.action, 'Tentar')
  assert.equal(isExpiredRoomMessage('Sala não encontrada'), true)
  assert.equal(isExpiredRoomMessage('Nome já em uso'), false)
  const ui = fs.readFileSync(path.join(root, 'frontend/src/utils/reconnectUi.js'), 'utf8')
  assert.match(ui, /Esta sala já não existe/)
})

test('PWA icons, manifest and index.html are store-safe', () => {
  const icon192 = path.join(root, 'frontend/public/icon-192.png')
  const icon512 = path.join(root, 'frontend/public/icon-512.png')
  assert.equal(fs.existsSync(icon192), true)
  assert.equal(fs.existsSync(icon512), true)
  assert.ok(fs.statSync(icon192).size > 80)
  assert.ok(fs.statSync(icon512).size > 200)
  const html = fs.readFileSync(path.join(root, 'frontend/index.html'), 'utf8')
  assert.equal(html.includes('dados eróticos'), false)
  assert.match(html, /18\+/)
  assert.match(html, /viewport-fit=cover/)
  assert.match(html, /icon-192\.png/)
  const manifest = fs.readFileSync(path.join(root, 'frontend/public/manifest.json'), 'utf8')
  assert.match(manifest, /icon-512\.png/)
  const css = fs.readFileSync(path.join(root, 'frontend/src/index.css'), 'utf8')
  assert.match(css, /focus-visible/)
  assert.match(css, /safe-area-inset/)
})
