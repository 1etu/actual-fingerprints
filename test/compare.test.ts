import { test, expect } from 'vitest'
import { generate, compare } from '../src/index'

test('a print matches itself', () => {
  const p = generate('self')
  const r = compare(p, p)
  expect(r.score).toBe(1)
  expect(r.matched).toBe(p.minutiae.length)
  expect(r.rotation).toBe(0)
  expect(r.dx).toBeCloseTo(0, 6)
  expect(r.dy).toBeCloseTo(0, 6)
})

test('different fingers score low', () => {
  const prints = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map(s => generate(s))
  for (let i = 0; i < prints.length; i++) {
    for (let j = i + 1; j < prints.length; j++) expect(compare(prints[i], prints[j]).score).toBeLessThan(0.15)
  }
})

test('shifted copy still matches', () => {
  const p = generate('shift')
  const q = { ...p, minutiae: p.minutiae.map(m => ({ ...m, x: m.x + 7, y: m.y - 4 })) }
  const r = compare(p, q)
  expect(r.score).toBeGreaterThan(0.9)
  expect(r.dx).toBeCloseTo(7, 6)
  expect(r.dy).toBeCloseTo(-4, 6)
})
