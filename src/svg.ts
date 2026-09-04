import type { Fingerprint } from './generate'

export function toSVG(p: Fingerprint, { tolerance = 0.75, fill = '#000', background }: {
  tolerance?: number
  fill?: string
  background?: string
} = {}) {
  const w = p.width, h = p.height
  const pw = w + 2, ph = h + 2
  const img = new Uint8Array(pw * ph)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) img[(y + 1) * pw + x + 1] = p.pixels[y * w + x] < 128 ? 1 : 0
  }

  const hn = (pw - 1) * ph
  const next = new Int32Array(hn + pw * (ph - 1)).fill(-1)
  const edge = new Int32Array(4)
  for (let j = 0; j < ph - 1; j++) {
    for (let i = 0; i < pw - 1; i++) {
      const o = j * pw + i
      const code = img[o] | img[o + 1] << 1 | img[o + pw + 1] << 2 | img[o + pw] << 3
      if (code === 0 || code === 15) continue
      edge[0] = j * (pw - 1) + i
      edge[1] = hn + j * pw + i + 1
      edge[2] = (j + 1) * (pw - 1) + i
      edge[3] = hn + j * pw + i
      const saddle = code === 5 || code === 10
      for (let k = 0; k < 4; k++) {
        if (code >> k & 1 || !(code >> ((k + 1) & 3) & 1)) continue
        let m = (k + 3) & 3
        if (!saddle) {
          for (let s = 1; s < 4; s++) {
            const kk = (k + s) & 3
            if (code >> kk & 1 && !(code >> ((kk + 1) & 3) & 1)) {
              m = kk
              break
            }
          }
        }
        next[edge[k]] = edge[m]
      }
    }
  }

  const eps2 = tolerance * tolerance * 4
  let xs = new Int32Array(1024), ys = new Int32Array(1024), keep = new Uint8Array(1024), stack = new Int32Array(2048)
  const d: string[] = []
  for (let s = 0; s < next.length; s++) {
    if (next[s] < 0) continue
    let n = 0
    for (let cur = s; cur >= 0;) {
      if (n === xs.length) {
        const nx = new Int32Array(n * 2), ny = new Int32Array(n * 2)
        nx.set(xs)
        ny.set(ys)
        xs = nx
        ys = ny
        keep = new Uint8Array(n * 2)
        stack = new Int32Array(n * 4)
      }
      if (cur < hn) {
        xs[n] = 2 * (cur % (pw - 1))
        ys[n] = 2 * (cur / (pw - 1) | 0) - 1
      } else {
        xs[n] = 2 * ((cur - hn) % pw) - 1
        ys[n] = 2 * ((cur - hn) / pw | 0)
      }
      n++
      const nx = next[cur]
      next[cur] = -1
      cur = nx === s ? -1 : nx
    }

    keep.fill(0, 0, n)
    let far = 0, fd = -1
    for (let i = 1; i < n; i++) {
      const dx = xs[i] - xs[0], dy = ys[i] - ys[0]
      if (dx * dx + dy * dy > fd) {
        fd = dx * dx + dy * dy
        far = i
      }
    }
    keep[0] = keep[far] = 1
    let sp = 0
    stack[sp++] = 0
    stack[sp++] = far
    stack[sp++] = far
    stack[sp++] = n
    while (sp > 0) {
      const b = stack[--sp], a = stack[--sp]
      if (b - a < 2) continue
      const ax = xs[a], ay = ys[a]
      const bx = xs[b % n] - ax, by = ys[b % n] - ay
      const len = bx * bx + by * by
      let m = -1, md = 0
      for (let i = a + 1; i < b; i++) {
        const px = xs[i] - ax, py = ys[i] - ay
        const c = bx * py - by * px
        const dist = len ? c * c / len : px * px + py * py
        if (dist > md) {
          md = dist
          m = i
        }
      }
      if (md <= eps2) continue
      keep[m] = 1
      stack[sp++] = a
      stack[sp++] = m
      stack[sp++] = m
      stack[sp++] = b
    }

    let lx = xs[0], ly = ys[0]
    d.push('M' + lx / 2 + ' ' + ly / 2)
    for (let i = 1; i < n; i++) {
      if (!keep[i]) continue
      d.push('l' + (xs[i] - lx) / 2 + ' ' + (ys[i] - ly) / 2)
      lx = xs[i]
      ly = ys[i]
    }
    d.push('Z')
  }

  const rect = background ? `<rect width="${w}" height="${h}" fill="${background}"/>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${rect}<path fill="${fill}" fill-rule="evenodd" d="${d.join('')}"/></svg>`
}
