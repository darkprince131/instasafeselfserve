<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import api from '../../api'
import { portalSignIn, pendingActivation } from '../../lib/portal-session.js'
import Buddy from '../../components/guide/Buddy.vue'
import { verifyTOTP, secondsRemaining } from '../../lib/totp.js'
import { qrSvg } from '../../lib/qr.js'
import { demo } from '../../lib/demo-state.js'
import MfaSimulator from '../../components/portal/MfaSimulator.vue'
import MfaArt from '../../components/portal/MfaArt.vue'

/**
 * Signing in to the member portal.
 *
 * Three questions, one at a time: who are you, prove it, prove it again.
 * Velto asks for a username and a password on one screen; this asks for the
 * address first and then the password, which is what every product an
 * employee already uses does, and it lets the second screen greet them by
 * name so they can see they typed the right address before committing a
 * password to it.
 *
 * The third question is the one velto does not ask well. An account can have
 * six different second factors and velto picks one; here the person chooses,
 * because the right answer depends on what they are holding — the phone is
 * in a drawer, the laptop has a fingerprint reader, they are on a train with
 * no signal.
 *
 * Two of the six are genuinely verified. The rest cannot be, in a browser,
 * and say so. The "accept any code" switch in the demo-states widget turns
 * the honest verification off for walking somebody through the flow without
 * a phone — and when it is on, the screen says so rather than letting a
 * reviewer believe a wrong code was accepted on purpose.
 */

const router = useRouter()

const step = ref('who')        // who · password · choose · method
const email = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)
/* Production's password field carries an eye toggle; this is its state. */
const showPassword = ref(false)
const user = ref(null)
const suggestion = ref('')
const needsSetup = ref(false)
/* Set when the address is not in this tenant, so the first step can say so
   rather than letting the password step fail with nothing to do about it. */
const unknown = ref('')

/* ------------------------------------------------------------- who are you */
async function submitWho () {
  error.value = ''
  unknown.value = ''
  const v = email.value.trim()
  if (!v) { error.value = 'Enter your email address or username.'; return }
  busy.value = true
  try {
    /* Velto answers "no such user" here, which tells anybody with a list of
       addresses which ones are real. This moves on regardless and lets the
       password step fail, so an unknown address and a wrong password are
       indistinguishable from outside. */
    const res = await api.users.list({ perPage: 1, search: v })
    const hit = (res.data || []).find(u =>
      u.username?.toLowerCase() === v.toLowerCase() ||
      u.email?.toLowerCase() === v.toLowerCase())
    /* An address that is not in this tenant used to walk on to a password
       box and fail there with no way forward. Say so here, where it can be
       corrected, and offer the account that does exist. */
    if (!hit) { unknown.value = v; return }
    unknown.value = ''
    user.value = hit

    /* An account nobody has ever set a password on should not be handed a
       password box. The note said "continue and you will be taken to set
       one" and then asked for a password anyway, which is a dead end with
       encouraging copy on it — there is nothing to type and no way forward.
       In production the server answers this; here the record is local. */
    needsSetup.value = !!hit && !hit.passwordHash

    step.value = 'password'
    await nextTick()
    if (!needsSetup.value) document.getElementById('pp')?.focus()
  } finally { busy.value = false }
}

/** Fills in the account the demo actually has, so an unknown address is a
 *  wrong turn rather than a wall. */
function useSuggested () {
  email.value = suggestion.value
  unknown.value = ''
  submitWho()
}

/* ---------------------------------------------------------------- password */
async function submitPassword () {
  error.value = ''
  if (!password.value) { error.value = 'Enter your password.'; return }
  busy.value = true
  try {
    const res = await api.auth.login({ username: user.value.username, password: password.value })

    if (!res?.ok) {
      error.value = res?.error || 'Sign-in failed.'
      return
    }

    user.value = res.user

    /* The administrator decides whether a second factor is asked for. The
       demo switch stands in for that decision so a reviewer can see both
       paths without editing a user. */
    const needs = demo.mfaRequired && (res.mfaRequired || res.user?.mfaRequired)
    if (!needs) { enter(res.user); return }

    step.value = 'choose'
  } catch (e) {
    error.value = e?.message || 'Sign-in failed.'
  } finally { busy.value = false }
}

/* ------------------------------------------------------- the second factor */
/**
 * The six the simulator can actually walk somebody through.
 *
 * These are the marketing site's six, not the portal's enrolment list, and
 * the difference is deliberate: that list is what an administrator can turn
 * on, this is what a person picks up at the moment of signing in. SMS and
 * email are here because they are what most people have met before, and a
 * demo that omits the familiar one teaches nobody anything.
 */
