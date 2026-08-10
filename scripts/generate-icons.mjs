#!/usr/bin/env node
/**
 * Generates the PWA PNG icons from a single vector "notebook" motif — no image
 * dependencies. Produces maskable + regular icons and the Apple touch icon so
 * the app installs cleanly on Android and iOS home screens and is precached
 * for offline launch.
 *
 *   node scripts/generate-icons.mjs
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public', 'icons')
const publicDir = join(__dirname, '..', 'public')
mkdirSync(outDir, { recursive: true })

// Brand palette (matches src/index.css tokens).
const INK = [28, 25, 23]
const CREAM = [250, 248, 245]
const ACCENT = [181, 101, 74]
const FAINT = [168, 162, 158]

function roundedRectContains(px, py, x0, y0, x1, y1, r) {
  if (px < x0 || px > x1 || py < y0 || py > y1) return false
  const ix0 = x0 + r
  const ix1 = x1 - r
  const iy0 = y0 + r
  const iy1 = y1 - r
  const cx = Math.max(ix0, Math.min(px, ix1))
  const cy = Math.max(iy0, Math.min(py, iy1))
  const dx = px - cx
  const dy = py - cy
  return dx * dx + dy * dy <= r * r
}

function rect(px, py, x0, y0, x1, y1) {
  return px >= x0 && px <= x1 && py >= y0 && py <= y1
}

/** Compute the RGBA for a normalized pixel (0..1). */
function pixel(nx, ny, { fullBleed, motifScale }) {
  let color = null
  let alpha = 0

  // Background.
  if (fullBleed) {
    color = INK
    alpha = 255
  } else if (roundedRectContains(nx, ny, 0.02, 0.02, 0.98, 0.98, 0.22)) {
    color = INK
    alpha = 255
  }

  // Motif mapped into a centered box scaled by motifScale.
  const mx = (nx - 0.5) / motifScale + 0.5
  const my = (ny - 0.5) / motifScale + 0.5
  if (mx >= 0 && mx <= 1 && my >= 0 && my <= 1) {
    // Page.
    if (roundedRectContains(mx, my, 0.28, 0.2, 0.72, 0.8, 0.05)) {
      color = CREAM
      alpha = 255
    }
    // Text lines (over the page).
    const onLine =
      (rect(mx, my, 0.34, 0.35, 0.66, 0.375)) ||
      (rect(mx, my, 0.34, 0.47, 0.66, 0.495)) ||
      (rect(mx, my, 0.34, 0.59, 0.56, 0.615))
    if (onLine && roundedRectContains(mx, my, 0.28, 0.2, 0.72, 0.8, 0.05)) {
      color = FAINT
      alpha = 255
    }
    // Bookmark ribbon (accent), on top.
    if (rect(mx, my, 0.58, 0.2, 0.66, 0.44)) {
      // V-notch at the bottom.
      const notch = my > 0.4 && Math.abs(mx - 0.62) < (0.44 - my) * 2
      if (!notch) {
        color = ACCENT
        alpha = 255
      }
    }
  }

  if (!color) return [0, 0, 0, 0]
  return [color[0], color[1], color[2], alpha]
}

function render(size, opts) {
  const data = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel((x + 0.5) / size, (y + 0.5) / size, opts)
      const i = (y * size + x) * 4
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = a
    }
  }
  return data
}

// --- Minimal PNG encoder (RGBA, 8-bit) ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const body = Buffer.concat([typeBuf, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([len, body, crc])
}
function encodePng(size, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  // Filter type 0 per scanline.
  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const idat = deflateSync(raw)
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function write(path, size, opts) {
  const rgba = render(size, opts)
  writeFileSync(path, encodePng(size, rgba))
  console.log('wrote', path)
}

write(join(outDir, 'icon-192.png'), 192, { fullBleed: false, motifScale: 1 })
write(join(outDir, 'icon-512.png'), 512, { fullBleed: false, motifScale: 1 })
// Maskable: full-bleed background + motif shrunk into the safe zone.
write(join(outDir, 'maskable-512.png'), 512, { fullBleed: true, motifScale: 0.7 })
// Apple touch icon: full-bleed (iOS applies its own rounded mask).
write(join(publicDir, 'apple-touch-icon.png'), 180, { fullBleed: true, motifScale: 0.82 })

console.log('done')
