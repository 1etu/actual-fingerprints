export const PI = 3.141592653589793
const LN2 = 0.6931471805599453

export function sin(x: number) {
  const k = Math.round(x / PI)
  const r = x - k * PI
  const r2 = r * r
  const s = r * (1 - r2 / 6 * (1 - r2 / 20 * (1 - r2 / 42 * (1 - r2 / 72 * (1 - r2 / 110 * (1 - r2 / 156 * (1 - r2 / 210)))))))
  return k & 1 ? -s : s
}

export const cos = (x: number) => sin(x + PI / 2)

export function exp(x: number) {
  const k = Math.floor(x / LN2)
  const r = x - k * LN2
  let s = 1 + r / 12
  for (let i = 11; i >= 1; i--) s = 1 + r / i * s
  for (let i = k; i < 0; i++) s *= 0.5
  for (let i = 0; i < k; i++) s *= 2
  return s
}

export function atan2(y: number, x: number) {
  const ax = Math.abs(x), ay = Math.abs(y)
  if (ax === 0 && ay === 0) return 0
  let t = ay > ax ? ax / ay : ay / ax
  t = t / (1 + Math.sqrt(1 + t * t))
  t = t / (1 + Math.sqrt(1 + t * t))
  const t2 = t * t
  let a = 4 * t * (1 - t2 * (1 / 3 - t2 * (1 / 5 - t2 * (1 / 7 - t2 * (1 / 9 - t2 / 11)))))
  if (ay > ax) a = PI / 2 - a
  if (x < 0) a = PI - a
  return y < 0 ? -a : a
}

export const modPi = (t: number) => t - PI * Math.floor(t / PI)
export const bin = (t: number, n: number) => Math.round(modPi(t) / PI * n) % n
