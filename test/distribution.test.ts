import { test, expect } from 'vitest'
import { generate } from '../src/index'

const slow = test.skipIf(!process.env.SLOW)

slow('a thousand seeds look like a population', () => {
  const counts: Record<string, number> = {}
  const minutiae: number[] = []
  let endings = 0, bifurcations = 0, period = 0
  for (let i = 0; i < 1000; i++) {
    const p = generate('pop-' + i)
    counts[p.pattern] = (counts[p.pattern] ?? 0) + 1
    minutiae.push(p.minutiae.length)
    period += p.period
    for (const m of p.minutiae) m.type === 'ending' ? endings++ : bifurcations++
  }
  minutiae.sort((a, b) => a - b)
  const loops = (counts['left-loop'] ?? 0) + (counts['right-loop'] ?? 0)
  const whorls = (counts['whorl'] ?? 0) + (counts['double-loop'] ?? 0) + (counts['central-pocket'] ?? 0) + (counts['accidental'] ?? 0)
  const arches = (counts['arch'] ?? 0) + (counts['tented-arch'] ?? 0)
  expect(loops).toBeGreaterThan(585)
  expect(loops).toBeLessThan(675)
  expect(whorls).toBeGreaterThan(275)
  expect(whorls).toBeLessThan(365)
  expect(arches).toBeGreaterThan(30)
  expect(arches).toBeLessThan(72)
  expect(period / 1000).toBeGreaterThan(9)
  expect(period / 1000).toBeLessThan(10)
  expect(minutiae[500]).toBeGreaterThan(30)
  expect(minutiae[500]).toBeLessThan(80)
  expect(minutiae[50]).toBeGreaterThan(15)
  expect(minutiae[950]).toBeLessThan(120)
  expect(endings / bifurcations).toBeGreaterThan(0.8)
  expect(endings / bifurcations).toBeLessThan(3)
}, 600000)