/**
 * Velto's six, named as velto names them.
 *
 * Its Two Factor Authentication screen offers TOTP, Authenticator, SMS,
 * E-mail, Hardware Key and Use Backup Code, as a three-by-two grid of tiles.
 * The set is kept exactly; what changes is the shape and what the screen
 * says while you are choosing.
 *
 * Velto draws six identical tiles with a word under each and no explanation
 * anywhere, so the choice is made on familiarity — which is how everybody
 * ends up on SMS, the weakest of the six. Stacked here, with a drawing of the
 * mechanism beside them and one line on what each costs you, the choice is
 * made on something.
 *
 * TOTP and Authenticator look like duplicates and are not: one is a code you
 * read out of any authenticator app, the other is InstaSafe's own app
 * answering a push. Velto distinguishes them and so does this.
 */
const METHODS = [
  /* `mark: true` draws the InstaSafe swirl instead of a Font Awesome glyph.
     Production uses it for the two methods that are its own product rather
     than a generic channel - the authenticator app and the push. */
  { key: 'totp', label: 'TOTP', icon: 'fa-clock', mark: true, real: true,
    sub: 'A rotating code from an authenticator app',
    good: 'Works with no signal and no data — nothing is ever sent, so nothing can be intercepted.',
    hint: 'Open your authenticator app and read the six digits for InstaSafe.' },
  { key: 'push', label: 'Authenticator', icon: 'fa-bell', mark: true,
    sub: 'Approve a prompt in the InstaSafe app',
    good: 'You see the device, address and location before you approve — and you can refuse.',
    hint: 'Check the request matches where you are, then approve or reject it.' },
  { key: 'sms', label: 'SMS', icon: 'fa-comment-dots',
    sub: 'A code sent to your phone number',
    good: 'The most familiar, and the weakest here: a number can be ported away from you.',
    hint: 'Type the code from the text message.' },
  { key: 'email', label: 'E-mail', icon: 'fa-envelope',
    sub: 'A code sent to your inbox',
    good: 'Only as strong as the mailbox it lands in — which is often protected by a password alone.',
    hint: 'Type the code from the email.' },
  { key: 'key', label: 'Hardware Key', icon: 'fa-key',
    sub: 'A security key, or this machine’s fingerprint reader',
    good: 'The only one that cannot be phished: the key checks which site is asking before it answers.',
    hint: 'Pick the key you are holding.' },
  { key: 'backup', label: 'Use Backup Code', icon: 'fa-list-ol',
    sub: 'One of the ten you saved',
    good: 'The way back in when the phone is lost, broken or flat. Each code works once.',
    hint: 'Enter any one of your saved codes.' }
]


const method = ref(null)
/* What the right-hand pane explains while nothing is chosen yet. */
const preview = ref('')
const shown = computed(() => METHODS.find(m => m.key === preview.value) || null)
const code = ref('')
const left = ref(secondsRemaining())
const pushState = ref('idle')     // idle · waiting · approved
const secret = ref('')
const uri = ref('')
let ticker

const qr = computed(() => uri.value ? qrSvg(uri.value, 4) : '')
const chosen = computed(() => METHODS.find(m => m.key === method.value) || null)

function pick (m) {
  method.value = m.key
  error.value = ''
  step.value = 'method'
}

/** A push nobody can send still has a shape, and the shape is the point. */



function enter (u) {
  clearInterval(ticker)
  portalSignIn(u)
  router.push('/portal')
}

function goActivate () {
  pendingActivation.value = user.value
  router.push('/portal/activate')
}

function back () {
  error.value = ''
  if (step.value === 'method') {
    step.value = 'choose'; method.value = null; preview.value = ''
    clearInterval(ticker); return
  }
  if (step.value === 'choose') { step.value = 'password'; return }
  if (step.value === 'password') { step.value = 'who'; password.value = ''; return }
}

onMounted(async () => {
  try {
    const res = await api.users.list({
      page: 1, perPage: 10, sort: 'id', dir: 'asc',
      filters: { status: 'active', mfaEnrolled: false }
    })
    suggestion.value = (res.data || []).find(u => !u.isAdmin)?.email ||
      (res.data || []).find(u => !u.isAdmin)?.username || ''
  } catch { suggestion.value = '' }
})
onUnmounted(() => clearInterval(ticker))
</script>

