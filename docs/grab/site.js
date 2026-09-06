(function () {
  var handle = document.getElementById('handle')
  var box = document.getElementById('print')
  var canvas = document.getElementById('stage')
  var ctx = canvas.getContext('2d')
  var meta = document.getElementById('meta')
  var note = document.getElementById('note')
  var print = null
  var url = ''
  var timer = null

  function say(text) {
    note.textContent = text
    if (timer) clearTimeout(timer)
    timer = setTimeout(function () {
      note.textContent = ''
    }, 2000)
  }

  function show(s) {
    print = AF.generate(s)
    var pressed = AF.ink(print)
    ctx.putImageData(new ImageData(AF.toRGBA(pressed), pressed.width, pressed.height), 0, 0)
    var hash = '#' + encodeURIComponent(s)
    history.replaceState(null, '', hash)
    url = location.origin + location.pathname + hash
    document.title = '@' + s
    meta.innerHTML = '<code>@' + s.replace(/[&<>]/g, function (c) {
      return c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'
    }) + '</code>, ' + print.pattern.replace('-', ' ') + ', ' + print.minutiae.length + ' minutiae'
  }

  function grab(value) {
    var s = value.trim().replace(/^@/, '').toLowerCase()
    if (!s) return
    handle.value = s
    box.hidden = false
    meta.textContent = 'growing'
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

  document.getElementById('form').addEventListener('submit', function (e) {
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
