import { ref } from 'vue'

/**
 * Production's theme switch, exactly as veno implements it.
 *
 * Three things change together, and all three are in the captured DOM:
 *   <html data-bs-theme="dark">   Bootstrap 5.3's own attribute — it is what
 *                                 recolours every stock component.
 *   <body class="dark-theme">     style.css's hook. Its 60-odd dark rules are
 *                                 all written `body.dark-theme …`, so without
 *                                 the class the app layer stays light while
 *                                 Bootstrap goes dark — which is the exact
 *                                 half-themed state this file exists to avoid.
 *   <header data-theme="dark">    the header's own attribute. Nothing in the
 *                                 stylesheet reads it; production emits it, so
 *                                 this does too.
 *
 * The checkbox in the header is bound to `isDark`, which is also what gives it
 * its `checked` attribute — the sliding ball is pure CSS off that checkbox.
 */
const KEY = 'i365.theme'

function read () {
  try { return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light' } catch { return 'light' }
}

export const theme = ref(read())

export function applyTheme (next) {
  theme.value = next === 'dark' ? 'dark' : 'light'
  document.documentElement.setAttribute('data-bs-theme', theme.value)
  document.body.classList.toggle('dark-theme', theme.value === 'dark')
  document.body.classList.toggle('light-theme', theme.value === 'light')
  try { localStorage.setItem(KEY, theme.value) } catch {}
}

export function toggleTheme () {
  applyTheme(theme.value === 'dark' ? 'light' : 'dark')
}

/** Called once at boot, after the inline script in index.html. */
export function restoreTheme () { applyTheme(read()) }
