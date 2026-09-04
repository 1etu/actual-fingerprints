import { fork, int } from './prng'
import { erode, NB, NF } from './field'
import { PAD, tapx, tapy, kernels } from './gabor'
import type { Spec } from './pattern'

export function grow(seed: string, spec: Spec, mask: Uint8Array, ids: Uint8Array, w: number, h: number, density: number) {
  const pw = w + 2 * PAD, ph = h + 2 * PAD
  const st = new Int8Array(pw * ph)

  let m = 0
  for (let i = 0; i < w * h; i++) m += mask[i]

  const bw = Math.ceil(w / 16), bh = Math.ceil(h / 16), nb = bw * bh
  const px = new Int32Array(m)
  const runStart = new Int32Array(m + 1)
  const runId = new Uint8Array(m)
  const blockRun = new Int32Array(nb + 1)
  const count = new Int32Array(257)
  let nr = 0, np = 0
  for (let by = 0; by < bh; by++) {
    for (let bx = 0; bx < bw; bx++) {
      const b = by * bw + bx
      blockRun[b] = nr
      count.fill(0)
      const x0 = bx * 16, y0 = by * 16, x1 = Math.min(w, x0 + 16), y1 = Math.min(h, y0 + 16)
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const id = ids[y * w + x]
          if (id !== 255) count[id + 1]++
        }
      }
      for (let id = 0; id < 256; id++) count[id + 1] += count[id]
      const base = np
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const id = ids[y * w + x]
          if (id !== 255) px[base + count[id]++] = (y + PAD) * pw + x + PAD
        }
      }
      let at = base
      for (let id = 0; id < 255; id++) {
        const end = base + count[id]
        if (end > at) {
          runStart[nr] = at
          runId[nr] = id
          nr++
          at = end
        }
      }
      np = at
    }
  }
  blockRun[nb] = nr
  runStart[nr] = np

  const off: Int32Array[] = []
  for (let f = 0; f < NF; f++) {
    const o = new Int32Array(tapx[f].length)
    for (let i = 0; i < o.length; i++) o[i] = tapy[f][i] * pw + tapx[f][i]
    off.push(o)
  }

  const dirty = new Uint8Array(nb), active = new Uint8Array(nb)
  const r = fork(seed, 'seeds')
  const inner = erode(mask, w, h, 15)
  const n = Math.round((20 + 50 * density) * m / 83200)
  const sx = new Int32Array(n + 4), sy = new Int32Array(n + 4)
  let ns = 0
  const put = (x: number, y: number) => {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) st[(y + dy + PAD) * pw + x + dx + PAD] = 1
    }
    dirty[(y >> 4) * bw + (x >> 4)] = 1
    sx[ns] = x
    sy[ns] = y
    ns++
  }
  for (let i = 0; i < spec.cores.length; i++) {
    const p = spec.cores[i]
    if (inner[p.y * w + p.x]) put(p.x, p.y)
  }
  for (let i = 0; i < spec.deltas.length; i++) {
    const p = spec.deltas[i]
    if (inner[p.y * w + p.x]) put(p.x, p.y)
  }
  const gap = 4 * spec.period * spec.period
  for (let tries = 0; ns < n && tries < n * 30; tries++) {
    const x = int(r, w), y = int(r, h)
    if (!inner[y * w + x]) continue
    let ok = true
    for (let i = 0; i < ns; i++) {
      const dx = sx[i] - x, dy = sy[i] - y
      if (dx * dx + dy * dy < gap) {
        ok = false
        break
      }
    }
    if (ok) put(x, y)
  }

  const spread = (from: Uint8Array) => {
    active.fill(0)
    for (let by = 0; by < bh; by++) {
      for (let bx = 0; bx < bw; bx++) {
        if (!from[by * bw + bx]) continue
        for (let yy = Math.max(0, by - 1); yy <= Math.min(bh - 1, by + 1); yy++) {
          for (let xx = Math.max(0, bx - 1); xx <= Math.min(bw - 1, bx + 1); xx++) active[yy * bw + xx] = 1
        }
      }
    }
  }

  const limit = Math.max(16, m / 1000)
  const touched = new Uint8Array(nb)
  let passes = 0
  const settle = () => {
    for (let pass = 0; pass < 20; pass++, passes++) {
      spread(dirty)
      dirty.fill(0)
      let changed = 0
      for (let bi = 0; bi < nb; bi++) {
        const b = pass & 1 ? nb - 1 - bi : bi
        if (!active[b]) continue
        let hit = 0
        for (let ri = blockRun[b]; ri < blockRun[b + 1]; ri++) {
          const k = kernels[runId[ri]], o = off[runId[ri] / NB | 0], nt = k.length
          for (let i = runStart[ri], end = runStart[ri + 1]; i < end; i++) {
            const p = px[i]
            let acc = 0
            for (let t = 0; t < nt; t++) acc += k[t] * st[p + o[t]]
            const cur = st[p]
            const v = acc > 4096 || (acc > 0 && !cur) ? 1 : acc < -4096 || (acc < 0 && !cur) ? -1 : cur
            if (v !== cur) {
              st[p] = v
              hit++
            }
          }
        }
        if (hit) {
          dirty[b] = touched[b] = 1
          changed += hit
        }
      }
      if (changed <= limit) return
    }
  }

  const resp = new Int32Array(w * h)
  const respond = () => {
    for (let b = 0; b < nb; b++) {
      if (!active[b]) continue
      for (let ri = blockRun[b]; ri < blockRun[b + 1]; ri++) {
        const k = kernels[runId[ri]], o = off[runId[ri] / NB | 0], nt = k.length
        for (let i = runStart[ri], end = runStart[ri + 1]; i < end; i++) {
          const p = px[i]
          let acc = 0
          for (let t = 0; t < nt; t++) acc += k[t] * st[p + o[t]]
          resp[((p / pw | 0) - PAD) * w + p % pw - PAD] = acc
        }
      }
    }
  }

  for (let round = 0; ; round++) {
    settle()
    if (round) spread(touched)
    else active.fill(1)
    touched.fill(0)
    respond()
    if (round === 2) break
    let patched = 0
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const q = y * w + x
        if (!inner[q] || resp[q] > 2048 || resp[q] < -2048) continue
        const p = (y + PAD) * pw + x + PAD
        const s = st[p]
        if (!s || st[p - 1] !== s || st[p + 1] !== s || st[p - pw] !== s || st[p + pw] !== s) continue
        for (let dy = -pw; dy <= pw; dy += pw) {
          for (let dx = -1; dx <= 1; dx++) st[p + dy + dx] = -s
        }
        dirty[(y >> 4) * bw + (x >> 4)] = 1
        patched++
      }
    }
    if (!patched) break
  }

  const gray = new Uint8Array(w * h).fill(255), ridges = new Uint8Array(w * h)
  for (let q = 0; q < w * h; q++) {
    if (!mask[q]) continue
    const g = 128 - (resp[q] >> 7)
    gray[q] = g < 0 ? 0 : g > 255 ? 255 : g
    ridges[q] = g < 128 ? 1 : 0
  }
  return { gray, ridges, passes }
}
