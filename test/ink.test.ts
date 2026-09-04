import { test, expect } from 'vitest'
import { generate, ink } from '../src/index'

function fnv(a: Uint8Array) {
  let h = 0x811c9dc5
  for (let i = 0; i < a.length; i++) h = Math.imul(h ^ a[i], 0x01000193)
  return h >>> 0
}

const clean = generate('inked')
const print = ink(clean)

test('same seed, same ink', () => {
  expect(print.pixels).toEqual(ink(generate('inked')).pixels)
  expect(print.pixels).not.toEqual(clean.pixels)
  expect(fnv(print.pixels)).toBe(1026559824)
})

test('keeps everything but the pixels', () => {
  expect(print.width).toBe(clean.width)
  expect(print.height).toBe(clean.height)
  expect(print.minutiae).toBe(clean.minutiae)
  expect(print.mask).toBe(clean.mask)
  expect(print.pixels.length).toBe(clean.pixels.length)
})

test('ridges stay dark and paper stays light', () => {
  let ridge = 0, paper = 0, nr = 0, np = 0
  for (let i = 0; i < clean.pixels.length; i++) {
    if (!clean.mask[i]) {
      paper += print.pixels[i]
      np++
    } else if (clean.pixels[i] < 128) {
      ridge += print.pixels[i]
      nr++
    }
  }
  expect(ridge / nr).toBeLessThan(120)
  expect(paper / np).toBeGreaterThan(230)
})
