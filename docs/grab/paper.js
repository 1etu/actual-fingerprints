(function () {
  var w = 1600, h = 1100
  var c = document.createElement('canvas')
  c.width = w
  c.height = h
  var ctx = c.getContext('2d')
  var s = 20260906

  function rnd() {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }

  function noise(cell) {
    var nx = Math.ceil(w / cell) + 1, ny = Math.ceil(h / cell) + 1
    var g = new Float32Array(nx * ny)
    for (var i = 0; i < g.length; i++) g[i] = rnd()
    return function (x, y) {
      var gx = x / cell, gy = y / cell
      var x0 = gx | 0, y0 = gy | 0
      var fx = gx - x0, fy = gy - y0
      fx = fx * fx * (3 - 2 * fx)
      fy = fy * fy * (3 - 2 * fy)
      var a = g[y0 * nx + x0], b = g[y0 * nx + x0 + 1]
      var d = g[(y0 + 1) * nx + x0], e = g[(y0 + 1) * nx + x0 + 1]
      return (a + (b - a) * fx) * (1 - fy) + (d + (e - d) * fx) * fy
    }
  }

  var n1 = noise(220), n2 = noise(70), n3 = noise(18), n4 = noise(5)
  var img = ctx.createImageData(w, h)
  var d = img.data
  for (var y = 0, i = 0; y < h; y++) {
    for (var x = 0; x < w; x++, i += 4) {
      var v = 0.45 * n1(x, y) + 0.3 * n2(x, y) + 0.17 * n3(x, y) + 0.08 * n4(x, y)
      var ex = Math.min(x, w - x) / w, ey = Math.min(y, h - y) / h
      var edge = Math.min(1, Math.min(ex, ey) * 9)
      v = v * 0.55 + 0.25 + (rnd() - 0.5) * 0.05
      var t = 1 - v * 0.35 - (1 - edge) * 0.18
      d[i] = 238 * t
      d[i + 1] = 226 * t
      d[i + 2] = 200 * t
      d[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)

  ctx.strokeStyle = 'rgba(90, 70, 40, 0.16)'
  ctx.lineWidth = 0.7
  for (var f = 0; f < 2600; f++) {
    var fx0 = rnd() * w, fy0 = rnd() * h, ang = rnd() * Math.PI, len = 4 + rnd() * 22
    ctx.beginPath()
    ctx.moveTo(fx0, fy0)
    ctx.lineTo(fx0 + Math.cos(ang) * len, fy0 + Math.sin(ang) * len)
    ctx.stroke()
  }

  for (var k = 0; k < 3; k++) {
    var sx = rnd() * w, sy = rnd() * h, r = 60 + rnd() * 180
    var g = ctx.createRadialGradient(sx, sy, r * 0.5, sx, sy, r)
    g.addColorStop(0, 'rgba(120, 90, 40, 0)')
    g.addColorStop(0.85, 'rgba(120, 90, 40, 0.03)')
    g.addColorStop(0.97, 'rgba(100, 70, 30, 0.07)')
    g.addColorStop(1, 'rgba(120, 90, 40, 0)')
    ctx.fillStyle = g
    ctx.fillRect(sx - r, sy - r, r * 2, r * 2)
  }

  for (var q = 0; q < 260; q++) {
    ctx.fillStyle = 'rgba(70, 50, 30, ' + (0.08 + rnd() * 0.22) + ')'
    ctx.beginPath()
    ctx.arc(rnd() * w, rnd() * h, 0.4 + rnd() * 1.1, 0, Math.PI * 2)
    ctx.fill()
  }

  document.body.style.backgroundImage = 'url(' + c.toDataURL('image/jpeg', 0.82) + ')'
})()
