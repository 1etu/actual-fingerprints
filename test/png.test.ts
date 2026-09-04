import { test, expect } from 'vitest'
import { inflateSync } from 'node:zlib'
import { generate } from '../src/index'
import { toPNG, toDataURL } from '../src/node'

function crc(buf: Uint8Array, from: number, to: number) {
  let c = 0xffffffff
  for (let i = from; i < to; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  return (c ^ 0xffffffff) >>> 0
}

const print = generate('png')
const png = toPNG(print)
const view = new DataView(png.buffer, png.byteOffset, png.byteLength)

test('signature and header', () => {
  expect(Array.from(png.subarray(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
  expect(String.fromCharCode(...png.subarray(12, 16))).toBe('IHDR')
  expect(view.getUint32(16)).toBe(print.width)
  expect(view.getUint32(20)).toBe(print.height)
  expect(png[24]).toBe(8)
  expect(png[25]).toBe(0)
})

test('every chunk crc checks out', () => {
  let at = 8
  const types: string[] = []
  while (at < png.length) {
    const n = view.getUint32(at)
    types.push(String.fromCharCode(...png.subarray(at + 4, at + 8)))
    expect(view.getUint32(at + 8 + n)).toBe(crc(png, at + 4, at + 8 + n))
    at += 12 + n
  }
  expect(types).toEqual(['IHDR', 'pHYs', 'IDAT', 'IEND'])
})

test('idat decodes back to the pixels', () => {
  const n = view.getUint32(33 + 8 + 9 + 4)
  const raw = inflateSync(png.subarray(33 + 21 + 8, 33 + 21 + 8 + n))
  const rows = new Uint8Array((print.width + 1) * print.height)
  for (let y = 0; y < print.height; y++) rows.set(print.pixels.subarray(y * print.width, (y + 1) * print.width), y * (print.width + 1) + 1)
  expect(raw.equals(rows)).toBe(true)
})

test('data url', () => {
  expect(toDataURL(print)).toMatch(/^data:image\/png;base64,iVBOR/)
})
