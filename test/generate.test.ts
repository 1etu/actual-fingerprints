import { test, expect } from 'vitest'
import { generate } from '../src/index'

function fnv(a: Uint8Array) {
  let h = 0x811c9dc5
  for (let i = 0; i < a.length; i++) h = Math.imul(h ^ a[i], 0x01000193)
  return h >>> 0
}

test('same seed, same pixels', () => {
  const a = generate('alice'), b = generate('alice')
  expect(a.pixels).toEqual(b.pixels)
  expect(a.minutiae).toEqual(b.minutiae)
  expect(a.pattern).toBe(b.pattern)
  expect(generate('bob').pixels).not.toEqual(a.pixels)
})

test('number seeds are their string', () => {
  expect(generate(42).pixels).toEqual(generate('42').pixels)
})

test('golden', () => {
  expect(fnv(generate('alice').pixels)).toBe(2075499559)
  expect(fnv(generate('bob').pixels)).toBe(159287342)
  expect(fnv(generate(7).pixels)).toBe(3120341194)
  expect(fnv(generate('x', { pattern: 'whorl' }).pixels)).toBe(3221788688)
  expect(fnv(generate('x', { pattern: 'arch' }).pixels)).toBe(3555175405)
  expect(fnv(generate('small', { width: 160, height: 200 }).pixels)).toBe(3969929040)
})

test('size and mask come out as asked', () => {
  const p = generate('size', { width: 200, height: 260 })
  expect(p.width).toBe(200)
  expect(p.height).toBe(260)
  expect(p.pixels.length).toBe(200 * 260)
  expect(p.mask.length).toBe(200 * 260)
  let inside = 0
  for (let i = 0; i < p.mask.length; i++) inside += p.mask[i]
  expect(inside / p.mask.length).toBeGreaterThan(0.5)
  expect(inside / p.mask.length).toBeLessThan(0.8)
})

test('forced pattern', () => {
  expect(generate('x', { pattern: 'whorl' }).pattern).toBe('whorl')
  expect(generate('x', { pattern: 'tented-arch' }).pattern).toBe('tented-arch')
})

test('minutiae sit inside the finger', () => {
  const p = generate('alice')
  expect(p.minutiae.length).toBeGreaterThan(20)
  expect(p.minutiae.length).toBeLessThan(120)
  for (const m of p.minutiae) {
    expect(p.mask[m.y * p.width + m.x]).toBe(1)
    expect(m.angle).toBeGreaterThanOrEqual(0)
    expect(m.angle).toBeLessThan(2 * Math.PI)
  }
})

test('period stays in a human range', () => {
  for (const s of ['a', 'b', 'c', 'd']) {
    const p = generate(s)
    expect(p.period).toBeGreaterThanOrEqual(8)
    expect(p.period).toBeLessThanOrEqual(11)
  }
})
