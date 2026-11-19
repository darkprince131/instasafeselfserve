<script setup>
import { RouterView, RouterLink, useRouter, useRoute } from 'vue-router'
import { ref, computed, onMounted } from 'vue'
import { portalUser, portalSignOut } from '../../lib/portal-session.js'
import DemoStates from '../../components/portal/DemoStates.vue'
import Buddy from '../../components/guide/Buddy.vue'
import { demo } from '../../lib/demo-state.js'
import { theme, toggleTheme } from '../../lib/theme.js'
import { tenant } from '../../lib/trial.js'

/**
 * The end-user side of the console.
 *
 * Not a second product - the same one, seen from a seat with fewer
 * privileges. An administrator runs the tenant; everybody else sees their own
 * access.
 *
 * Three corrections are recorded here, each one made after looking rather
 * than reasoning.
 *
 * 1. An earlier comment claimed velto's member area is "one screen that asks
 *    a single question". It is five screens (VELTO-AUDIT.md §55).
 * 2. It was then built as a top tab bar over a centred column, on the
 *    argument that three destinations should not look like sixty-six. True
 *    of the content, wrong about the frame: velto's member area has a left
 *    sidebar and so does the admin console.
 * 3. The frame it moved to was the *redesign's* - `i-app`, `i-rail`,
 *    `i-topbar`. That was right about the shape and wrong about the skin, so
 *    an employee sent here from the Quick Start Guide watched the product
 *    change around them. This is production's shell, class for class, the
 *    same one `App.vue` emits.
 *
 * What production's own style.css proves about this area, without a capture:
 * `.content-wrapper .container-fluid .container-welcome` is an orange `#f60`
 * heading, and `.member-icon` and `.member-profile-img` are sized for it. So
 * the member pages sit inside the same `.content-wrapper > .container-fluid`
 * as every console screen.
 *
 * What is still inferred, until `/member/*` is captured: the sidebar labels
 * are velto's three destinations in velto's order, and `data-type` is a
 * guess - the 976 captured admin pages all carry `companyadmin`, and nothing
 * on disk says what the member area carries.
 */

const router = useRouter()
const route = useRoute()
const user = portalUser

const sidebarOpen = ref(false)

/* Velto's three, in velto's order. Profile and MFA are not here: §58 found
   velto keeps them behind the avatar in both consoles, and they were in both
   places at once for a while, which is worse than one place people look. */
const NAV = [
  { to: '/portal', label: 'Dashboard', exact: true },
  { to: '/portal/downloads', label: 'Downloads' },
  { to: '/portal/applications', label: 'Applications' }
]

function isOn (n) { return n.exact ? route.path === n.to : route.path.startsWith(n.to) }

const who = computed(() =>
  [user.value?.firstName, user.value?.lastName].filter(Boolean).join(' ') ||
  user.value?.username || '')

const isDark = computed(() => theme.value === 'dark')

function signOut () {
  portalSignOut()
  router.push('/portal/signin')
}

onMounted(() => {
  if (!portalUser.value) router.replace('/portal/signin')
})
</script>

<template>
  <!-- Production's header. The admin one carries a session timer and the
       trial link; an employee has neither to act on, so this is the same
       markup with those two omitted. -->
  <header
    class="header d-flex justify-content-between align-items-center px-3"
    id="Header" :data-theme="theme" data-type="user"
  >
    <div class="header-left d-flex align-items-center">
      <span>
        <button
          class="btn btn-sidebar d-block d-lg-none" aria-label="Menu"
          @click="sidebarOpen = !sidebarOpen"
        >☰</button>
      </span>
      <RouterLink to="/portal">
        <img src="/brand/instasafe-lockup-color.svg" alt="Company Logo" class="company-logo">
      </RouterLink>
      <RouterLink to="/portal" class="company-name d-none d-sm-block"> {{ tenant.name }}</RouterLink>
    </div>

    <div class="header-center">
      <span class="user-last-login d-none d-xl-block">Signed in as {{ who }}</span>
    </div>

    <div class="header-right d-flex align-items-center">
      <a class="faq me-3 d-none d-md-block" href="https://instasafe.com/resources/faqs/" target="_blank" rel="noopener">
        <i class="fas fa-question-circle me-1" /> FAQ
      </a>
      <a class="help me-3 d-none d-md-block" href="http://support.instasafe.com/" target="_blank" rel="noopener">
        <i class="fas fa-info-circle me-1" /> Help
      </a>

      <!-- The sliding ball is pure CSS off this checkbox. The id differs from
           the console's because both headers are `#checkbox` in production
           and only one is ever mounted - but a stale label association is a
           silent failure, so they are kept distinct here. -->
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
          :src="user?.photo || '/prod/img/avatar.svg'" :alt="who"
          class="rounded-circle profile-img member-profile-img"
          data-bs-toggle="dropdown" aria-expanded="false" role="button"
        >
        <ul class="dropdown-menu dropdown-menu-end">
          <li><RouterLink class="dropdown-item" to="/portal/profile">Profile</RouterLink></li>
          <li><RouterLink class="dropdown-item" to="/portal/mfa">MFA</RouterLink></li>
          <li><a class="dropdown-item" role="button" @click="signOut">Sign out</a></li>
        </ul>
      </div>
    </div>
  </header>

  <!-- Production's sidebar: labels only, no per-item icons, and the current
       page is `li.is-active`. Three entries, so no treeview. -->
  <aside class="sidebar-wrapper" id="SideBar" :class="{ 'sidebar-open': sidebarOpen }">
    <div class="sidebar">
      <ul class="sidebar-menu">
        <li v-for="n in NAV" :key="n.to" :class="isOn(n) ? 'is-active' : ''">
          <RouterLink :to="n.to" class="link" @click="sidebarOpen = false">
            <span class="menu-title"> {{ n.label }} </span>
          </RouterLink>
        </li>
      </ul>
    </div>
  </aside>

  <div class="content-wrapper">
    <section>
      <!-- Velto never tells an employee their sessions are recorded. If a
           company is going to watch, saying so is the minimum, and it costs
           one line. -->
      <div v-if="demo.sessionRecording" class="container-fluid pb-0">
        <div class="alert alert-info d-flex align-items-center mb-0" role="alert">
          <i class="fas fa-circle-dot me-2" />
          Your sessions to company applications are being recorded.
        </div>
      </div>

      <RouterView />
    </section>
  </div>

  <!-- Demo scaffolding: the states a seeded tenant never reaches. -->
  <DemoStates />

  <!-- The same guide as the console, reading the portal's half of the
       script. One character across both seats, because it is one product. -->
  <Buddy scope="portal" />
</template>
