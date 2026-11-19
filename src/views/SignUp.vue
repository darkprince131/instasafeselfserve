<script setup>
import { ref, nextTick } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import api from '../api'
import { startSession, save, TRIAL_DAYS } from '../lib/trial.js'

/**
 * Sign-up — the thing production does not have.
 *
 * Production tenants are provisioned by InstaSafe; there is no public form
 * anywhere in veno. So this screen has no capture to match, and it is built
 * instead from the one production page that is closest to it: the sign-in,
 * same `.glass-card`, same pagescss.css, same orange `.btn-primary`. A
 * visitor who signs up and then signs in sees one page twice, not two pages.
 *
 * Four steps: work e-mail, the code, what to call the tenant, then in.
 *
 * On the open questions in CLAUDE.md §8 this takes the stated defaults and
 * says so here rather than burying them:
 *   §8.1 the trial is time-limited to 14 days. Seat-limiting would collide
 *        with the 1,821 seeded users, which is the thing worth showing.
 *   §8.2 one sandbox per visitor — a cookie and a row, which is what the
 *        forked code already does.
 *   §8.3 the work e-mail is kept locally and the code goes to the Demo
 *        Inbox. Nothing is sent anywhere and the screen says so.
 *   §8.4 the header keeps InstaSafe's logo. Most ZTNA vendors allow a
 *        customer's own mark on the end-user portal and not in the admin
 *        console, so the tenant name is what changes.
 */

const router = useRouter()
const route = useRoute()
const step = ref('email')
const email = ref('')
const code = ref('')
const expected = ref('')
const company = ref('')
const error = ref('')
const busy = ref(false)

/* Nothing here sends mail. The code is generated locally and dropped into
   the Demo Inbox, which is the same destination every other simulated
   channel in this console uses. */
function sixDigits () {
  const n = new Uint32Array(1)
  crypto.getRandomValues(n)
  return String(n[0] % 1000000).padStart(6, '0')
}

const FREE = /@(gmail|yahoo|outlook|hotmail|icloud|proton(mail)?|aol|gmx|mail)\./i

async function sendCode () {
  error.value = ''
  const value = email.value.trim()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
    error.value = 'That does not look like an e-mail address.'
    return
  }
  if (FREE.test(value)) {
    error.value = 'Please use your work e-mail address.'
    return
  }
  busy.value = true
  try {
    expected.value = sixDigits()
    await api.inbox.create({
      id: 'msg_' + Date.now().toString(36),
      kind: 'email',
      subject: 'Verify your e-mail',
      body: `Your InstaSafe trial verification code is ${expected.value}. It is good for ten minutes.`,
      meta: { to: value, code: expected.value },
      read: false,
      at: new Date().toISOString()
    })
    save({ adminEmail: value })
    step.value = 'code'
    await nextTick()
    document.getElementById('code')?.focus()
  } catch (e) {
    error.value = e?.message || 'Could not start the trial. Try again.'
  } finally { busy.value = false }
}

function checkCode () {
  error.value = ''
  if (code.value !== expected.value) {
    error.value = 'That code does not match the one in the Demo Inbox.'
    return
  }
  step.value = 'tenant'
  nextTick(() => document.getElementById('company')?.focus())
}

/** The tenant name is what the header prints where veno prints "Veno". */
async function create () {
  error.value = ''
  const name = company.value.trim()
  if (!name) { error.value = 'Give the tenant a name.' ; return }
  busy.value = true
  try {
    startSession({ name, company: name, adminEmail: email.value.trim() })
    router.push(route.query.next || '/dashboard')
  } finally { busy.value = false }
}

function onCode (e) {
  code.value = e.target.value.replace(/\D/g, '').slice(0, 6)
}
</script>

