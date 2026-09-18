const assert = require('node:assert/strict')
const test = require('node:test')
const fs = require('node:fs')
const path = require('node:path')

const {
  PACKAGE_ID,
  WRAPPER,
  AGE_RATING,
  ANDROID_PERMISSIONS,
  COOKIES_COLLECTED,
  playPackageId,
  playCertFingerprint,
  isPlayReady,
  playBlockers,
  assetLinksPayload,
  twaManifest,
  listingPt,
  contentRating,
  dataSafety,
  playPayload,
} = require('../lib/playPolicy')

const root = path.join(__dirname, '..', '..')
const SAMPLE_CERT = 'AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89'

test('Play wrapper is TWA, not Capacitor, and has no IAP or ads', () => {
  assert.equal(WRAPPER, 'twa')
  assert.equal(playPayload().inAppPurchases, false)
  assert.equal(playPayload().ads, false)
  assert.equal(playPayload().advertisingId, false)
  assert.deepEqual(ANDROID_PERMISSIONS, [])
  const frontendPkg = JSON.parse(fs.readFileSync(path.join(root, 'frontend/package.json'), 'utf8'))
  const deps = { ...frontendPkg.dependencies, ...frontendPkg.devDependencies }
  assert.equal(Object.keys(deps).some((k) => k.startsWith('@capacitor')), false)
})

test('package id is a valid Android applicationId', () => {
  assert.match(PACKAGE_ID, /^pt\.partymix\.app$/)
  assert.equal(playPackageId({ PLAY_PACKAGE_ID: 'not a package' }), PACKAGE_ID)
  assert.equal(playPackageId({ PLAY_PACKAGE_ID: 'pt.partymix.night' }), 'pt.partymix.night')
})

test('play-ready requires HTTPS public origin and a real signing cert', () => {
  assert.equal(isPlayReady({}), false)
  assert.ok(playBlockers({}).length >= 2)
  assert.equal(playCertFingerprint({ PLAY_SHA256_CERT: '00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00' }), '')
  assert.equal(playCertFingerprint({ PLAY_SHA256_CERT: 'deadbeef' }), '')
  const env = { PUBLIC_ORIGIN: 'https://partymix.example', PLAY_SHA256_CERT: SAMPLE_CERT }
  assert.equal(isPlayReady(env), true)
  assert.deepEqual(playBlockers(env), [])
  assert.equal(isPlayReady({ PUBLIC_ORIGIN: 'http://partymix.example', PLAY_SHA256_CERT: SAMPLE_CERT }), false)
})

test('assetlinks bind the Play package to handle_all_urls', () => {
  const empty = assetLinksPayload({})
  assert.equal(empty[0].target.package_name, PACKAGE_ID)
  assert.deepEqual(empty[0].target.sha256_cert_fingerprints, [])
  assert.deepEqual(empty[0].relation, ['delegate_permission/common.handle_all_urls'])
  const filled = assetLinksPayload({ PLAY_SHA256_CERT: SAMPLE_CERT })
  assert.deepEqual(filled[0].target.sha256_cert_fingerprints, [SAMPLE_CERT])
})

test('TWA manifest is portrait, minSdk 21, no push, start at /', () => {
  const twa = twaManifest({ PUBLIC_ORIGIN: 'https://partymix.example', PLAY_SHA256_CERT: SAMPLE_CERT })
  assert.equal(twa.packageId, PACKAGE_ID)
  assert.equal(twa.host, 'partymix.example')
  assert.equal(twa.startUrl, '/')
  assert.equal(twa.orientation, 'portrait')
  assert.equal(twa.minSdkVersion, 21)
  assert.equal(twa.enableNotifications, false)
  assert.equal(twa.fallbackType, 'customtabs')
})

test('store listing is pt-PT, 18+, and within Play length limits', () => {
  const listing = listingPt()
  assert.equal(listing.defaultLanguage, 'pt-PT')
  assert.ok(listing.title.length <= 50)
  assert.ok(listing.shortDescription.length <= 80)
  assert.ok(listing.fullDescription.length <= 4000)
  assert.equal(listing.contentRating, AGE_RATING)
  assert.equal(listing.inAppPurchases, false)
  assert.match(listing.fullDescription, /18\+/)
  assert.match(listing.fullDescription, /álcool/i)
  assert.match(listing.fullDescription, /denunciar/)
  assert.match(listing.fullDescription, /Sem compras/)
  assert.equal(listing.privacyPolicyPath, '/privacy')
})

test('IARC content rating is 18+ with alcohol, sex and UGC, not kids', () => {
  const rating = contentRating()
  assert.equal(rating.expectedRating, '18+')
  assert.equal(rating.alcohol, true)
  assert.equal(rating.sexualContent, true)
  assert.equal(rating.userGeneratedContent, true)
  assert.equal(rating.inAppPurchases, false)
  assert.equal(rating.designedForChildren, false)
  assert.equal(rating.gambling, false)
})

test('data safety lists real cookies and forbids ads/sale/AAID', () => {
  const safety = dataSafety()
  assert.equal(safety.sold, false)
  assert.equal(safety.advertised, false)
  assert.equal(safety.advertisingId, false)
  assert.equal(safety.encryptedInTransit, true)
  const names = safety.cookies.map((c) => c.name).sort()
  assert.deepEqual(names, COOKIES_COLLECTED.map((c) => c.name).sort())
  assert.ok(safety.dataTypes.some((t) => t.type.includes('Photos')))
  assert.ok(safety.dataTypes.some((t) => t.note.includes('room_created')))
  assert.equal(safety.dataTypes.every((t) => t.shared === false), true)
})

test('play payload privacy URL is HTTPS when PUBLIC_ORIGIN is set', () => {
  const play = playPayload({ PUBLIC_ORIGIN: 'https://partymix.example', PLAY_SHA256_CERT: SAMPLE_CERT })
  assert.equal(play.privacyUrl, 'https://partymix.example/privacy')
  assert.equal(play.ready, true)
  assert.equal(play.wrapper, 'twa')
})

test('committed Play files match policy and graphic exists', () => {
  const listingFile = JSON.parse(fs.readFileSync(path.join(root, 'play/listing.pt-PT.json'), 'utf8'))
  assert.deepEqual(listingFile, listingPt())
  const ratingFile = JSON.parse(fs.readFileSync(path.join(root, 'play/content-rating.json'), 'utf8'))
  assert.deepEqual(ratingFile, contentRating())
  const twaFile = JSON.parse(fs.readFileSync(path.join(root, 'play/twa-manifest.json'), 'utf8'))
  assert.equal(twaFile.packageId, PACKAGE_ID)
  assert.equal(twaFile.enableNotifications, false)
  const links = JSON.parse(fs.readFileSync(path.join(root, 'frontend/public/.well-known/assetlinks.json'), 'utf8'))
  assert.equal(links[0].target.package_name, PACKAGE_ID)
  const graphic = path.join(root, 'frontend/public/play-feature-graphic.png')
  assert.equal(fs.existsSync(graphic), true)
  assert.ok(fs.statSync(graphic).size > 400)
  const docs = fs.readFileSync(path.join(root, 'docs/play-store.md'), 'utf8')
  assert.match(docs, /Trusted Web Activity/)
  assert.match(docs, /PLAY_SHA256_CERT/)
  assert.doesNotMatch(docs, /Capacitor é o wrapper/)
})
