/**
 * vcap — an in-page DOM serializer, for capturing a signed-in console screen.
 *
 * The 502 snapshots in `C:\InstaSafe ConsoleDesign\evidence\capture\` were
 * taken with a serializer of this shape, but its source was never kept — only
 * the manifest describing what it did. This rebuilds it from that description
 * so new captures land in the same format as the old ones and the two sets
 * stay comparable.
 *
 * Why not Ctrl+S. "Webpage, Complete" saves the parsed document, which drops
 * three things that matter here:
 *
 *   - rules injected through the CSSOM (`insertRule`), which never appear in
 *     a <style> element's text,
 *   - what you typed: `value`, `checked` and `selected` live on the element,
 *     not in the attribute the serializer writes out,
 *   - chart <canvas>, which saves as a blank box.
 *
 * It also keeps the scripts, so the file re-runs the app offline and repaints
 * the page you were trying to capture.
 *
 *   HOW TO USE
 *   1. Sign in and navigate to the page you want.
 *   2. Open DevTools → Console, paste this whole file, press Enter.
 *   3. Call it with the name the file should take:
 *
 *        vcap('member--dashboard--default')
 *
 *      It downloads `member--dashboard--default.html` and prints any asset it
 *      could not account for.
 *   4. Repeat per screen, then move the files into `reference/prod-pages/`.
 *
 * Nothing is sent anywhere: it reads the page you are on and hands you a file.
 * It only ever reads — no click, no submit, no navigation.
 */
(function () {
  /* Assets are mirrored by server path, so a stylesheet served at
     /dist/css/style.css is linked as ../_assets/dist/css/style.css. Anything
     already under _assets from the admin capture is reused as-is. */
  const ASSET_BASE = '../_assets/'

  const seen = new Set()

  /** An absolute URL on this origin becomes its mirrored `_assets` path. */
  function toAsset (raw) {
    if (!raw) return raw
    if (/^(data:|blob:|#|mailto:|javascript:)/i.test(raw)) return raw
    let u
    try { u = new URL(raw, location.href) } catch { return raw }
    if (u.origin !== location.origin) return raw
    /* S3-signed URLs expire and carry a signature; keep the path, drop the
       query, exactly as the first capture did. */
    const path = u.pathname.replace(/^\/+/, '')
    if (!path) return raw
    seen.add(path)
    return ASSET_BASE + path
  }

  function vcap (state, note) {
    if (!state) { console.error('vcap: pass a name, e.g. vcap("member--dashboard--default")'); return }

    const doc = document.documentElement.cloneNode(true)

    /* ---- carry over live state the attributes do not hold ---------------- */
    const live = document.querySelectorAll('input, textarea, select')
    const copy = doc.querySelectorAll('input, textarea, select')
    live.forEach((el, i) => {
      const to = copy[i]
      if (!to) return
      if (el.tagName === 'SELECT') {
        Array.from(el.options).forEach((o, j) => {
          if (o.selected) to.options[j]?.setAttribute('selected', '')
          else to.options[j]?.removeAttribute('selected')
        })
      } else if (el.type === 'checkbox' || el.type === 'radio') {
        if (el.checked) to.setAttribute('checked', '')
        else to.removeAttribute('checked')
      } else if (el.type === 'password') {
        to.setAttribute('value', '')            // never write a password out
      } else if (el.tagName === 'TEXTAREA') {
        to.textContent = el.value
      } else {
        to.setAttribute('value', el.value)
      }
    })

    /* ---- rules injected through the CSSOM -------------------------------- */
    const liveStyles = document.querySelectorAll('style')
    const copyStyles = doc.querySelectorAll('style')
    liveStyles.forEach((el, i) => {
      if (!copyStyles[i]) return
      try {
        const rules = Array.from(el.sheet?.cssRules || []).map(r => r.cssText).join('\n')
        if (rules) copyStyles[i].textContent = rules
      } catch { /* cross-origin sheet; leave the element as it is */ }
    })

    /* ---- charts: a <canvas> saves blank, so bake it to a PNG ------------- */
    const liveCanvas = document.querySelectorAll('canvas')
    const copyCanvas = doc.querySelectorAll('canvas')
    liveCanvas.forEach((el, i) => {
      const to = copyCanvas[i]
      if (!to) return
      let data = ''
      try { data = el.toDataURL('image/png') } catch { /* tainted */ }
      if (!data) return
      const img = document.createElement('img')
      img.setAttribute('data-vcap', 'canvas')
      img.setAttribute('src', data)
      img.setAttribute('width', el.width)
      img.setAttribute('height', el.height)
      if (el.className) img.className = el.className
      to.replaceWith(img)
    })

    /* ---- scripts out, so the file can never call the API ----------------- */
    doc.querySelectorAll('script, noscript').forEach(el => el.remove())

    /* ---- redact, then point every asset at the mirror -------------------- */
    const csrf = doc.querySelector('meta[name="csrf-token"]')
    if (csrf) csrf.setAttribute('content', 'REDACTED')
    doc.querySelectorAll('meta[name*="token" i]').forEach(m => m.setAttribute('content', 'REDACTED'))

    doc.querySelectorAll('[href], [src], [srcset], [data-src]').forEach(el => {
      for (const attr of ['href', 'src', 'data-src']) {
        if (el.hasAttribute(attr)) el.setAttribute(attr, toAsset(el.getAttribute(attr)))
      }
      /* srcset would need every candidate rewritten; the captures do not use
         it, so drop it rather than leave a live origin in the file. */
      if (el.hasAttribute('srcset')) el.removeAttribute('srcset')
    })
    doc.querySelectorAll('[style*="url("]').forEach(el => {
      el.setAttribute('style', el.getAttribute('style').replace(
        /url\((['"]?)([^'")]+)\1\)/gi, (_, q, u) => `url(${q}${toAsset(u)}${q})`))
    })

    /* ---- the header the other 502 files carry ---------------------------- */
    const meta = {
      state: state,
      note: note || '',
      url: location.href,
      title: document.title,
      captured: new Date().toISOString(),
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      dpr: window.devicePixelRatio,
      scrollY: window.scrollY
    }

    const html = '<!DOCTYPE html>\n<!-- vcap ' + JSON.stringify(meta) + ' -->\n' + doc.outerHTML

    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
    a.download = state + '.html'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 5000)

    console.log('%cvcap ' + state, 'color:#f60;font-weight:700', meta.viewport, meta.url)
    console.log('assets this page references (check each exists under reference/_assets/):')
    console.table(Array.from(seen).sort().map(p => ({ path: p })))
    seen.clear()
  }

  window.vcap = vcap
  console.log('%cvcap ready', 'color:#f60;font-weight:700',
    '— call vcap("member--dashboard--default")')
})()
