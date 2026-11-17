/**
 * Walk every destination in the console and report anything the page logs.
 *
 * 69 routes resolve to something built, and a re-skin touches all of them —
 * a template that still references a ref a sweep removed renders blank with
 * only a warning in the console, which is exactly the failure a screenshot
 * of one screen does not catch. This opens each one and fails loudly.
 *
 *   node tools/check-routes.mjs
 */
import { spawn } from 'node:child_process'
import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readFileSync } from 'node:fs'

const CHROME = process.env.CHROME ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const BASE = process.env.BASE || 'http://localhost:5179'
const PORT = Number(process.env.CDP_PORT || 9341)

/* The nav is the source of truth for what exists; parse it rather than
   keeping a second list that can drift. */
const navSrc = readFileSync(new URL('../src/router/nav.js', import.meta.url), 'utf8')
const routes = [...navSrc.matchAll(/to:\s*'([^']+)'/g)].map(m => m[1])
routes.unshift('/signin', '/signup', '/portal', '/not-a-route')

const profile = join(tmpdir(), 'i365-check-profile')
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--window-size=1400,900', 'about:blank'
], { stdio: 'ignore' })

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

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
let bucket = []
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.method === 'Runtime.exceptionThrown') {
    const d = msg.params.exceptionDetails
    bucket.push('EXCEPTION ' + (d.exception?.description || d.text || '').split('\n')[0])
  }
  if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) {
    const text = msg.params.args.map(a => a.value ?? a.description ?? '').join(' ')
    /* Vue's Suspense notice is informational and fires on every route. */
    if (!/experimental feature/.test(text)) bucket.push(msg.params.type.toUpperCase() + ' ' + text.split('\n')[0].slice(0, 180))
  }
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

const evaluate = async (expr) =>
  (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, sessionId)).result?.value

await send('Page.navigate', { url: BASE + '/signin' }, sessionId)
await sleep(1200)
await evaluate(`localStorage.setItem('i365.trial', JSON.stringify({
  signedIn: true, name: 'Veno', adminEmail: 'admin@example.com',
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 14 * 864e5).toISOString(),
  lastLogin: '08-09-2026 11:53:47', done: {}
})); true`).catch(() => {})

let bad = 0
for (const route of routes) {
  bucket = []
  await send('Page.navigate', { url: BASE + route }, sessionId)
  await sleep(2200)
  const shown = await evaluate('!!document.querySelector("#app > *") && document.body.innerText.trim().length > 20')
  const problems = [...new Set(bucket)]
  if (!shown) problems.unshift('BLANK the page rendered nothing')
  if (problems.length) {
    bad++
    console.log(`\n✗ ${route}`)
    for (const p of problems.slice(0, 6)) console.log('    ' + p)
  } else {
    console.log(`✓ ${route}`)
  }
}

console.log(`\n${routes.length - bad}/${routes.length} clean`)
ws.close()
chrome.kill()
await rm(profile, { recursive: true, force: true }).catch(() => {})
process.exit(bad ? 1 : 0)
