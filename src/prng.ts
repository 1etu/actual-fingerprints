export type Rng = () => number

export function prng(seed: string) {
  let a = mix(seed, 0), b = mix(seed, 1), c = mix(seed, 2), d = mix(seed, 3)
  const next = () => {
    const t = (a + b | 0) + d | 0
    d = d + 1 | 0
    a = b ^ (b >>> 9)
    b = c + (c << 3) | 0
    c = (c << 21 | c >>> 11) + t | 0
    return t >>> 0
  }
  for (let i = 0; i < 12; i++) next()
  return next
}

function mix(str: string, n: number) {
  let h1 = 0xdeadbeef ^ n, h2 = 0x41c6ce57 ^ n
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (h1 ^ h2) >>> 0
}

export const fork = (seed: string, label: string) => prng(seed + '\0' + label)
export const float = (r: Rng) => r() / 4294967296
export const int = (r: Rng, n: number) => Math.floor(float(r) * n)
export const range = (r: Rng, lo: number, hi: number) => lo + float(r) * (hi - lo)

export function gauss(r: Rng) {
  let s = 0
  for (let i = 0; i < 12; i++) s += float(r)
  return Math.max(-3, Math.min(3, s - 6))
}

export function pick(r: Rng, weights: number[]) {
  let total = 0
  for (let i = 0; i < weights.length; i++) total += weights[i]
  let x = int(r, total)
  for (let i = 0; i < weights.length; i++) {
    x -= weights[i]
    if (x < 0) return i
  }
  return weights.length - 1
}
