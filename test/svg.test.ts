import { test, expect } from 'vitest'
import { generate, toSVG } from '../src/index'

const print = generate('svg')

test('one evenodd path', () => {
  const svg = toSVG(print)
  expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 400"')).toBe(true)
  expect(svg.endsWith('</svg>')).toBe(true)
  expect(svg.match(/<path /g)).toHaveLength(1)
  expect(svg).toContain('fill-rule="evenodd"')
  expect(svg.match(/ d="([^"]*)"/)![1]).toMatch(/^(M-?[\d.]+ -?[\d.]+(l-?[\d.]+ -?[\d.]+)+Z)+$/)
})

test('same seed, same svg', () => {
  expect(toSVG(print)).toBe(toSVG(generate('svg')))
})

test('tolerance trades vertices for size', () => {
  const fine = toSVG(print, { tolerance: 0.3 }), coarse = toSVG(print, { tolerance: 2 })
  expect(coarse.length).toBeLessThan(fine.length)
  expect(fine.length).toBeLessThan(200000)
})

test('options land in the markup', () => {
  const svg = toSVG(print, { fill: '#123456', background: '#fff' })
  expect(svg).toContain('<rect width="320" height="400" fill="#fff"/>')
  expect(svg).toContain('fill="#123456"')
})