<template>
  <div class="background-container" />
  <div class="main-container">
    <div class="glass-card">
      <img src="/brand/instasafe-lockup-color.svg" alt="InstaSafe" class="logo img-fluid d-block mx-auto">

      <section>
        <!-- 1 · who -->
        <template v-if="step === 'email'">
          <h4>Start a free trial</h4>
          <p class="selection-text text-center">
            A full InstaSafe console of your own, seeded to the scale of a
            running tenant, for {{ TRIAL_DAYS }} days.
          </p>
          <form @submit.prevent="sendCode">
            <div class="mb-3 username-input-container mb-4">
              <label for="email" class="form-label visually-hidden">Work e-mail</label>
              <input
                type="email" class="form-control" name="email" id="email"
                placeholder="Work e-mail" required autocomplete="email" v-model="email"
              >
            </div>
            <p v-if="error" class="selection-text text-center">{{ error }}</p>
            <span>
              <button type="submit" class="btn btn-primary" :disabled="busy">
                {{ busy ? 'Sending…' : 'Next' }}
              </button>
            </span>
          </form>
          <p class="text-center mt-4 mb-0 terms">
            On Clicking Next button,You agree to our <br>
            <a href="https://instasafe.com/terms-and-conditions" class="text-decoration-none">Terms of Use</a>
            &amp;
            <a href="https://instasafe.com/privacy-policy" class="text-decoration-none">Privacy Policy</a>
          </p>
          <p class="text-center mt-3 mb-0 terms">
            Already have a tenant? <RouterLink to="/signin">Sign in</RouterLink>
          </p>
        </template>

        <!-- 2 · the code -->
        <template v-else-if="step === 'code'">
          <div class="header-section">
            <button type="button" class="back-button" aria-label="Back" @click="step = 'email'">
              <i class="fas fa-arrow-left" />
            </button>
            <h4>Check your mail</h4>
            <span class="w-24" />
          </div>
          <p class="selection-text text-center">
            A six-digit code went to <strong>{{ email }}</strong>. Nothing
            leaves this browser in the trial, so it is waiting in the Demo
            Inbox instead — and it is a real code, not a placeholder.
          </p>
          <form @submit.prevent="checkCode">
            <div class="mb-4">
              <label for="code" class="form-label visually-hidden">Six-digit code</label>
              <input
                id="code" class="form-control text-center" inputmode="numeric"
                autocomplete="one-time-code" placeholder="000000" :value="code" @input="onCode"
              >
            </div>
            <p v-if="error" class="selection-text text-center">{{ error }}</p>
            <span>
              <button type="submit" class="btn btn-primary" :disabled="code.length !== 6">Verify</button>
            </span>
          </form>
          <p class="resend-otp-text text-center d-block mt-3 mb-0">
            The code is <strong>{{ expected }}</strong> — shown here because
            there is no mail server to send it to, and a trial that strands
            you on this screen is worse than one that is honest about it.
          </p>
        </template>

        <!-- 3 · the tenant -->
        <template v-else>
          <div class="header-section">
            <button type="button" class="back-button" aria-label="Back" @click="step = 'code'">
              <i class="fas fa-arrow-left" />
            </button>
            <h4>Name your tenant</h4>
            <span class="w-24" />
          </div>
          <p class="selection-text text-center">
            This is what the console prints beside the logo, the way a
            customer's own tenant does.
          </p>
          <form @submit.prevent="create">
            <div class="mb-4 username-input-container">
              <label for="company" class="form-label visually-hidden">Company</label>
              <input
                type="text" class="form-control" id="company" placeholder="Company name"
                required autocomplete="organization" v-model="company"
              >
            </div>
            <p v-if="error" class="selection-text text-center">{{ error }}</p>
            <span>
              <button type="submit" class="btn btn-primary" :disabled="busy">
                {{ busy ? 'Provisioning…' : 'Open my console' }}
              </button>
            </span>
          </form>
          <p class="selection-text text-center mt-3 mb-0">
            Your sandbox is seeded with 1,821 users, 2,140 devices and 794
            logged events, so there is something to administer from the first
            screen. Reset it at any time from the Trial panel.
          </p>
        </template>
      </section>
    </div>
  </div>
</template>
