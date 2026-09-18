#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

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

function png(size, paint) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1)
    raw[row] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = paint(x, y, size)
      const o = row + 1 + x * 4
      raw[o] = r
      raw[o + 1] = g
      raw[o + 2] = b
      raw[o + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const body = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
  return body
}

function iconPaint(x, y, size) {
  const cx = (size - 1) / 2
  const cy = (size - 1) / 2
  const dx = x - cx
  const dy = y - cy
  const r = Math.sqrt(dx * dx + dy * dy) / size
  const bg = [109, 40, 217, 255]
  if (r > 0.48) return bg
  if (r < 0.16) return [255, 255, 255, 255]
  const smileY = dy / size
  const smileX = dx / size
  if (smileY > 0.06 && smileY < 0.18 && Math.abs(smileX) < 0.18 && Math.abs(smileX * smileX * 3 + 0.08 - smileY) < 0.03) {
    return [255, 255, 255, 255]
  }
  if (r < 0.34) return [237, 233, 254, 255]
  return bg
}

const dir = path.join(__dirname, '..', 'frontend', 'public')
fs.mkdirSync(dir, { recursive: true })
fs.writeFileSync(path.join(dir, 'icon-192.png'), png(192, iconPaint))
fs.writeFileSync(path.join(dir, 'icon-512.png'), png(512, iconPaint))
console.log('wrote icon-192.png and icon-512.png')
