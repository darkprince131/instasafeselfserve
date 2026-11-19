<script setup>
import { ref, nextTick } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import api from '../api'
import { startSession, tenant } from '../lib/trial.js'

/**
 * Production's sign-in, markup-for-markup, and the gate that was never wired.
 *
 * Veno's page is `.background-container` + `.main-container > .glass-card`,
 * styled entirely by pagescss.css — which App.vue attaches for bare routes
 * and detaches again, because it redefines `body`, `.form-control` and
 * `.btn-primary` and would repaint the console if it stayed. The flow is
 * velto's two steps: username, then password, then MFA where it is enrolled.
 *
 * **Any password signs in, on purpose.** A visitor cannot know a seeded
 * account's password, so a real check could only ever refuse them; two people
 * got stuck on exactly that screen. The note under the form says so rather
 * than implying a check that is not made. What is real: `auth.setPassword`
 * still hashes with PBKDF2 and still enforces every policy rule, and the MFA
 * step verifies a genuine RFC 6238 code — a wrong one is refused.
 */

const router = useRouter()
const route = useRoute()
const step = ref('username')
const username = ref('admin')
const password = ref('')
const showPassword = ref(false)
const code = ref('')
const error = ref('')
const busy = ref(false)
const userId = ref('')
const sentTo = ref('')

async function next () {
  if (!username.value.trim()) return
  step.value = 'password'
  await nextTick()
  document.getElementById('password')?.focus()
}

function editUsername () {
  step.value = 'username'
  error.value = ''
}

async function submit () {
  error.value = ''; busy.value = true
  try {
    const res = await api.auth.login({ username: username.value, password: password.value })
    if (!res?.ok) { error.value = res?.error || 'Sign-in failed.'; return }
    userId.value = res.user.id
    if (res.mfaRequired) { step.value = 'mfa'; return }
    enter(res.user)
  } catch (e) {
    error.value = e?.message || 'Sign-in failed. Try again.'
  } finally { busy.value = false }
}

async function verify () {
  error.value = ''; busy.value = true
  try {
    const res = await api.auth.verifyMfa({ userId: userId.value, code: code.value })
    if (!res?.ok) { error.value = res?.error || 'That code is not valid.'; code.value = ''; return }
    enter(res.user)
  } catch (e) {
    error.value = e?.message || 'Could not check that code.'; code.value = ''
  } finally { busy.value = false }
}

/** A code the visitor can actually read, in the Demo Inbox. */
async function sendOtp () {
  try {
    const res = await api.auth.sendOtp({ userId: userId.value, channel: 'sms' })
    sentTo.value = res.sentTo || 'your phone'
  } catch (e) { error.value = e?.message || 'Could not send a code.' }
}

function enter (user) {
  startSession({
    adminEmail: user?.email || username.value,
    name: tenant.value.name || 'Trial'
  })
  router.push(route.query.next || '/dashboard')
}

function onCode (e) {
  code.value = e.target.value.replace(/\D/g, '').slice(0, 6)
  if (code.value.length === 6) verify()
}
</script>

<template>
  <div class="background-container" />
  <div class="main-container">
    <div class="glass-card">
      <img src="/brand/instasafe-lockup-color.svg" alt="InstaSafe" class="logo img-fluid d-block mx-auto">

      <section id="CompanyMemberAccountController">
        <!-- 1 · who -->
        <template v-if="step === 'username'">
          <h4>Signin</h4>
          <form @submit.prevent="next">
            <div class="mb-3 username-input-container mb-4">
              <label for="username" class="form-label visually-hidden">Username</label>
              <input
                type="text" class="form-control" name="username" id="username"
                placeholder="Username" required autocomplete="off" v-model="username"
              >
            </div>
            <span><button type="submit" class="btn btn-primary">Next</button></span>
          </form>
          <p class="text-center mt-4 mb-0 terms">
            On Clicking Signin button,You agree to our <br>
            <a href="https://instasafe.com/terms-and-conditions" class="text-decoration-none">Terms of Use</a>
            &amp;
            <a href="https://instasafe.com/privacy-policy" class="text-decoration-none">Privacy Policy</a>
          </p>
          <p class="text-center mt-3 mb-0 terms">
            No tenant yet? <RouterLink to="/signup">Start a free trial</RouterLink>
          </p>
        </template>

        <!-- 2 · password -->
        <template v-else-if="step === 'password'">
          <div class="header-section">
            <button type="button" class="back-button" aria-label="Back" @click="editUsername">
              <i class="fas fa-arrow-left" />
            </button>
            <h4>Signin</h4>
            <span class="w-24" />
          </div>
          <form @submit.prevent="submit">
            <div class="mb-3 username-input-container disabled-container">
              <label for="signin_user" class="form-label visually-hidden">Username</label>
              <input id="signin_user" type="text" class="form-control" :value="username" disabled>
              <span class="edit-btn" role="button" aria-label="Change username" @click="editUsername">
                <i class="fas fa-pen" />
              </span>
            </div>
            <div class="mb-4 password-input-container">
              <label for="password" class="form-label visually-hidden">Password</label>
              <input
                :type="showPassword ? 'text' : 'password'" class="form-control" id="password"
                placeholder="Password" autocomplete="current-password" v-model="password"
              >
              <span class="password-toggle" role="button" :aria-label="showPassword ? 'Hide password' : 'Show password'"
                    @click="showPassword = !showPassword">
                <i class="fas" :class="showPassword ? 'fa-eye-slash' : 'fa-eye'" />
              </span>
            </div>
            <p v-if="error" class="selection-text text-center">{{ error }}</p>
            <span>
              <button type="submit" class="btn btn-primary" :disabled="busy">
                {{ busy ? 'Checking…' : 'Signin' }}
              </button>
            </span>
          </form>
          <p class="selection-text text-center mt-3 mb-0">
            Any password signs you in. A seeded account's password is not
            something a visitor could know, so checking it could only ever
            lock you out.
          </p>
        </template>

        <!-- 3 · the real second factor -->
        <template v-else>
          <div class="header-section">
            <button type="button" class="back-button" aria-label="Back" @click="step = 'password'">
              <i class="fas fa-arrow-left" />
            </button>
            <h4>Verify</h4>
            <span class="w-24" />
          </div>
          <p class="selection-text text-center">
            Enter the six-digit code from your authenticator.
          </p>
          <div class="mb-4">
            <label for="otp" class="form-label visually-hidden">Six-digit code</label>
            <input
              id="otp" class="form-control text-center" inputmode="numeric" autocomplete="one-time-code"
              placeholder="000000" :value="code" @input="onCode"
            >
          </div>
          <p v-if="error" class="selection-text text-center">{{ error }}</p>
          <span>
            <button type="button" class="btn btn-primary" :disabled="busy || code.length !== 6" @click="verify">
              {{ busy ? 'Verifying…' : 'Verify' }}
            </button>
          </span>
          <p class="resend-otp-text text-center d-block mt-3 mb-0">
            <template v-if="sentTo">Code sent to {{ sentTo }} — read it in the Trial panel's Inbox.</template>
            <template v-else>
              No authenticator?
              <a class="resend-otp-link" role="button" @click="sendOtp">Send a code instead</a>
            </template>
          </p>
          <p class="selection-text text-center mt-3 mb-0">
            This is real RFC 6238 verification. A wrong code is refused.
          </p>
        </template>
      </section>
    </div>
  </div>
</template>
