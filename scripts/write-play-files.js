#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const {
  listingPt,
  contentRating,
  dataSafety,
  assetLinksPayload,
  twaManifest,
  playPayload,
} = require('../backend/lib/playPolicy')

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return (~c) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}

function pngRect(width, height, paint) {
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    const row = y * (width * 4 + 1)
    raw[row] = 0
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = paint(x, y, width, height)
      const o = row + 1 + x * 4
      raw[o] = r
      raw[o + 1] = g
      raw[o + 2] = b
      raw[o + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function featurePaint(x, y, width, height) {
  const t = x / width
  const r = Math.round(88 + 40 * t)
  const g = Math.round(28 + 12 * (1 - t))
  const b = Math.round(180 + 37 * t)
  const cx = width * 0.18
  const cy = height * 0.5
  const dx = (x - cx) / height
  const dy = (y - cy) / height
  const rad = Math.sqrt(dx * dx + dy * dy)
  if (rad < 0.22) return [255, 255, 255, 255]
  if (rad < 0.38) return [237, 233, 254, 255]
  return [r, g, b, 255]
}

const root = path.join(__dirname, '..')
const playDir = path.join(root, 'play')
const wellKnown = path.join(root, 'frontend', 'public', '.well-known')
fs.mkdirSync(playDir, { recursive: true })
fs.mkdirSync(wellKnown, { recursive: true })

const listing = listingPt()
fs.writeFileSync(path.join(playDir, 'listing.pt-PT.json'), `${JSON.stringify(listing, null, 2)}\n`)
fs.writeFileSync(path.join(playDir, 'content-rating.json'), `${JSON.stringify(contentRating(), null, 2)}\n`)
fs.writeFileSync(path.join(playDir, 'data-safety.json'), `${JSON.stringify(dataSafety(), null, 2)}\n`)
fs.writeFileSync(path.join(playDir, 'twa-manifest.json'), `${JSON.stringify(twaManifest(), null, 2)}\n`)
fs.writeFileSync(path.join(playDir, 'features.sample.json'), `${JSON.stringify(playPayload({
  PUBLIC_ORIGIN: 'https://partymix.example',
  PLAY_SHA256_CERT: 'AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89',
}), null, 2)}\n`)

const links = assetLinksPayload()
fs.writeFileSync(path.join(playDir, 'assetlinks.json'), `${JSON.stringify(links, null, 2)}\n`)
fs.writeFileSync(path.join(wellKnown, 'assetlinks.json'), `${JSON.stringify(links, null, 2)}\n`)

const graphic = pngRect(1024, 500, featurePaint)
fs.writeFileSync(path.join(root, 'frontend', 'public', 'play-feature-graphic.png'), graphic)
fs.writeFileSync(path.join(playDir, 'play-feature-graphic.png'), graphic)

console.log('wrote play listing, TWA manifest, assetlinks, feature graphic')
