import { test, expect } from 'vitest'
import { prng, fork, float, int, gauss, pick } from '../src/prng'

test('same seed, same stream', () => {
  const a = prng('alice'), b = prng('alice')
  for (let i = 0; i < 100; i++) expect(a()).toBe(b())
})

test('different seeds and forks differ', () => {
  const a = prng('alice'), b = prng('bob'), c = fork('alice', 'shape')
  let same = 0
  for (let i = 0; i < 100; i++) {
    const x = a()
    if (x === b()) same++
    if (x === c()) same++
  }
  expect(same).toBe(0)
})

test('golden first draws', () => {
  const r = prng('test')
  expect([r(), r(), r(), r()]).toEqual([1424720220, 2118292715, 1451445153, 848166418])
})

test('helpers stay in range', () => {
  const r = prng('range')
  for (let i = 0; i < 1000; i++) {
    const f = float(r)
    expect(f).toBeGreaterThanOrEqual(0)
    expect(f).toBeLessThan(1)
    const n = int(r, 7)
    expect(n).toBeGreaterThanOrEqual(0)
    expect(n).toBeLessThan(7)
    const g = gauss(r)
    expect(Math.abs(g)).toBeLessThanOrEqual(3)
    expect(pick(r, [1, 0, 0])).toBe(0)
  }
})
