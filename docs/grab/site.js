(function () {
  var handle = document.getElementById('handle')
  var canvas = document.getElementById('stage')
  var ctx = canvas.getContext('2d')
  var tools = document.getElementById('tools')
  var hint = document.getElementById('hint')
  var print = null
  var url = ''
  var frame = null
  var timer = null

  function say(text) {
    hint.textContent = text
    if (timer) clearTimeout(timer)
    timer = setTimeout(function () {
      hint.textContent = ''
    }, 2000)
  }

  function grow(pressed) {
    var w = pressed.width, h = pressed.height, n = w * h
    var seed = 0
    for (var c = 0; c < pressed.seed.length; c++) seed = (seed * 31 + pressed.seed.charCodeAt(c)) >>> 0
    var pts = []
    while (pts.length < 6) {
      seed = (seed * 1664525 + 1013904223) >>> 0
      var x = seed % w
      seed = (seed * 1664525 + 1013904223) >>> 0
      var y = seed % h
      if (pressed.mask[y * w + x]) pts.push(x, y)
    }
    var dist = new Float32Array(n)
    var far = 0
    for (var i = 0; i < n; i++) {
      var px = i % w, py = (i - px) / w
      var best = 1e9
      for (var k = 0; k < pts.length; k += 2) {
        var dx = px - pts[k], dy = py - pts[k + 1]
        var dd = dx * dx + dy * dy
        if (dd < best) best = dd
      }
      dist[i] = Math.sqrt(best)
      if (pressed.mask[i] && dist[i] > far) far = dist[i]
    }
    var img = ctx.createImageData(w, h)
    var d = img.data
    var t0 = performance.now()
    if (frame) cancelAnimationFrame(frame)
    var tick = function (now) {
      var t = Math.min(1, (now - t0) / 1600)
      var edge = t * (far + 24)
      for (var j = 0, o = 0; j < n; j++, o += 4) {
        var a = 0
        if (pressed.mask[j]) {
          var v = pressed.pixels[j]
          var ink = v < 232 ? (232 - v) / 232 : 0
          var r = (edge - dist[j]) / 24
          if (r > 1) r = 1
          if (r > 0) a = ink * r
        }
        d[o + 3] = a * 255
      }
      ctx.putImageData(img, 0, 0)
      if (t < 1) frame = requestAnimationFrame(tick)
      else frame = null
    }
    frame = requestAnimationFrame(tick)
  }

  function show(s) {
    print = AF.generate(s)
    var pressed = AF.ink(print)
    var hash = '#' + encodeURIComponent(s)
    history.replaceState(null, '', hash)
    url = location.origin + location.pathname + hash
    document.title = '@' + s
    document.getElementById('m-class').textContent = print.pattern.replace('-', ' ')
    document.getElementById('m-count').textContent = print.minutiae.length
    document.getElementById('m-link').textContent = url.replace(/^https?:\/\//, '')
    grow(pressed)
    tools.hidden = false
    hint.textContent = ''
  }

  function grab(value) {
    var s = value.trim().replace(/^@/, '').toLowerCase()
    if (!s) return
    handle.value = s
    hint.textContent = 'rolling'
    setTimeout(function () {
      show(s)
    }, 16)
  }

  function download(ext, href) {
    var a = document.createElement('a')
    a.href = href
    a.download = print.seed + '.' + ext
    a.click()
  }

  var now = new Date()
  document.getElementById('m-date').textContent = [
    String(now.getDate()).padStart(2, '0'),
    String(now.getMonth() + 1).padStart(2, '0'),
    now.getFullYear(),
  ].join('/')

  document.getElementById('sheet').addEventListener('submit', function (e) {
    e.preventDefault()
    grab(handle.value)
  })
  document.getElementById('png').addEventListener('click', function () {
    download('png', canvas.toDataURL('image/png'))
  })
  document.getElementById('svg').addEventListener('click', function () {
    download('svg', 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(AF.toSVG(print)))
  })
  document.getElementById('share').addEventListener('click', function () {
    if (navigator.share) {
      navigator.share({ title: '@' + print.seed, url: url })
      return
    }
    navigator.clipboard.writeText(url).then(function () {
      say('link copied')
    }, function () {
      prompt('Copy the link', url)
    })
  })

  if (location.hash.length > 1) grab(decodeURIComponent(location.hash.slice(1)))
  else handle.focus()
})()
