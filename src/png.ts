import { deflateSync } from 'node:zlib'
import type { Fingerprint } from './generate'

const table = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  table[n] = c >>> 0
}

function u32(out: Uint8Array, at: number, v: number) {
  out[at] = v >>> 24
  out[at + 1] = v >>> 16
  out[at + 2] = v >>> 8
  out[at + 3] = v
}

function chunk(out: Uint8Array, at: number, type: string, data: Uint8Array) {
  const n = data.length
  u32(out, at, n)
  for (let i = 0; i < 4; i++) out[at + 4 + i] = type.charCodeAt(i)
  out.set(data, at + 8)
  let c = 0xffffffff
  for (let i = at + 4, end = at + 8 + n; i < end; i++) c = table[(c ^ out[i]) & 255] ^ (c >>> 8)
  u32(out, at + 8 + n, (c ^ 0xffffffff) >>> 0)
  return at + 12 + n
}

export function toPNG(p: Fingerprint) {
  const w = p.width, h = p.height
  const raw = new Uint8Array((w + 1) * h)
  for (let y = 0; y < h; y++) raw.set(p.pixels.subarray(y * w, y * w + w), y * (w + 1) + 1)
  const idat = deflateSync(raw)

  const ihdr = new Uint8Array(13)
  u32(ihdr, 0, w)
  u32(ihdr, 4, h)
  ihdr[8] = 8
  const phys = new Uint8Array(9)
  u32(phys, 0, 19685)
  u32(phys, 4, 19685)
  phys[8] = 1

  const out = new Uint8Array(8 + 25 + 21 + 12 + idat.length + 12)
  out.set([137, 80, 78, 71, 13, 10, 26, 10])
  let at = chunk(out, 8, 'IHDR', ihdr)
  at = chunk(out, at, 'pHYs', phys)
  at = chunk(out, at, 'IDAT', idat)
  chunk(out, at, 'IEND', new Uint8Array(0))
  return out
}

export const toDataURL = (p: Fingerprint) => 'data:image/png;base64,' + Buffer.from(toPNG(p)).toString('base64')
