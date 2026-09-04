import { test, expect } from 'vitest'
import { sin, cos, exp, atan2, bin, PI } from '../src/fmath'

test('sin and cos track Math within 1e-8', () => {
  for (let i = 0; i <= 10000; i++) {
    const x = -20 + i * 0.004
    expect(Math.abs(sin(x) - Math.sin(x))).toBeLessThan(1e-8)
    expect(Math.abs(cos(x) - Math.cos(x))).toBeLessThan(1e-8)
  }
})

test('exp tracks Math within 1e-8 relative', () => {
  for (let i = 0; i <= 10000; i++) {
    const x = -30 + i * 0.0035
    const want = Math.exp(x)
    expect(Math.abs(exp(x) - want) / want).toBeLessThan(1e-8)
  }
})

test('atan2 tracks Math within 1e-8', () => {
  for (let i = 0; i < 10000; i++) {
    const a = i * 0.00062831853
    const y = Math.sin(a) * (1 + i % 7), x = Math.cos(a) * (1 + i % 5)
    expect(Math.abs(atan2(y, x) - Math.atan2(y, x))).toBeLessThan(1e-8)
  }
  expect(atan2(0, 0)).toBe(0)
  expect(atan2(1, 0)).toBeCloseTo(PI / 2, 10)
  expect(atan2(0, -1)).toBeCloseTo(PI, 10)
})

test('bin wraps half turns', () => {
  expect(bin(0, 32)).toBe(0)
  expect(bin(PI, 32)).toBe(0)
  expect(bin(-PI, 32)).toBe(0)
  expect(bin(PI / 2, 32)).toBe(16)
  expect(bin(-PI / 2, 32)).toBe(16)
  expect(bin(PI - 1e-12, 32)).toBe(0)
})
