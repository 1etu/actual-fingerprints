import { PI, atan2 } from './fmath'
import { erode } from './field'
import { thin } from './skeleton'

export interface Minutia {
  x: number
  y: number
  angle: number
  type: 'ending' | 'bifurcation'
}

const path = new Int32Array(12)
const stop = new Int32Array(3)

function walk(sk: Uint8Array, pw: number, start: number, prev: number, steps: number) {
  let cur = start, n = 0, cnt = 0
  path[0] = cur
  for (;;) {
    let next = -1
    cnt = 0
    for (let dy = -pw; dy <= pw; dy += pw) {
      for (let dx = -1; dx <= 1; dx++) {
        const q = cur + dy + dx
        if (q !== cur && q !== prev && sk[q]) {
          cnt++
          next = q
        }
      }
    }
    if (cnt !== 1 || n === steps) break
    prev = cur
    cur = next
    path[++n] = cur
  }
  stop[0] = cur
  stop[1] = n
  stop[2] = cnt
}

function prune(sk: Uint8Array, pw: number) {
  for (let p = pw; p < sk.length - pw; p++) {
    if (!sk[p]) continue
    const b = sk[p - pw - 1] + sk[p - pw] + sk[p - pw + 1] + sk[p - 1] + sk[p + 1] + sk[p + pw - 1] + sk[p + pw] + sk[p + pw + 1]
    if (b === 0) sk[p] = 0
    if (b !== 1) continue
    walk(sk, pw, p, -1, 10)
    if (stop[1] === 10 && stop[2] === 1) continue
    for (let i = 0; i <= stop[1]; i++) sk[path[i]] = 0
  }
}

export function extract(ridges: Uint8Array, mask: Uint8Array, w: number, h: number) {
  const pw = w + 2
  const sk = thin(ridges, mask, w, h)
  prune(sk, pw)
  const inner = erode(mask, w, h, 10)
  const cap = (w * h >> 6) + 16
  const px = new Int32Array(cap), kind = new Uint8Array(cap), ang = new Float64Array(cap)
  const dead = new Uint8Array(cap)
  let n = 0

  for (let y = 1; y <= h && n < cap; y++) {
    for (let x = 1; x <= w && n < cap; x++) {
      const p = y * pw + x
      if (!sk[p] || !inner[(y - 1) * w + x - 1]) continue
      const p2 = sk[p - pw], p3 = sk[p - pw + 1], p4 = sk[p + 1], p5 = sk[p + pw + 1]
      const p6 = sk[p + pw], p7 = sk[p + pw - 1], p8 = sk[p - 1], p9 = sk[p - pw - 1]
      const cn = (Math.abs(p2 - p3) + Math.abs(p3 - p4) + Math.abs(p4 - p5) + Math.abs(p5 - p6)
        + Math.abs(p6 - p7) + Math.abs(p7 - p8) + Math.abs(p8 - p9) + Math.abs(p9 - p2)) >> 1
      if (cn !== 1 && cn !== 3) continue
      px[n] = p
      kind[n] = cn
      n++
    }
  }

  const bx = new Float64Array(3), by = new Float64Array(3)
  for (let i = 0; i < n; i++) {
    const p = px[i]
    const x = p % pw, y = p / pw | 0
    if (kind[i] === 1) {
      walk(sk, pw, p, -1, 8)
      ang[i] = atan2((stop[0] / pw | 0) - y, stop[0] % pw - x)
      continue
    }
    let k = 0
    for (let dy = -pw; dy <= pw && k < 3; dy += pw) {
      for (let dx = -1; dx <= 1 && k < 3; dx++) {
        const q = p + dy + dx
        if (q === p || !sk[q]) continue
        walk(sk, pw, q, p, 8)
        bx[k] = stop[0] % pw - x
        by[k] = (stop[0] / pw | 0) - y
        k++
      }
    }
    let best = -Infinity, a = 0, b = 1
    for (let s = 0; s < k; s++) {
      for (let t = s + 1; t < k; t++) {
        const dot = (bx[s] * bx[t] + by[s] * by[t]) / Math.sqrt((bx[s] * bx[s] + by[s] * by[s]) * (bx[t] * bx[t] + by[t] * by[t]))
        if (dot > best) {
          best = dot
          a = s
          b = t
        }
      }
    }
    ang[i] = atan2(by[a] + by[b], bx[a] + bx[b])
  }

  for (let i = 0; i < n; i++) {
    if (dead[i]) continue
    const xi = px[i] % pw, yi = px[i] / pw | 0
    for (let j = i + 1; j < n; j++) {
      if (dead[j]) continue
      const dx = px[j] % pw - xi, dy = (px[j] / pw | 0) - yi
      const d = dx * dx + dy * dy
      if (d < 16) {
        dead[j] = 1
        continue
      }
      if (d > 36 || kind[i] !== kind[j]) continue
      if (kind[i] === 3) {
        dead[i] = dead[j] = 1
        continue
      }
      let diff = Math.abs(ang[i] - ang[j])
      if (diff > PI) diff = 2 * PI - diff
      if (diff > PI * 150 / 180) dead[i] = dead[j] = 1
    }
  }

  const order: number[] = []
  for (let i = 0; i < n; i++) if (!dead[i]) order.push(i)
  order.sort((i, j) => px[i] - px[j] || kind[i] - kind[j])
  const out: Minutia[] = []
  for (let o = 0; o < order.length; o++) {
    const i = order[o]
    const a = ang[i] < 0 ? ang[i] + 2 * PI : ang[i]
    out.push({ x: px[i] % pw - 1, y: (px[i] / pw | 0) - 1, angle: a, type: kind[i] === 1 ? 'ending' : 'bifurcation' })
  }
  return out
}
