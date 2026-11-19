<script setup>
import { ref, computed, watch, onMounted, inject } from 'vue'
import api from '../../api'
import { portalUser } from '../../lib/portal-session.js'
import { demo, filterApplications } from '../../lib/demo-state.js'

/**
 * The launcher.
 *
 * Velto's page is a search box, a type filter and a grid of tiles grouped
 * under "Other Applications". The grid is right — this is the one screen an
 * employee uses daily and it should be one click deep.
 *
 * What it does not say is the part people actually need: a tile for a
 * network application looks exactly like a tile for a web one, and clicking
 * it when the agent is down does nothing anybody can interpret. So each tile
 * says how it opens, and a tile that cannot open right now says why instead
 * of failing silently.
 */

const toast = inject('toast', () => {})
const user = portalUser

/* How each kind of application actually reaches the user. The browser-based
   ones go through a remote-desktop gateway; the rest need the agent. */
const KINDS = {
  web: { label: 'Web', how: 'Opens in a new browser tab.', browser: true },
  rdp: { label: 'RDP', how: 'A Windows desktop, drawn in the browser.', browser: true },
  ssh: { label: 'SSH', how: 'A terminal, in the browser.', browser: true },
  vnc: { label: 'VNC', how: 'A remote screen, in the browser.', browser: true },
  wfs: { label: 'WFS', how: 'File shares, in the browser.', browser: true },
  db: { label: 'DB', how: 'A database client session.', browser: true },
  fqdn: { label: 'FQDN', how: 'A host inside the network, reached through the agent.', browser: false },
  tcp: { label: 'TCP', how: 'Reached through the agent on this machine.', browser: false },
  udp: { label: 'UDP', how: 'Reached through the agent on this machine.', browser: false },
  net: { label: 'NET', how: 'Reached through the agent on this machine.', browser: false }
}

const rawRows = ref([])
const rows = computed(() => filterApplications(rawRows.value))
const loading = ref(true)
const q = ref('')
const type = ref('')
const agentUp = ref(false)

const types = computed(() => {
  const seen = new Set(rows.value.map(a => String(a.type || '').toLowerCase()).filter(Boolean))
  return [...seen].sort()
})

const shown = computed(() => {
  const term = q.value.trim().toLowerCase()
  return rows.value.filter(a => {
    if (type.value && String(a.type).toLowerCase() !== type.value) return false
    if (!term) return true
    return `${a.name} ${a.host || ''} ${a.type || ''}`.toLowerCase().includes(term)
  })
})

function kind (a) {
  return KINDS[String(a.type || '').toLowerCase()] || { label: String(a.type || '?').toUpperCase(), how: '', browser: false }
}

async function load () {
  loading.value = true
  try {
    rawRows.value = (await api.applications.list({ perPage: 0 })).data
  } finally { loading.value = false }

  /* Same loopback probe the dashboard runs; the answer changes what a tile
     is allowed to promise. */
  if (demo.agent !== 'auto') { agentUp.value = demo.agent === 'running'; return }
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), 1500)
  try {
    await fetch('http://127.0.0.1:7865/status', { mode: 'no-cors', signal: ctl.signal })
    agentUp.value = true
  } catch { agentUp.value = false } finally { clearTimeout(t) }
}

async function open (a) {
  const k = kind(a)
  if (!k.browser && !agentUp.value) {
    toast(`${a.name} needs the agent, which is not running on this machine.`, 'bad')
    return
  }
  await api.events.record({
    type: 'access.granted',
    message: `${user.value?.username || 'member'} opened ${a.name} from the portal`
  })
  toast(`${a.name} — opened. In production this is a gateway session.`)
}

watch(() => demo.agent, () => { agentUp.value = demo.agent === 'running' })
onMounted(load)
</script>

<template>
  <div class="container-fluid" id="MemberApplications" data-type="user">
    <div class="container-heading mb-3">
      <h2>Applications</h2>
    </div>

    <!-- Production's own list toolbar: the search sits right, where every
         console list puts it. The type filter is a stock button group rather
         than the chips this had. -->
    <div class="row mb-2">
      <div class="col-12 col-md-6 d-flex flex-wrap justify-content-start align-items-center">
        <button
          class="operation-btn btn" :class="!type ? 'btn-primary' : 'btn-outline-secondary'"
          @click="type = ''"
        >All</button>
        <button
          v-for="t in types" :key="t"
          class="operation-btn btn" :class="type === t ? 'btn-primary' : 'btn-outline-secondary'"
          @click="type = t"
        >{{ (KINDS[t]?.label || t).toUpperCase() }}</button>
      </div>
      <div class="col-12 col-md-6 d-flex justify-content-end align-items-center">
        <input
          v-model="q" type="search" class="form-control"
          placeholder="Type keyword and enter to search" aria-label="Search applications"
        >
        <span class="fs-6 text-nowrap ms-2">{{ shown.length }} of {{ rows.length }}</span>
      </div>
    </div>

    <p v-if="loading" class="text-secondary">Loading…</p>

    <!-- Velto's own application tile: an uploaded logo at 42px, the name,
         the type behind a layer-group glyph, and an arrow. `row g-3` with
         col-xl-3 col-lg-4 col-md-4, exactly as the live member dashboard
         serves it. -->
    <div v-else-if="shown.length" class="row g-3">
      <div v-for="a in shown" :key="a.id" class="col-xl-3 col-lg-4 col-md-4">
            <a
              href="javascript:void(0)"
              class="d-flex align-items-center w-100 p-3 rounded bg-body-secondary text-decoration-none h-100"
              @click="open(a)"
            >
              <div class="d-flex align-items-center gap-3 overflow-hidden">
                <!-- Velto serves a logo uploaded per application. A seeded
                     one has none, so the fallback is the same circle with the
                     application's initial in it rather than a broken image. -->
                <img
                  v-if="a.logo" :src="a.logo" :alt="a.name"
                  class="shrink-0 rounded-circle" width="42" height="42"
                >
                <span v-else class="app-logo-fallback shrink-0 rounded-circle">
                  {{ (a.name || '?').slice(0, 1).toUpperCase() }}
                </span>
                <div class="overflow-hidden">
                  <div class="fw-semibold text-truncate">{{ a.name }}</div>
                  <div class="small text-muted text-truncate">
                    <i class="fa fa-layer-group me-1" aria-hidden="true" />
                    {{ String(a.type || '').toUpperCase() }}
                  </div>
                </div>
              </div>
              <div class="ms-auto text-muted"><i class="fa fa-arrow-right" aria-hidden="true" /></div>
            </a>
          </div>
    </div>

    <div v-else class="text-center m-2">
      <i class="fas fa-frown p-1" />
      <span v-if="q || type">No results found</span>
      <span v-else>
        Nothing has been assigned to you yet. Your administrator decides what
        appears here.
      </span>
    </div>
  </div>
</template>

<style scoped>
/* The circle velto's uploaded logo would fill. Production's own muted
   surface and label colour, so an application without a logo does not
   introduce one. */
.app-logo-fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  background-color: rgba(var(--bs-body-color-rgb), .08);
  color: #656195;
  font-weight: 700;
}
</style>
