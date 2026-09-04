import { PI, sin, cos, exp } from './fmath'
import { NB, NF } from './field'

export const PAD = 12

export const tapx: Int8Array[] = []
export const tapy: Int8Array[] = []
export const kernels: Int16Array[] = []

for (let f = 0; f < NF; f++) {
  const t = 7 + f * 5 / (NF - 1)
  const rr = Math.round(0.9 * t)
  const xs: number[] = [], ys: number[] = []
  for (let dy = -rr; dy <= rr; dy++) {
    for (let dx = -rr; dx <= rr; dx++) {
      if (dx * dx + dy * dy <= rr * rr) {
        xs.push(dx)
        ys.push(dy)
      }
    }
  }
  tapx.push(Int8Array.from(xs))
  tapy.push(Int8Array.from(ys))

  const n = xs.length
  const sa = 0.38 * t, sl = 0.48 * t
  const w = new Float64Array(n)
  for (let b = 0; b < NB; b++) {
    const th = b * PI / NB
    const s = sin(th), c = cos(th)
    let mean = 0
    for (let i = 0; i < n; i++) {
      const u = -xs[i] * s + ys[i] * c
      const v = xs[i] * c + ys[i] * s
      w[i] = exp(-(u * u / (2 * sa * sa) + v * v / (2 * sl * sl))) * cos(2 * PI * u / t)
      mean += w[i]
    }
    mean /= n
    let sum = 0
    for (let i = 0; i < n; i++) {
      w[i] -= mean
      sum += Math.abs(w[i])
    }
    const k = new Int16Array(n)
    for (let i = 0; i < n; i++) k[i] = Math.round(w[i] * 32768 / sum)
    kernels.push(k)
  }
}
