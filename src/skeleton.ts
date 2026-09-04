export function thin(ridges: Uint8Array, mask: Uint8Array, w: number, h: number) {
  const pw = w + 2
  const img = new Uint8Array(pw * (h + 2))
  let len = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (ridges[y * w + x] && mask[y * w + x]) {
        img[(y + 1) * pw + x + 1] = 1
        len++
      }
    }
  }
  const list = new Int32Array(len), marks = new Int32Array(len)
  len = 0
  for (let i = 0; i < img.length; i++) if (img[i]) list[len++] = i

  let idle = 0
  for (let step = 0; idle < 2; step++) {
    let nm = 0
    for (let j = 0; j < len; j++) {
      const p = list[j]
      const p2 = img[p - pw], p3 = img[p - pw + 1], p4 = img[p + 1], p5 = img[p + pw + 1]
      const p6 = img[p + pw], p7 = img[p + pw - 1], p8 = img[p - 1], p9 = img[p - pw - 1]
      const b = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9
      if (b < 2 || b > 6) continue
      let a = 0
      if (!p2 && p3) a++
      if (!p3 && p4) a++
      if (!p4 && p5) a++
      if (!p5 && p6) a++
      if (!p6 && p7) a++
      if (!p7 && p8) a++
      if (!p8 && p9) a++
      if (!p9 && p2) a++
      if (a !== 1) continue
      if (step & 1 ? p2 * p4 * p8 || p2 * p6 * p8 : p2 * p4 * p6 || p4 * p6 * p8) continue
      marks[nm++] = p
    }
    for (let j = 0; j < nm; j++) img[marks[j]] = 0
    idle = nm ? 0 : idle + 1
    if (nm) {
      let k = 0
      for (let j = 0; j < len; j++) if (img[list[j]]) list[k++] = list[j]
      len = k
    }
  }

  for (let j = 0; j < len; j++) {
    const p = list[j]
    const n = img[p - pw], e = img[p + 1], s = img[p + pw], v = img[p - 1]
    const b = n + e + s + v + img[p - pw + 1] + img[p + pw + 1] + img[p + pw - 1] + img[p - pw - 1]
    if (b === 2 && (n && e || e && s || s && v || v && n)) img[p] = 0
  }
  return img
}
