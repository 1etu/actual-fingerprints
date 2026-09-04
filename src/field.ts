import { fork, range, type Rng } from './prng'
import { PI, atan2, bin } from './fmath'
import type { Spec, Point } from './pattern'

export const NB = 32
export const NF = 8

export function noise(r: Rng, nx: number, ny: number) {
  const g = new Float64Array((nx + 1) * (ny + 1))
  for (let i = 0; i < g.length; i++) g[i] = range(r, -1, 1)
  return g
}

export function sample(g: Float64Array, nx: number, ny: number, u: number, v: number) {
  const fx = u * nx, fy = v * ny
  const ix = Math.floor(fx), iy = Math.floor(fy)
  const tx = fx - ix, ty = fy - iy
  const i = iy * (nx + 1) + ix
  const top = g[i] + (g[i + 1] - g[i]) * tx
  const bot = g[i + nx + 1] + (g[i + nx + 2] - g[i + nx + 1]) * tx
  return top + (bot - top) * ty
}

export function silhouette(seed: string, w: number, h: number) {
  const r = fork(seed, 'shape')
  const cx = w * range(r, 0.475, 0.525)
  const a1 = w * range(r, 0.34, 0.47), a2 = w * range(r, 0.34, 0.47)
  let b1 = h * range(r, 0.22, 0.32), c = h * range(r, 0.22, 0.38), b2 = h * range(r, 0.2, 0.32)
  const top = h * range(r, 0.03, 0.09)
  const s = Math.min(1, (0.97 * h - top) / (b1 + c + b2))
  b1 *= s
  c *= s
  b2 *= s
  const g = noise(r, 5, 6)
  const yt = top + b1, yb = yt + c
  const mask = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const j = 1 + 0.04 * sample(g, 5, 6, x / w, y / h)
      const dx = (x - cx) / ((x < cx ? a1 : a2) * j)
      const dy = y < yt ? (y - yt) / (b1 * j) : y < yb ? 0 : (y - yb) / (b2 * j)
      mask[y * w + x] = dx * dx + dy * dy <= 1 ? 1 : 0
    }
  }
  return mask
}

export function erode(mask: Uint8Array, w: number, h: number, k: number) {
  const tmp = new Uint8Array(w * h), out = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    const row = y * w
    let run = 0
    for (let x = 0; x < w; x++) {
      run = mask[row + x] ? run + 1 : 0
      tmp[row + x] = run > k ? 1 : 0
    }
    run = 0
    for (let x = w - 1; x >= 0; x--) {
      run = mask[row + x] ? run + 1 : 0
      if (run <= k) tmp[row + x] = 0
    }
  }
  for (let x = 0; x < w; x++) {
    let run = 0
    for (let y = 0; y < h; y++) {
      run = tmp[y * w + x] ? run + 1 : 0
      out[y * w + x] = run > k ? 1 : 0
    }
    run = 0
    for (let y = h - 1; y >= 0; y--) {
      run = tmp[y * w + x] ? run + 1 : 0
      if (run <= k) out[y * w + x] = 0
    }
  }
  return out
}

function sector(p: Point, a: number) {
  const u = (a + PI) / (PI / 4)
  const i = Math.min(7, Math.floor(u))
  const f = u - i
  const g0 = -PI + i * PI / 4 + p.sectors[i]
  const g1 = -PI + (i + 1) * PI / 4 + p.sectors[i + 1]
  return g0 + f * (g1 - g0)
}

export function kernelIds(seed: string, spec: Spec, mask: Uint8Array, w: number, h: number) {
  const g = noise(fork(seed, 'period'), 4, 5)
  const ids = new Uint8Array(w * h).fill(255)
  const { cores, deltas, tilt, period, arch } = spec
  const rd = 0.11 * w * 0.11 * w
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (!mask[i]) continue
      let th = tilt
      let dd = Infinity
      if (arch) {
        const u = Math.max(-1, Math.min(1, (x - arch.x) / arch.w))
        const v = (y - arch.y) / arch.h
        th += arch.amp * u / (1 + v * v)
      }
      for (let k = 0; k < cores.length; k++) {
        const p = cores[k]
        th += 0.5 * sector(p, atan2(y - p.y, x - p.x))
      }
      for (let k = 0; k < deltas.length; k++) {
        const p = deltas[k]
        th -= 0.5 * sector(p, atan2(y - p.y, x - p.x))
        const d = (x - p.x) * (x - p.x) + (y - p.y) * (y - p.y)
        if (d < dd) dd = d
      }
      const bd = dd === Infinity ? 0 : 1 / (1 + dd / rd)
      let t = period * (1 - 0.12 * bd + 0.04 * sample(g, 4, 5, x / w, y / h))
      t = Math.max(7, Math.min(12, t))
      ids[i] = Math.round((t - 7) / 5 * (NF - 1)) * NB + bin(th, NB)
    }
  }
  return ids
}
