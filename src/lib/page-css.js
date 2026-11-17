/**
 * pagescss.css, attached per route.
 *
 * Production serves two different pages. The console pages load
 * vendor.css + style.css; the signed-out pages — sign-in, sign-up, OTP,
 * the 404 — load vendor.css + pagescss.css instead. They are not additive:
 * pagescss redefines `body` (black, `overflow:auto`), `.form-control`
 * (transparent, bottom-rule only) and `.btn-primary` (orange, full width),
 * so loading it alongside style.css would repaint every console screen.
 *
 * So it is attached when a bare route is entered and detached when one is
 * left, which reproduces production's two-page split inside one SPA.
 */
import { theme, applyTheme } from './theme.js'

const ID = 'prod-pagescss'
const HREF = '/prod/css/pagescss.css'

export function setPageCss (on) {
  const existing = document.getElementById(ID)
  if (on && !existing) {
    const link = document.createElement('link')
    link.id = ID
    link.rel = 'stylesheet'
    link.href = HREF
    document.head.appendChild(link)
    /* pagescss sets `--login-background` nowhere; production injects it
       inline per tenant. Same image, same variable. */
    document.documentElement.style.setProperty('--login-background', "url('/prod/img/bg_signup.png')")
  } else if (!on && existing) {
    existing.remove()
  }

  /**
   * The theme class has to come off with it.
   *
   * style.css declares the palette twice — once on `:root` and again on
   * `body.light-theme` — and pagescss redeclares it on `:root` only. A class
   * on `body` beats a `:root` rule for everything inside body, so with
   * `light-theme` still on, pagescss's `--text-color: #e0e0e0` lost to
   * style.css's `#121212` and every label on the sign-in card rendered black
   * on black. Production's signed-out pages carry no class at all, so
   * neither do these.
   */
  document.body.classList.toggle('signed-out', !!on)
  if (on) {
    document.body.classList.remove('light-theme', 'dark-theme')
  } else {
    applyTheme(theme.value)
  }
}
