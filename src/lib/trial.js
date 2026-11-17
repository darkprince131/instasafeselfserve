import { ref, computed } from 'vue'

/**
 * The trial's own state: who is signed in, what their sandbox is called, and
 * when it ends. Deliberately outside `src/api` — that is the console's data
 * contract and it is correct; this is the layer production does not have.
 *
 * Everything lives in localStorage, so a visitor who closes the tab and comes
 * back is still in their sandbox. The sandbox data itself is IndexedDB (mock)
 * or a Neon row keyed by an HttpOnly cookie (http); neither of those changes
 * here.
 *
 * Open questions from CLAUDE.md §8, and what this file decides:
 *   §8.1 trial boundary — time-limited, 14 days. A seat limit would collide
 *        with the seeded 1,820 users, which is the thing worth showing.
 *   §8.2 one sandbox per visitor, which is what the forked code already does.
 *   §8.3 lead capture — the work e-mail is kept locally and the verification
 *        code goes to the Demo Inbox. Nothing is sent anywhere.
 *   §8.4 tenant logo stays InstaSafe's, as every ZTNA vendor's admin console
 *        does; the end-user portal is where a customer's own logo belongs.
 */

const KEY = 'i365.trial'
const DAYS = 14

function blank () {
  return {
    signedIn: false,
    name: 'Trial',
    adminEmail: '',
    company: '',
    createdAt: null,
    expiresAt: null,
    lastLogin: null,
    /* Which first-run steps are done. The dashboard's Quick Start Guide
       reads this; see components/trial/QuickStart.vue. */
    done: {}
  }
}

function read () {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return blank()
    return { ...blank(), ...JSON.parse(raw) }
  } catch { return blank() }
}

export const tenant = ref(read())

export function save (patch = {}) {
  tenant.value = { ...tenant.value, ...patch }
  try { localStorage.setItem(KEY, JSON.stringify(tenant.value)) } catch {}
  return tenant.value
}

export function stamp (d = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ` +
         `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/** Called when a visitor finishes sign-up, or signs in again. */
export function startSession ({ name, adminEmail, company } = {}) {
  const now = new Date()
  const created = tenant.value.createdAt ? new Date(tenant.value.createdAt) : now
  const expires = tenant.value.expiresAt
    ? new Date(tenant.value.expiresAt)
    : new Date(created.getTime() + DAYS * 864e5)
  return save({
    signedIn: true,
    name: name || tenant.value.name || 'Trial',
    adminEmail: adminEmail || tenant.value.adminEmail,
    company: company || tenant.value.company,
    createdAt: created.toISOString(),
    expiresAt: expires.toISOString(),
    lastLogin: stamp(now)
  })
}

export function endSession () { save({ signedIn: false }) }

/** Mark a Quick Start step complete. Idempotent. */
export function markDone (step) {
  if (tenant.value.done?.[step]) return
  save({ done: { ...tenant.value.done, [step]: new Date().toISOString() } })
}

export function forgetTrial () {
  try { localStorage.removeItem(KEY) } catch {}
  tenant.value = blank()
}

export const daysLeft = computed(() => {
  if (!tenant.value.expiresAt) return DAYS
  return Math.max(0, Math.ceil((new Date(tenant.value.expiresAt) - Date.now()) / 864e5))
})

export const expired = computed(() =>
  !!tenant.value.expiresAt && new Date(tenant.value.expiresAt) <= new Date())

export const TRIAL_DAYS = DAYS
