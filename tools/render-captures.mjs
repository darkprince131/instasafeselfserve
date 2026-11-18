/**
 * Render a PNG beside every `.html` capture, the way the original 502 were.
 *
 * The manifest's method note matters here: the screenshots were *not* taken
 * with DevTools "Capture full size screenshot". The app scrolls inside
 * containers rather than the window, so DevTools only ever returns an 800px
 * viewport. They were rendered from the saved snapshot by headless Chrome at
 * the live viewport width — 1707px — with the scroll containers expanded.
 *
 * This does the same, so a member capture sits beside the admin ones at the
 * same width and the two can be compared without scaling either.
 *
 *   node tools/render-captures.mjs reference/prod-pages
 *   node tools/render-captures.mjs reference/prod-pages member--dashboard--default
 *
 * With a name it renders only that one; without, every .html missing a .png.
 */
import { spawn } from 'node:child_process'
import { readdir, access } from 'node:fs/promises'
import { join, resolve, basename } from 'node:path'

const CHROME = process.env.CHROME ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const WIDTH = Number(process.env.WIDTH || 1707)
const HEIGHT = Number(process.env.HEIGHT || 1200)

const [dir, only] = process.argv.slice(2)
if (!dir) {
  console.error('usage: node tools/render-captures.mjs <dir> [capture-name]')
  process.exit(1)
}

const exists = async (p) => { try { await access(p); return true } catch { return false } }

const files = (await readdir(dir))
  .filter(f => f.endsWith('.html'))
  .filter(f => !only || basename(f, '.html') === only)

if (!files.length) {
  console.error(only ? `no ${only}.html in ${dir}` : `no .html files in ${dir}`)
  process.exit(1)
}

let made = 0
for (const file of files) {
  const name = basename(file, '.html')
  const png = join(dir, name + '.png')
  if (!only && await exists(png)) { console.log(`skip ${name} (png exists)`); continue }

  /* file:// so the ../_assets/ links resolve off disk; the snapshots carry no
     scripts, so there is nothing to wait for beyond layout and webfonts. */
  const url = 'file:///' + resolve(dir, file).replace(/\\/g, '/')
  await new Promise((done, fail) => {
    const p = spawn(CHROME, [
      '--headless=new', '--disable-gpu', '--hide-scrollbars',
      `--window-size=${WIDTH},${HEIGHT}`,
      '--virtual-time-budget=7000',
      `--screenshot=${resolve(png)}`,
      url
    ], { stdio: 'ignore' })
    p.on('exit', (code) => code === 0 ? done() : fail(new Error('chrome exited ' + code)))
    p.on('error', fail)
  }).catch(e => { console.log(`fail ${name}  ${e.message}`); return null })

  if (await exists(png)) { console.log(`ok   ${name}`); made++ }
}

console.log(`\n${made} rendered`)
