import { samplePattern, type Pattern } from './pattern'
import { silhouette, kernelIds } from './field'
import { grow } from './grow'
import { extract, type Minutia } from './minutiae'

export interface Fingerprint {
  seed: string
  width: number
  height: number
  pattern: Pattern
  period: number
  pixels: Uint8Array
  mask: Uint8Array
  minutiae: Minutia[]
}

export function generate(seed: string | number, { width = 320, height = 400, pattern, hand }: {
  width?: number
  height?: number
  pattern?: Pattern
  hand?: 'left' | 'right'
} = {}): Fingerprint {
  const s = String(seed)
  const spec = samplePattern(s, width, height, pattern, hand)
  const mask = silhouette(s, width, height)
  const ids = kernelIds(s, spec, mask, width, height)
  const { gray, ridges } = grow(s, spec, mask, ids, width, height)
  const minutiae = extract(ridges, mask, width, height)
  return { seed: s, width, height, pattern: spec.pattern, period: spec.period, pixels: gray, mask, minutiae }
}
