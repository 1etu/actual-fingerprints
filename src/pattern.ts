import { fork, float, range, gauss, pick, type Rng } from './prng'
import { PI, sin, cos } from './fmath'

export type Pattern =
  | 'arch'
  | 'tented-arch'
  | 'left-loop'
  | 'right-loop'
  | 'whorl'
  | 'central-pocket'
  | 'double-loop'
  | 'accidental'

export interface Point {
  x: number
  y: number
  sectors: Float64Array
}

export interface Spec {
  pattern: Pattern
  cores: Point[]
  deltas: Point[]
  tilt: number
  period: number
  arch?: { x: number, y: number, amp: number, w: number, h: number }
}

const names: Pattern[] = ['left-loop', 'right-loop', 'whorl', 'double-loop', 'central-pocket', 'accidental', 'arch', 'tented-arch']
const weights = [315, 315, 240, 40, 30, 10, 40, 10]

export function samplePattern(seed: string, w: number, h: number, pattern?: Pattern, hand?: 'left' | 'right') {
  const r = fork(seed, 'class')
  let kind = pattern ?? names[pick(r, weights)]
  if (!pattern && hand && (kind === 'left-loop' || kind === 'right-loop')) {
    const ulnar = float(r) < 0.94
    kind = (hand === 'right') === ulnar ? 'right-loop' : 'left-loop'
  }

  const spec: Spec = {
    pattern: kind,
    cores: [],
    deltas: [],
    tilt: range(r, -6, 6) * PI / 180,
    period: Math.max(8, Math.min(11, 9.4 + 0.8 * gauss(r))),
  }
  const at = (x: number, y: number) => ({ x: Math.round(x), y: Math.round(y), sectors: sectors(r) })
  const jit = (amount: number) => range(r, -amount, amount)

  if (kind === 'left-loop' || kind === 'right-loop') {
    const c = at(w * range(r, 0.44, 0.56), h * range(r, 0.36, 0.46))
    const side = kind === 'left-loop' ? 1 : -1
    spec.cores.push(c)
    spec.deltas.push(at(c.x + side * w * range(r, 0.22, 0.34), c.y + h * range(r, 0.15, 0.28)))
    return spec
  }

  if (kind === 'tented-arch') {
    const c = at(w * (0.5 + jit(0.05)), h * (0.4 + jit(0.05)))
    spec.cores.push(c)
    spec.deltas.push(at(c.x + w * jit(0.02), c.y + h * range(r, 0.07, 0.12)))
    return spec
  }

  if (kind === 'arch') {
    spec.arch = {
      x: w * (0.5 + jit(0.06)),
      y: h * (0.33 + jit(0.06)),
      amp: range(r, 0.4, 0.7),
      w: w * range(r, 0.2, 0.35),
      h: h * range(r, 0.25, 0.4),
    }
    return spec
  }

  const cx = w * range(r, 0.45, 0.55), cy = h * range(r, 0.38, 0.48)

  if (kind === 'whorl' || kind === 'central-pocket') {
    const sep = w * (kind === 'whorl' ? range(r, 0, 0.08) : range(r, 0.02, 0.05))
    const ang = range(r, 0, PI)
    const dx = sep / 2 * cos(ang), dy = sep / 2 * sin(ang)
    spec.cores.push(at(cx - dx, cy - dy), at(cx + dx, cy + dy))
  } else {
    const d = w * range(r, 0.09, 0.15) + (kind === 'accidental' ? w * jit(0.08) : 0)
    const ang = range(r, 20, 70) * PI / 180 * (float(r) < 0.5 ? 1 : -1)
    const dx = d * cos(ang), dy = d * sin(ang)
    spec.cores.push(at(cx - dx, cy - dy), at(cx + dx, cy + dy))
  }

  if (kind === 'central-pocket') {
    const side = float(r) < 0.5 ? 1 : -1
    spec.deltas.push(at(cx + side * w * range(r, 0.22, 0.34), cy + h * range(r, 0.15, 0.28)))
    spec.deltas.push(at(cx - side * w * 0.03, cy + h * range(r, 0.06, 0.1)))
    return spec
  }

  const j = kind === 'accidental' ? 0.06 : 0.03
  spec.deltas.push(at(cx - w * range(r, 0.24, 0.36) + w * jit(j), cy + h * range(r, 0.14, 0.26) + h * jit(j)))
  spec.deltas.push(at(cx + w * range(r, 0.24, 0.36) + w * jit(j), cy + h * range(r, 0.14, 0.26) + h * jit(j)))
  return spec
}

function sectors(r: Rng) {
  const s = new Float64Array(9)
  for (let i = 1; i < 8; i++) s[i] = range(r, -0.3, 0.3)
  return s
}
