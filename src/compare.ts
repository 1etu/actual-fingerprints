import { PI, sin, cos } from './fmath'
import type { Fingerprint } from './generate'

const cell = 16

export function compare(a: Fingerprint, b: Fingerprint) {
  const na = a.minutiae.length, nb = b.minutiae.length
  const ax = new Float64Array(na), ay = new Float64Array(na), aa = new Float64Array(na), at = new Uint8Array(na)
  const bx = new Float64Array(nb), by = new Float64Array(nb), ba = new Float64Array(nb), bt = new Uint8Array(nb)
  for (let i = 0; i < na; i++) {
    const m = a.minutiae[i]
    ax[i] = m.x
    ay[i] = m.y
    aa[i] = m.angle
    at[i] = m.type === 'ending' ? 1 : 3
  }
  for (let i = 0; i < nb; i++) {
    const m = b.minutiae[i]
    bx[i] = m.x
    by[i] = m.y
    ba[i] = m.angle
    bt[i] = m.type === 'ending' ? 1 : 3
  }

  const gw = Math.ceil(b.width / cell), gh = Math.ceil(b.height / cell)
  const start = new Int32Array(gw * gh + 1), items = new Int32Array(nb)
  for (let i = 0; i < nb; i++) start[(by[i] / cell | 0) * gw + (bx[i] / cell | 0) + 1]++
  for (let i = 0; i < gw * gh; i++) start[i + 1] += start[i]
  const fill = start.slice()
  for (let i = 0; i < nb; i++) items[fill[(by[i] / cell | 0) * gw + (bx[i] / cell | 0)]++] = i

  const stamp = new Int32Array(nb)
  let gen = 0, best = 0, rotation = 0, dx = 0, dy = 0
  for (let i = 0; i < na; i++) {
    for (let j = 0; j < nb; j++) {
      const rot = ba[j] - aa[i]
      const c = cos(rot), s = sin(rot)
      const tx = bx[j] - (ax[i] * c - ay[i] * s), ty = by[j] - (ax[i] * s + ay[i] * c)
      gen++
      let score = 0
      for (let k = 0; k < na && score + na - k > best; k++) {
        const x = ax[k] * c - ay[k] * s + tx, y = ax[k] * s + ay[k] * c + ty
        const ang = aa[k] + rot
        const x0 = Math.max(0, (x - 10) / cell | 0), x1 = Math.min(gw - 1, (x + 10) / cell | 0)
        const y0 = Math.max(0, (y - 10) / cell | 0), y1 = Math.min(gh - 1, (y + 10) / cell | 0)
        let hit = -1, hd = 100
        for (let cy = y0; cy <= y1; cy++) {
          for (let cx = x0; cx <= x1; cx++) {
            for (let q = start[cy * gw + cx], end = start[cy * gw + cx + 1]; q < end; q++) {
              const m = items[q]
              if (stamp[m] === gen) continue
              const ex = bx[m] - x, ey = by[m] - y
              const d = ex * ex + ey * ey
              if (d > hd) continue
              let diff = Math.abs(ba[m] - ang) % (2 * PI)
              if (diff > PI) diff = 2 * PI - diff
              if (diff > PI * 25 / 180) continue
              hd = d
              hit = m
            }
          }
        }
        if (hit < 0) continue
        stamp[hit] = gen
        score += at[k] === bt[hit] ? 1 : 0.5
      }
      if (score > best) {
        best = score
        rotation = rot
        dx = tx
        dy = ty
      }
    }
  }
  return { score: best * best / (na * nb) || 0, matched: best, rotation, dx, dy }
}
