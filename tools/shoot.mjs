/**
 * Screenshot harness for pixel-matching against `reference/prod-pages/*.png`.
 *
 * Headless Chrome's `--screenshot` flag shoots as soon as its virtual-time
 * budget expires, and virtual time does not wait for IndexedDB — so every
 * list came out empty, which is the one thing a list screen must not be when
 * you are comparing it to a capture of 1,821 users. This drives Chrome over
 * the DevTools Protocol instead and waits for a condition on the page before
 * it shoots.
 *
 *   node tools/shoot.mjs out-dir route::name[::ready-expression] …
 *
 * The ready expression is evaluated in the page until it is true. It defaults
 * to "the list has rows and the counter is not 0-0 of 0", because the loading
 * state renders placeholder rows — waiting on `tbody tr` alone shot every
 * screen mid-load, which is exactly the failure this harness exists to avoid.
 * Pass `-` for screens with no list.
 *
 * No dependencies: Node 22's global WebSocket talks to Chrome directly.
 */
import { spawn } from 'node:child_process'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = process.env.CHROME ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const BASE = process.env.BASE || 'http://localhost:5179'
const WIDTH = Number(process.env.WIDTH || 1500)
const HEIGHT = Number(process.env.HEIGHT || 1000)
const PORT = Number(process.env.CDP_PORT || 9333)

const [outDir, ...specs] = process.argv.slice(2)
if (!outDir || !specs.length) {
  console.error('usage: node tools/shoot.mjs <out-dir> <route:name[:selector]> …')
  process.exit(1)
}

const profile = join(tmpdir(), 'i365-shoot-profile')
await mkdir(outDir, { recursive: true })

const chrome = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-features=Translate,MediaRouter',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`,
  `--window-size=${WIDTH},${HEIGHT}`,
  'about:blank'
], { stdio: 'ignore' })

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

/** Chrome needs a moment before /json/version answers. */
async function endpoint () {
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`)
      return (await r.json()).webSocketDebuggerUrl
    } catch { await sleep(150) }
  }
  throw new Error('Chrome did not open a debugging port')
}

const ws = new WebSocket(await endpoint())
await new Promise(r => ws.addEventListener('open', r, { once: true }))

let nextId = 1
const pending = new Map()
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id)
    pending.delete(msg.id)
    msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result)
  }
})
function send (method, params = {}, sessionId) {
  const id = nextId++
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params, sessionId }))
  })
}

const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
await send('Page.enable', {}, sessionId)
await send('Runtime.enable', {}, sessionId)
await send('Emulation.setDeviceMetricsOverride', {
  width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false
}, sessionId)

async function evaluate (expression) {
  const r = await send('Runtime.evaluate', {
    expression, returnByValue: true, awaitPromise: true
  }, sessionId)
  return r.result?.value
}

const LIST_READY = `(() => {
  const n = document.querySelector('.fs-6.text-nowrap')
  if (n && /^0-0 of 0$/.test(n.textContent.trim())) return false
  return !!document.querySelector('table tbody tr td input[type=checkbox], table tbody tr td .badge')
})()`
const BARE_READY = 'document.readyState === "complete" && !!document.querySelector("#app > *")'

/**
 * A signed-in sandbox, before anything is shot.
 *
 * The console is behind a gate now, so every route redirects to sign-up
 * until there is a session. The harness writes one the way the app does —
 * `lib/trial.js`'s own localStorage key — rather than driving three screens
 * before each screenshot.
 */
await send('Page.navigate', { url: BASE + '/signin' }, sessionId)
await sleep(900)
await evaluate(`localStorage.setItem('i365.theme', ${JSON.stringify(process.env.THEME || 'light')}); true`).catch(() => {})
await evaluate(`localStorage.setItem('i365.trial', JSON.stringify({
  signedIn: true, name: 'Veno', adminEmail: 'admin@example.com',
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 14 * 864e5).toISOString(),
  lastLogin: '08-09-2026 11:53:47', done: {}
})); true`).catch(() => {})

for (const spec of specs) {
  const [route, name, ready_expr, after_expr] = spec.split('::')
  const expr = !ready_expr ? LIST_READY : ready_expr === '-' ? BARE_READY : ready_expr
  await send('Page.navigate', { url: BASE + route }, sessionId)

  // wait for the app to render, then for the screen's own evidence of data
  let ready = false
  for (let i = 0; i < 200; i++) {
    await sleep(125)
    const ok = await evaluate(expr).catch(() => false)
    if (ok) { ready = true; break }
  }
  /* A state that only exists after an interaction - the add panel, the
     delete confirm, the user menu - is reached by running it here, once the
     screen is loaded, rather than by capturing a different URL. */
  if (after_expr) {
    await evaluate(after_expr).catch((e) => console.log('  after: ' + e.message))
    await sleep(900)
  }

  // let fonts settle and any transition finish
  await evaluate('document.fonts ? document.fonts.ready.then(() => true) : true').catch(() => {})
  await sleep(450)

  const { data } = await send('Page.captureScreenshot', { format: 'png' }, sessionId)
  await writeFile(join(outDir, `${name}.png`), Buffer.from(data, 'base64'))
  console.log(`${ready ? 'ok  ' : 'WAIT'} ${name}  ${route}`)
}

ws.close()
chrome.kill()
await rm(profile, { recursive: true, force: true }).catch(() => {})