<template>
  <!-- Production's own sign-in chrome. Velto has one login page and routes by
       what the account is allowed to do, so the employee signing in to enrol a
       phone sees what the administrator sees - the same glass card on the same
       background, from the same pagescss.css. The portal's own canvas was the
       redesign's, and it made the enrolment hand-off read as a different
       product one click after leaving the console. -->
  <div class="background-container" />
  <div class="main-container">
    <div class="glass-card" :class="{ 'card-wide': step === 'choose' }">
      <img src="/brand/instasafe-lockup-color.svg" alt="InstaSafe" class="logo img-fluid d-block mx-auto">

      <section id="CompanyMemberAccountController">
        <!-- 1 - who -->
        <template v-if="step === 'who'">
          <h4>Signin</h4>
          <form @submit.prevent="submitWho">
            <div class="mb-3 username-input-container mb-4">
              <label for="pu" class="form-label visually-hidden">Email address</label>
              <input
                id="pu" v-model="email" type="text" class="form-control" name="username"
                placeholder="Email address or username" autocomplete="username" autofocus
              >
            </div>
            <p v-if="error" class="selection-text text-center">{{ error }}</p>
            <span>
              <button type="submit" class="btn btn-primary" :disabled="busy">
                {{ busy ? 'Checking...' : 'Next' }}
              </button>
            </span>
          </form>

          <!-- An address this tenant has never heard of. Velto answers "no
               such user", which tells anybody with a list of addresses which
               ones are real; this demo has one tenant and no such list, and
               walking on to a password box that can only fail is worse. -->
          <p v-if="unknown" class="selection-text text-center mt-3 mb-0">
            <strong>{{ unknown }}</strong> is not an account in this tenant.
            <a v-if="suggestion" class="resend-otp-link" role="button" @click="useSuggested">
              Use {{ suggestion }} instead
            </a>
          </p>

          <p v-if="suggestion" class="selection-text text-center mt-3 mb-0">
            {{ suggestion }} is a real account here, and any password gets in -
            a seeded account's password is not something you could know. Any
            account created in the console works too.
          </p>

          <p class="text-center mt-3 mb-0 terms">
            Administrators sign in here too - it is one product, and what you
            see depends on what your account may do. <br>
            <RouterLink to="/signin" class="text-decoration-none">Administrator sign-in</RouterLink>
          </p>
        </template>

        <!-- 2 - password -->
        <template v-else-if="step === 'password'">
          <div class="header-section">
            <button type="button" class="back-button" aria-label="Back" @click="back">
              <i class="fas fa-arrow-left" />
            </button>
            <h4>{{ user && user.firstName ? 'Hello, ' + user.firstName : 'Signin' }}</h4>
            <span class="w-24" />
          </div>

          <form @submit.prevent="submitPassword">
            <div class="mb-3 username-input-container disabled-container">
              <label for="pu_locked" class="form-label visually-hidden">Account</label>
              <input id="pu_locked" type="text" class="form-control" :value="user?.email || user?.username" disabled>
              <span class="edit-btn" role="button" aria-label="Change account" @click="back">
                <i class="fas fa-pen" />
              </span>
            </div>

            <p v-if="needsSetup" class="selection-text text-center">
              Nobody has set a password on this account yet. Carry on, or set
              one properly - that is the screen a new employee gets.
            </p>

            <div class="mb-4 password-input-container">
              <label for="pp" class="form-label visually-hidden">Password</label>
              <input
                id="pp" v-model="password" class="form-control"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Password" autocomplete="current-password"
              >
              <span
                class="password-toggle" role="button"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                @click="showPassword = !showPassword"
              >
                <i class="fas" :class="showPassword ? 'fa-eye-slash' : 'fa-eye'" />
              </span>
            </div>

            <p v-if="error" class="selection-text text-center">{{ error }}</p>
            <span>
              <button type="submit" class="btn btn-primary" :disabled="busy">
                {{ busy ? 'Checking...' : 'Signin' }}
              </button>
            </span>
          </form>

          <p class="resend-otp-text text-center d-block mt-3 mb-0">
            <a class="resend-otp-link" role="button" @click="goActivate">Set a password instead</a>
          </p>
          <p class="selection-text text-center mt-3 mb-0">
            Any password signs you in. The second factor after this is verified
            for real, and setting a password really does hash it.
          </p>
        </template>

        <!-- 3 - choose a second factor. Production lays this out as a
             three-across grid of tiles, icon over label, under a two-line
             heading and "Please Select One Method" - not a list. What it does
             not do is say what any method is, which is why everybody picks
             SMS. The tiles are production's; the line under them is ours, and
             it names whether the method is really verified. -->
        <template v-else-if="step === 'choose'">
          <div class="header-section">
            <button type="button" class="back-button" aria-label="Back" @click="back">
              <i class="fas fa-reply" />
            </button>
            <h4>Two Factor<br>Authentication</h4>
            <span class="w-24" />
          </div>

          <p class="selection-text text-center mb-0">Please Select One Method</p>

          <div class="method-grid">
            <button
              v-for="m in METHODS" :key="m.key"
              type="button" class="method-tile"
              :class="{ 'is-on': preview === m.key }"
              @mouseenter="preview = m.key" @mouseleave="preview = ''"
              @focus="preview = m.key" @blur="preview = ''"
              @click="pick(m)"
            >
              <img v-if="m.mark" src="/brand/instasafe-mark-color.svg" alt="" class="method-mark">
              <i v-else class="fa-solid" :class="m.icon" aria-hidden="true" />
              <span>{{ m.label }}</span>
            </button>
          </div>

          <!-- Velto gives six tiles and no explanation. This is the whole
               difference: point at one and it says what it is, and whether
               what you are about to try is genuinely verified or standing in
               for something a browser cannot do. -->
          <p class="selection-text text-center mb-0">
            <template v-if="shown">
              <span v-if="shown.real" class="badge rounded-pill bg-success mb-2 d-inline-block">
                verified for real
              </span>
              <span v-else class="badge rounded-pill bg-secondary mb-2 d-inline-block">
                stands in for the real thing
              </span>
              <br>
              <strong>{{ shown.label }}</strong> - {{ shown.good }}
            </template>
            <template v-else>
              Point at a method to see what it is. Two of the six are genuinely
              verified; the rest cannot be, in a browser, and say so.
            </template>
          </p>
        </template>

        <!-- 4 - the method itself -->
        <template v-else>
          <div class="header-section">
            <button type="button" class="back-button" aria-label="Other methods" @click="back">
              <i class="fas fa-arrow-left" />
            </button>
            <h4>{{ chosen?.label || 'Verify' }}</h4>
            <span class="w-24" />
          </div>

          <MfaArt :method="method" />

          <MfaSimulator
            :key="method" :method="method" :user="user"
            @verified="enter(user)" @other="back"
          />

          <p class="selection-text text-center mt-3 mb-0">{{ chosen?.hint }}</p>

          <div
            v-if="demo.mfaSimulator && method === 'totp'"
            class="alert alert-warning d-flex align-items-start gap-2 mt-3 mb-0"
            role="alert"
          >
            <i class="fas fa-triangle-exclamation mt-1" aria-hidden="true" />
            <span>
              <strong>Teaching mode.</strong>
              The code is shown so you can try this without a phone. Turn
              "Accept any code" off in the demo-states widget and the
              authenticator is verified against your real enrolled secret.
            </span>
          </div>
        </template>
      </section>
    </div>
  </div>

  <!-- The sign-in is outside the portal shell, so Pip is mounted here too. -->
  <Buddy scope="portal" />
