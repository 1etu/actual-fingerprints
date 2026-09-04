import { generate, ink, toSVG, toPNG, compare } from '../dist/index.js'

const time = (name, n, fn) => {
  for (let i = 0; i < 3; i++) fn(i)
  const t = performance.now()
  for (let i = 0; i < n; i++) fn(i)
  console.log(name.padEnd(9), ((performance.now() - t) / n).toFixed(1).padStart(6), 'ms')
}

const a = generate('bench-a'), b = generate('bench-b')
time('generate', 30, i => generate(i))
time('toSVG', 30, () => toSVG(a))
time('toPNG', 30, () => toPNG(a))
time('compare', 30, () => compare(a, b))
time('ink', 30, () => ink(a))
