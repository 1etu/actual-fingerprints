import { fork, float, range, int } from './prng'
import { PI, sin, cos } from './fmath'
import { noise, sample, erode } from './field'
import { thin } from './skeleton'
import type { Fingerprint } from './generate'

function blur(src: Uint8Array, w: number, h: number) {
  const tmp = new Uint8Array(w * h), out = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    const row = y * w
    for (let x = 0; x < w; x++) {
      const l = src[row + Math.max(0, x - 1)], r = src[row + Math.min(w - 1, x + 1)]
      tmp[row + x] = (l + 2 * src[row + x] + r + 2) >> 2
    }
  }
  for (let y = 0; y < h; y++) {
    const up = Math.max(0, y - 1) * w, down = Math.min(h - 1, y + 1) * w, row = y * w
    for (let x = 0; x < w; x++) out[row + x] = (tmp[up + x] + 2 * tmp[row + x] + tmp[down + x] + 2) >> 2
  }
  return out
}

export function ink(p: Fingerprint): Fingerprint {
  const { width: w, height: h, mask, seed } = p
  const r = fork(seed, 'ink')
  const press = noise(r, 6, 7), thick = noise(r, 5, 6), dry = noise(r, 12, 15)
  const grain = noise(r, 30, 38), paper = noise(r, 8, 10)
  const soft = blur(p.pixels, w, h)
  const e1 = erode(mask, w, h, 4), e2 = erode(mask, w, h, 10), e3 = erode(mask, w, h, 18)

  const out = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    const v = y / h
    for (let x = 0; x < w; x++) {
      const i = y * w + x, u = x / w
      if (!mask[i]) {
        out[i] = 244 + 6 * sample(paper, 8, 10, u, v)
        continue
      }
      const fade = e3[i] ? 1 : e2[i] ? 0.9 : e1[i] ? 0.7 : 0.45
      const pressure = 0.82 + 0.18 * sample(press, 6, 7, u, v)
      const g = 128 + (soft[i] - 128 + 22 * sample(thick, 5, 6, u, v) + 25 * (1 - fade)) * 1.8
      let dark = (255 - Math.max(0, Math.min(255, g))) * pressure * fade
      const d = Math.max(0, sample(dry, 12, 15, u, v) - 0.3) * 1.2
      dark *= 1 - Math.max(0, Math.min(1, d + 0.3 * sample(grain, 30, 38, u, v) - 0.2))
      out[i] = 255 - dark
    }
  }

  const ridges = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) ridges[i] = p.pixels[i] < 128 ? 1 : 0
  const sk = thin(ridges, mask, w, h)
  for (let y = 1; y <= h; y++) {
    for (let x = 1; x <= w; x++) {
      if (!sk[y * (w + 2) + x] || float(r) > 0.05) continue
      const i = (y - 1) * w + x - 1
      out[i] += (255 - out[i]) * 0.6
      if (x > 1) out[i - 1] += (255 - out[i - 1]) * 0.25
      if (x < w) out[i + 1] += (255 - out[i + 1]) * 0.25
      if (y > 1) out[i - w] += (255 - out[i - w]) * 0.25
      if (y < h) out[i + w] += (255 - out[i + w]) * 0.25
    }
  }

  const roll = float(r)
  const creases = roll < 0.55 ? 0 : roll < 0.9 ? 1 : 2
  for (let c = 0; c < creases; c++) {
    const x0 = w * range(r, 0.3, 0.7), y0 = h * range(r, 0.45, 0.85)
    const a = range(r, -12, 12) * PI / 180
    const ca = cos(a), sa = sin(a)
    const width = range(r, 2, 5), half = w * range(r, 0.3, 0.6)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x
        if (!mask[i]) continue
        const dist = Math.abs((y - y0) * ca - (x - x0) * sa)
        const along = Math.abs((x - x0) * ca + (y - y0) * sa)
        if (dist >= width || along >= half) continue
        const k = dist / width
        out[i] = 255 - (255 - out[i]) * (0.1 + 0.9 * k * k)
      }
    }
  }

  for (let i = 0; i < w * h; i++) {
    const v = out[i] + int(r, 11) - 5
    out[i] = v < 0 ? 0 : v > 255 ? 255 : v
  }
  return { ...p, pixels: blur(out, w, h) }
}