</template>

<style scoped>
/* Production's own tokens, so this inherits pagescss's palette rather than
   introducing one. `--glass-border-color` and `--text-color` are what the
   card and its text already use on this page. */
.card-wide { max-width: 30rem; }

.method-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin: 1rem 0;
}

.method-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: .5rem;
  min-height: 7rem;
  padding: 1rem .5rem;
  border: 1px solid var(--glass-border-color);
  border-radius: .5rem;
  background-color: rgb(255 255 255 / 3%);
  color: var(--text-color);
  font-size: .9rem;
  line-height: 1.2;
  text-align: center;
  cursor: pointer;
  transition: border-color .2s ease, background-color .2s ease;
}

.method-mark {
  /* Matched to the glyph beside it rather than to the artwork's own box, so
     a tile with the mark and a tile with a Font Awesome icon sit level. */
  width: 1.9rem;
  height: 1.9rem;
}

.method-tile i {
  font-size: 1.6rem;
  /* The one colour on this screen, and it is the primary the page already
     paints its Signin button with. */
  color: #f97316;
}

.method-tile:hover,
.method-tile:focus-visible,
.method-tile.is-on {
  border-color: #f97316;
  background-color: rgb(249 115 22 / 8%);
  outline: none;
}

@media (max-width: 480px) {
  .method-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
