(function () {
  var root = document.documentElement
  var prefs = {}
  try {
    prefs = JSON.parse(localStorage.getItem('af-prefs') || '{}')
  } catch (e) {}

  var scales = { smaller: 0.9, normal: 1, larger: 1.15 }
  var widths = { narrow: '38rem', normal: '46rem', wide: '58rem' }

  function apply() {
    root.style.setProperty('--scale', scales[prefs.size] || 1)
    root.style.setProperty('--width', widths[prefs.width] || widths.normal)
    var links = document.querySelectorAll('.prefs a[data-key]')
    for (var i = 0; i < links.length; i++) {
      var key = links[i].getAttribute('data-key')
      var val = links[i].getAttribute('data-value')
      var cur = prefs[key] || (key === 'size' ? 'normal' : key === 'width' ? 'normal' : 'system')
      links[i].setAttribute('aria-pressed', cur === val ? 'true' : 'false')
    }
  }

  function save() {
    try {
      localStorage.setItem('af-prefs', JSON.stringify(prefs))
    } catch (e) {}
  }

  var prefLinks = document.querySelectorAll('.prefs a[data-key]')
  for (var i = 0; i < prefLinks.length; i++) {
    prefLinks[i].addEventListener('click', function (e) {
      e.preventDefault()
      prefs[this.getAttribute('data-key')] = this.getAttribute('data-value')
      save()
      apply()
    })
  }
  apply()

  function still() {
    if (prefs.motion === 'off') return true
    if (prefs.motion === 'on') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  var frame = null

  function halt() {
    if (frame) {
      cancelAnimationFrame(frame)
      frame = null
    }
  }

  function settle(el) {
    if (!el) return
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1')
    el.focus({ preventScroll: true })
  }

  function go(el, y) {
    var max = document.documentElement.scrollHeight - window.innerHeight
    if (y > max) y = max
    if (y < 0) y = 0
    halt()
    if (still()) {
      window.scrollTo(0, y)
      settle(el)
      return
    }
    var from = window.scrollY
    var span = y - from
    if (Math.abs(span) < 2) {
      settle(el)
      return
    }
    var ms = Math.min(650, Math.max(220, Math.abs(span) * 0.35))
    var t0 = performance.now()
    var tick = function (now) {
      var t = (now - t0) / ms
      if (t > 1) t = 1
      var e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      window.scrollTo(0, from + span * e)
      if (t < 1) frame = requestAnimationFrame(tick)
      else {
        frame = null
        settle(el)
      }
    }
    frame = requestAnimationFrame(tick)
  }

  window.addEventListener('wheel', halt, { passive: true })
  window.addEventListener('touchstart', halt, { passive: true })
  window.addEventListener('keydown', function (e) {
    if (e.key === 'PageDown' || e.key === 'PageUp' || e.key === ' ' || e.key === 'End' || e.key === 'Home') halt()
  })

  var anchors = document.querySelectorAll('a[href^="#"]')
  for (var j = 0; j < anchors.length; j++) {
    if (anchors[j].hasAttribute('data-key')) continue
    anchors[j].addEventListener('click', function (e) {
      var href = this.getAttribute('href')
      if (href === '#') {
        e.preventDefault()
        history.replaceState(null, '', location.pathname)
        go(document.getElementById('page'), 0)
        return
      }
      var el = document.getElementById(href.slice(1))
      if (!el) return
      e.preventDefault()
      history.replaceState(null, '', href)
      go(el, el.getBoundingClientRect().top + window.scrollY - 10)
    })
  }

  var jump = document.getElementById('jump')
  var contents = document.getElementById('contents')
  var waiting = false

  function watch() {
    var past = contents.getBoundingClientRect().bottom < 0
    jump.setAttribute('data-show', past ? '1' : '0')
  }

  window.addEventListener('scroll', function () {
    if (waiting) return
    waiting = true
    requestAnimationFrame(function () {
      watch()
      waiting = false
    })
  }, { passive: true })
  watch()

  if (location.hash) {
    var target = document.getElementById(location.hash.slice(1))
    if (target) setTimeout(function () {
      go(target, target.getBoundingClientRect().top + window.scrollY - 10)
    }, 80)
  }

  if (typeof AF === 'undefined') return

  var seed = document.getElementById('seed')
  var inkBox = document.getElementById('opt-ink')
  var markBox = document.getElementById('opt-minutiae')
  var canvas = document.getElementById('stage')
  var ctx = canvas.getContext('2d')
  var out = document.getElementById('readout')
  var timer = null

  function esc(s) {
    return String(s).replace(/[&<>]/g, function (c) {
      return c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'
    })
  }

  function rows(list) {
    var html = '<table>'
    for (var i = 0; i < list.length; i++) html += '<tr><td>' + list[i][0] + '</td><td>' + list[i][1] + '</td></tr>'
    return html + '</table>'
  }

  function paint(value) {
    var t0 = performance.now()
    var clean = AF.generate(value)
    var shown = inkBox.checked ? AF.ink(clean) : clean
    var ms = performance.now() - t0

    canvas.width = shown.width
    canvas.height = shown.height
    var img = ctx.createImageData(shown.width, shown.height)
    for (var i = 0, j = 0; i < shown.pixels.length; i++, j += 4) {
      img.data[j] = img.data[j + 1] = img.data[j + 2] = shown.pixels[i]
      img.data[j + 3] = 255
    }
    ctx.putImageData(img, 0, 0)

    var endings = 0
    for (var k = 0; k < clean.minutiae.length; k++) if (clean.minutiae[k].type === 'ending') endings++

    if (markBox.checked) {
      ctx.lineWidth = 1
      for (var m = 0; m < clean.minutiae.length; m++) {
        var pt = clean.minutiae[m]
        ctx.strokeStyle = pt.type === 'ending' ? '#c00' : '#00c'
        ctx.strokeRect(pt.x - 3.5, pt.y - 3.5, 7, 7)
        ctx.beginPath()
        ctx.moveTo(pt.x + Math.cos(pt.angle) * 4, pt.y + Math.sin(pt.angle) * 4)
        ctx.lineTo(pt.x + Math.cos(pt.angle) * 11, pt.y + Math.sin(pt.angle) * 11)
        ctx.stroke()
      }
    }

    out.innerHTML = rows([
      ['seed', esc(clean.seed)],
      ['class', clean.pattern],
      ['minutiae', clean.minutiae.length + ' (' + endings + ' endings, ' + (clean.minutiae.length - endings) + ' bifurcations)'],
      ['ridge period', clean.period.toFixed(2) + ' px'],
      ['size', clean.width + ' x ' + clean.height],
      ['time', ms.toFixed(0) + ' ms'],
    ])
  }

  function run() {
    if (timer) clearTimeout(timer)
    out.innerHTML = rows([['status', 'generating']])
    timer = setTimeout(function () {
      timer = null
      paint(seed.value)
    }, 16)
  }

  document.getElementById('demo-form').addEventListener('submit', function (e) {
    e.preventDefault()
    run()
  })
  document.getElementById('demo-random').addEventListener('click', function () {
    seed.value = 'citizen-' + Math.floor(Math.random() * 9000 + 1000)
    run()
  })
  inkBox.addEventListener('change', run)
  markBox.addEventListener('change', run)
  run()

  var a = document.getElementById('match-a')
  var b = document.getElementById('match-b')
  var res = document.getElementById('match-out')

  function match() {
    res.innerHTML = rows([['status', 'matching']])
    setTimeout(function () {
      var t0 = performance.now()
      var pa = AF.generate(a.value)
      var pb = AF.generate(b.value)
      var r = AF.compare(pa, pb)
      var ms = performance.now() - t0
      res.innerHTML = rows([
        ['score', r.score.toFixed(3)],
        ['matched', r.matched + ' of ' + Math.min(pa.minutiae.length, pb.minutiae.length)],
        ['rotation', (r.rotation * 180 / Math.PI).toFixed(1) + ' deg'],
        ['offset', r.dx.toFixed(0) + ', ' + r.dy.toFixed(0) + ' px'],
        ['verdict', r.score > 0.3 ? 'same finger' : 'different fingers'],
        ['time', ms.toFixed(0) + ' ms'],
      ])
    }, 16)
  }

  document.getElementById('match-form').addEventListener('submit', function (e) {
    e.preventDefault()
    match()
  })
  match()

  var name = document.getElementById('grab-name')
  var result = document.getElementById('grab-result')
  var sheet = document.getElementById('grab-stage')
  var sctx = sheet.getContext('2d')
  var grabOut = document.getElementById('grab-out')
  var link = document.getElementById('grab-link')
  var copy = document.getElementById('grab-copy')
  var grabbed = null

  function show(s) {
    var print = AF.generate(s)
    var pressed = AF.ink(print)
    sheet.width = pressed.width
    sheet.height = pressed.height
    sctx.putImageData(new ImageData(AF.toRGBA(pressed), pressed.width, pressed.height), 0, 0)
    grabbed = print
    var hash = '#grab=' + encodeURIComponent(s)
    history.replaceState(null, '', hash)
    link.value = location.origin + location.pathname + hash
    grabOut.innerHTML = rows([
      ['name', esc(s)],
      ['class', print.pattern],
      ['minutiae', print.minutiae.length],
      ['ridge period', print.period.toFixed(2) + ' px'],
    ])
  }

  function grab(value) {
    var s = value.trim().replace(/^@/, '').toLowerCase()
    if (!s) return
    name.value = s
    result.hidden = false
    grabOut.innerHTML = rows([['status', 'generating']])
    setTimeout(function () {
      show(s)
    }, 16)
  }

  function download(file, href) {
    var a = document.createElement('a')
    a.href = href
    a.download = file
    a.click()
  }

  document.getElementById('grab-form').addEventListener('submit', function (e) {
    e.preventDefault()
    grab(name.value)
  })
  copy.addEventListener('click', function () {
    link.select()
    navigator.clipboard.writeText(link.value).catch(function () {
      document.execCommand('copy')
    })
    copy.textContent = 'Copied'
    setTimeout(function () {
      copy.textContent = 'Copy link'
    }, 1500)
  })
  document.getElementById('grab-png').addEventListener('click', function () {
    download(grabbed.seed + '.png', sheet.toDataURL('image/png'))
  })
  document.getElementById('grab-svg').addEventListener('click', function () {
    download(grabbed.seed + '.svg', 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(AF.toSVG(grabbed)))
  })

  var claim = /^#grab=(.+)/.exec(location.hash)
  if (claim) {
    grab(decodeURIComponent(claim[1]))
    var here = document.getElementById('grab')
    setTimeout(function () {
      go(here, here.getBoundingClientRect().top + window.scrollY - 10)
    }, 80)
  }
})()
