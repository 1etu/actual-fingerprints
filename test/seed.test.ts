import { test, expect } from 'vitest'
import { seedFor } from '../src/node'

test('same inputs, same seed', () => {
  expect(seedFor('secret', 'ABC123', 'R1')).toBe(seedFor('secret', 'ABC123', 'R1'))
  expect(seedFor('secret', 'ABC123', 'R1')).toMatch(/^[0-9a-f]{64}$/)
})

test('any change moves it', () => {
  const base = seedFor('secret', 'ABC123', 'R1')
  expect(seedFor('secret', 'ABC123', 'R2')).not.toBe(base)
  expect(seedFor('secret', 'ABC124', 'R1')).not.toBe(base)
  expect(seedFor('other', 'ABC123', 'R1')).not.toBe(base)
  expect(seedFor('secret', 'ABC123R1')).not.toBe(base)
})

test('numbers work as parts', () => {
  expect(seedFor('secret', 42, 1)).toBe(seedFor('secret', '42', '1'))
})
