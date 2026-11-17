<script setup>
import { ref, computed, onMounted, onUnmounted, provide, watch } from 'vue'
import { useRoute } from 'vue-router'
import Header from './components/shell/Header.vue'
import Sidebar from './components/shell/Sidebar.vue'
import TrialPanel from './components/trial/TrialPanel.vue'
import TrialExpiry from './components/trial/TrialExpiry.vue'
import Toasts from './components/ui/Toasts.vue'
import Tour from './components/shell/Tour.vue'
import { setPageCss } from './lib/page-css.js'
import api from './api'

/**
 * The console shell, which is now production's: a fixed `header.header`, a
 * fixed `aside.sidebar-wrapper`, and `.content-wrapper > section >
 * .container-fluid` carrying the route. style.css owns every dimension —
 * 62px tall, 230px wide, `margin-left:230px` on the content — so nothing
 * here sets a size.
 *
 * The redesign's `.i-app` grid is gone with it. `body` is `overflow:hidden`
 * in production and `.content-wrapper` is the scroll container, which is why
 * the page scrolls under a header that never moves.
 */

const route = useRoute()
const stats = ref({})
const sidebarOpen = ref(false)
const trialOpen = ref(false)
const unread = ref(0)

async function refreshStats () {
  stats.value = await api.stats()
  const msgs = await api.inbox.list({ perPage: 0 })
  unread.value = msgs.data.filter(m => !m.read).length
}

const toastRef = ref(null)
const tourRef = ref(null)
provide('toast', (msg, kind) => toastRef.value?.push(msg, kind))
provide('refreshStats', refreshStats)
provide('stats', stats)
provide('openInbox', () => { trialOpen.value = true })
provide('startTour', (id) => id ? tourRef.value?.start(id) : tourRef.value?.openMenu())

/** Sign-in, sign-up and the portal bring their own page; see page-css.js. */
const bare = computed(() => route.meta?.bare === true)
watch(bare, (v) => setPageCss(v), { immediate: true })

/* Dismissing the "three days left" banner is a per-viewer convenience and
   nothing else needs to know about it, so it lives in this session only. */
const warningDismissed = ref(false)

/* Flipping an empty-state switch changes what every list would fetch, and
   screens fetch on mount. Remounting the view by key is what navigation
   already does, so nothing new has to be correct. */
const stateEpoch = ref(0)
function onDemoState () { stateEpoch.value++; refreshStats() }
onMounted(() => window.addEventListener('i365:demo-state', onDemoState))
onUnmounted(() => window.removeEventListener('i365:demo-state', onDemoState))

onMounted(refreshStats)
</script>

<template>
  <!-- bare routes: sign-in, sign-up, the end-user portal -->
  <RouterView v-if="bare" />

  <template v-else>
    <Header
      :unread="unread"
      @toggle-sidebar="sidebarOpen = !sidebarOpen"
      @open-trial="trialOpen = true"
    />
    <Sidebar :open="sidebarOpen" @navigate="sidebarOpen = false" />

    <div class="content-wrapper">
      <section>
        <TrialExpiry :warning-dismissed="warningDismissed" @dismiss="warningDismissed = true" />
        <!-- No <Suspense>. No view uses async setup — the route components
             are lazy chunks, which vue-router already handles — and wrapping
             them warned "<Suspense> slots expect a single root node" on all
             69 routes, which buries a real warning when one appears. -->
        <RouterView v-slot="{ Component }">
          <component :is="Component" :key="route.path + ':' + stateEpoch" @changed="refreshStats" />
        </RouterView>
      </section>
    </div>

    <TrialPanel v-model:open="trialOpen" @read="refreshStats" @tour="id => tourRef?.start(id)" />
    <Tour ref="tourRef" />
  </template>

  <Toasts ref="toastRef" />
</template>
