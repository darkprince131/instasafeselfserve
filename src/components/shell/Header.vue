<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { theme, toggleTheme } from '../../lib/theme.js'
import { tenant } from '../../lib/trial.js'

/**
 * Production's header, markup-for-markup — see the capture in CLAUDE.md §2.1.
 *
 * Left: the burger (lg-down only), the company logo, the tenant name.
 * Centre: last portal login and the timezone, absolutely centred by style.css.
 * Right: the session timer pill, FAQ, Help, the theme checkbox, the avatar
 *        dropdown with Profile / MFA / Sign out.
 *
 * The one addition is the Trial link, left of FAQ and wearing production's own
 * `.help` class. A trial has to be operable — the demo inbox, the guided
 * flows, the empty-state switches and the sandbox reset have to live
 * somewhere — and the alternative was adding items to the avatar dropdown,
 * which is one of the captured states and must keep its three rows exactly.
 */

defineProps({ unread: { type: Number, default: 0 } })
const emit = defineEmits(['toggle-sidebar', 'open-trial'])

const router = useRouter()

/* Production prints the previous portal login and the tenant timezone. Both
   are real here: the timezone is the browser's, and the login stamp is the
   one this sandbox recorded when it was created. */
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'
const lastLogin = computed(() => tenant.value.lastLogin || '—')

/**
 * The session countdown.
 *
 * `data-remaining-time` on production's header is seconds, and the pill turns
 * from `.timer-green` to `.timer-red` as it runs down — both classes are in
 * style.css with their own light and dark values. Ten minutes is production's
 * own switchover point.
 */
const left = ref(2 * 3600 + 43 * 60 + 22)
let timer
const clock = computed(() => {
  const h = Math.floor(left.value / 3600)
  const m = Math.floor((left.value % 3600) / 60)
  const s = left.value % 60
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':')
})
const timerClass = computed(() => (left.value <= 600 ? 'timer-red' : 'timer-green'))

const isDark = computed(() => theme.value === 'dark')

function signOut () {
  router.push('/signin')
}

onMounted(() => { timer = setInterval(() => { if (left.value > 0) left.value-- }, 1000) })
onUnmounted(() => clearInterval(timer))
</script>

<template>
  <header
    class="header d-flex justify-content-between align-items-center px-3"
    id="Header" :data-theme="theme" data-type="companyadmin" :data-remaining-time="left"
  >
    <div class="header-left d-flex align-items-center">
      <span>
        <button class="btn btn-sidebar d-block d-lg-none" @click="emit('toggle-sidebar')" aria-label="Menu">☰</button>
      </span>
      <RouterLink to="/dashboard">
        <img src="/prod/ext/companies/instasafe.png" alt="Company Logo" class="company-logo">
      </RouterLink>
      <RouterLink to="/dashboard" class="company-name d-none d-sm-block"> {{ tenant.name }}</RouterLink>
    </div>

    <div class="header-center">
      <span class="user-last-login d-none d-xl-block">Last portal login on {{ lastLogin }}</span>
      <span class="user-last-login d-none d-xl-block">Current timezone: {{ timezone }}</span>
    </div>

    <div class="header-right d-flex align-items-center">
      <div
        class="d-flex align-items-center gap-2 py-1 px-3 rounded-pill fw-semibold shadow-sm me-3 d-none d-md-block"
        :class="timerClass"
      >
        <i class="fa-solid fa-clock" /><span>{{ clock }}</span>
      </div>

      <!-- the trial's own controls; styled as production's own header links -->
      <a class="help me-3 d-none d-md-block" role="button" @click="emit('open-trial')">
        <i class="fas fa-flask me-1" /> Trial
        <span v-if="unread" class="badge rounded-pill bg-danger ms-1">{{ unread }}</span>
      </a>

      <a class="faq me-3 d-none d-md-block" href="https://instasafe.com/resources/faqs/" target="_blank" rel="noopener">
        <i class="fas fa-question-circle me-1" /> FAQ
      </a>
      <a class="help me-3 d-none d-md-block" href="http://support.instasafe.com/" target="_blank" rel="noopener">
        <i class="fas fa-info-circle me-1" /> Help
      </a>

      <!-- The sliding ball is pure CSS off this checkbox; nothing here moves
           it by hand. `checked` is the state, `change` is the switch. -->
      <span class="theme-btn me-3 d-flex align-items-center">
        <input type="checkbox" class="checkbox" id="checkbox" :checked="isDark" @change="toggleTheme">
        <label for="checkbox" class="checkbox-label">
          <span class="side-icon light-side-icon"><i class="fas fa-sun" /></span>
          <span class="side-icon dark-side-icon"><i class="fas fa-moon" /></span>
          <span class="ball"><i class="fas fa-sun light-icon" /><i class="fas fa-moon dark-icon" /></span>
        </label>
      </span>

      <div class="dropdown">
        <img
          src="/prod/img/avatar.svg" :alt="tenant.adminEmail"
          class="rounded-circle profile-img" data-bs-toggle="dropdown" aria-expanded="false" role="button"
        >
        <ul class="dropdown-menu dropdown-menu-end">
          <li><RouterLink class="dropdown-item" to="/portal/profile">Profile</RouterLink></li>
          <li><RouterLink class="dropdown-item" to="/portal/mfa">MFA</RouterLink></li>
          <li><a class="dropdown-item" role="button" @click="signOut">Sign out</a></li>
        </ul>
      </div>
    </div>
  </header>
</template>
