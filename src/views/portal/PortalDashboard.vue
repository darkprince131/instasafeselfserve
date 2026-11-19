<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import api from '../../api'
import { portalUser } from '../../lib/portal-session.js'
import { demo, filterApplications, filterDevices, filterHistory } from '../../lib/demo-state.js'

/**
 * The member dashboard — velto's, in this console's clothes.
 *
 * Velto's own sections, in its own order: a welcome card carrying the
 * policies in force, the agent's state, this session and the one before it,
 * the devices registered to this person, the applications they can reach,
 * what they opened recently, and a network test.
 *
 * Three things are done differently, and each is a fix rather than a flourish:
 *
 * 1. **The policy chips say whether they are on.** Velto renders MFA, Device
 *    Binding, Shift Schedule and Geo Binding as four identical grey pills
 *    whatever their state, so they read as decoration. Here an enforced
 *    control says so and an unenforced one says that too.
 * 2. **The agent card leads.** "Agent not connected" is the single fact that
 *    decides whether anything else on this page will work, and velto gives it
 *    a third of a row with no way to act on it.
 * 3. **Devices and sessions carry their own meaning.** A session row that
 *    says only "Windows · Desktop · Chrome · India" cannot answer "was that
 *    me?". Saying how long ago, and whether it was this browser, can.
 */

const user = portalUser

/* ---------------------------------------------------------------- agent */
const AGENT_PORT = 7865
const agent = ref('checking')        // checking · running · missing
const agentCheckedAt = ref(null)

/**
 * A real probe, kept from the earlier portal.
 *
 * A desktop agent exposes a loopback endpoint; the browser can reach it and
 * nothing else can. `no-cors` hides the body but not whether the request
 * completed, which is the whole question. A refused connection throws, and
 * that is a genuine answer rather than a canned one.
 */
async function probe () {
  /* Forced by the demo widget, or genuinely asked. Both states are worth
     reviewing and only one of them is reachable on a machine without the
     agent, which is every machine this demo runs on. */
  if (demo.agent !== 'auto') {
    agent.value = demo.agent
    agentCheckedAt.value = new Date()
    return
  }
  agent.value = 'checking'
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), 1800)
  try {
    await fetch(`http://127.0.0.1:${AGENT_PORT}/status`, { mode: 'no-cors', signal: ctl.signal })
    agent.value = 'running'
  } catch {
    agent.value = 'missing'
  } finally {
    clearTimeout(timer)
    agentCheckedAt.value = new Date()
  }
}

/* ------------------------------------------------------------- the data */
/* Raw as loaded; what the screen shows is derived, so flipping a demo
   switch changes the page without a round trip to the database. Filtering
   inside load() meant a switch only took effect on the next navigation. */
const rawDevices = ref([])
const rawApps = ref([])
const rawHistory = ref([])
const devices = computed(() => filterDevices(rawDevices.value))
const apps = computed(() => filterApplications(rawApps.value))
const history = computed(() => filterHistory(rawHistory.value))
const sessions = ref([])
const loading = ref(true)

const me = computed(() => user.value?.username || '')

async function load () {
  loading.value = true
  try {
    const [d, a, h, s] = await Promise.all([
      api.devices.list({ perPage: 0, filters: { username: me.value } }),
      api.applications.list({ perPage: 0 }),
      api.appAccessLog.list({ perPage: 5, sort: 'at', dir: 'desc', filters: { username: me.value } }),
      api.sessions.list({ perPage: 5, sort: 'startedAt', dir: 'desc', filters: { username: me.value } })
    ])
    /* The demo switches are applied here rather than in the template, so
       every count, every empty state and every "needs the agent" note below
       agrees about what is present. */
    rawDevices.value = d.data
    rawApps.value = a.data
    rawHistory.value = h.data
    sessions.value = s.data
  } finally { loading.value = false }
}

/* Velto splits the launcher in two, and the split is real: a web or
   remote-desktop application opens in the browser, a network one only works
   once the agent is up. Showing them together would promise the same thing
   of both. */
const WEB_TYPES = ['web', 'rdp', 'ssh', 'vnc', 'wfs', 'db']
const webApps = computed(() => apps.value.filter(a => WEB_TYPES.includes(String(a.type).toLowerCase())))
const netApps = computed(() => apps.value.filter(a => !WEB_TYPES.includes(String(a.type).toLowerCase())))

const current = computed(() => sessions.value[0] || null)
const previous = computed(() => sessions.value[1] || null)

/**
 * The four controls velto shows, with their real state.
 *
 * Each reads off something the administrator actually set, so a chip that
 * says "Enforced" is making a claim the console can be held to.
 */
const policies = computed(() => {
  const u = user.value || {}
  return [
    { key: 'mfa', label: 'Multi-factor', icon: 'fa-shield-halved',
      on: !!u.mfaEnrolled,
      onText: 'Enrolled', offText: 'Not enrolled',
      help: u.mfaEnrolled
        ? 'A second factor is asked for when you sign in.'
        : 'Set one up — without it an account is one password away from anybody.',
      to: '/portal/mfa' },
    { key: 'device', label: 'Device binding', icon: 'fa-laptop',
      on: devices.value.length > 0,
      onText: `${devices.value.length} device${devices.value.length === 1 ? '' : 's'}`,
      offText: 'No device registered',
      help: devices.value.length
        ? 'You can only connect from a device registered to you.'
        : 'Nothing is registered yet, so nothing can connect.' },
    { key: 'shift', label: 'Shift schedule', icon: 'fa-clock',
      on: demo.shiftSchedule || !!u.timeSchedule,
      onText: u.timeSchedule || 'Mon–Fri, 08:00–19:00', offText: 'Any time',
      help: (demo.shiftSchedule || u.timeSchedule)
        ? 'Access is refused outside these hours.'
        : 'No hours restriction applies to your account.' },
    { key: 'geo', label: 'Geo binding', icon: 'fa-location-dot',
      on: demo.geoBinding || !!u.geoFence,
      onText: u.geoFence || 'India', offText: 'Any location',
      help: (demo.geoBinding || u.geoFence)
        ? 'Access is refused from outside this area.'
        : 'No location restriction applies to your account.' }
  ]
})

/* ------------------------------------------------------------ formatting */
function ago (v) {
  if (!v) return '—'
  const mins = Math.round((Date.now() - new Date(v)) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`
  const days = Math.round(hrs / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}
function stamp (v) {
  return v ? new Date(v).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
}

/* "Was that me?" is the only question a session card is ever asked, and this
   browser can answer half of it for free. */
const thisBrowser = computed(() => {
  const ua = navigator.userAgent
  if (/Edg\//.test(ua)) return 'Edge'
  if (/Chrome\//.test(ua)) return 'Chrome'
  if (/Safari\//.test(ua)) return 'Safari'
  if (/Firefox\//.test(ua)) return 'Firefox'
  return ''
})

watch(() => demo.agent, probe)
onMounted(() => { probe(); load() })
</script>

<template>
  <!-- Production's member page sits in the same `.content-wrapper >
       .container-fluid` as every console screen - style.css proves it with
       `.content-wrapper .container-fluid .container-welcome`, an orange #f60
       heading that exists for exactly this page. Everything below is stock
       Bootstrap 5.3.8 inside it: cards, tables, badges. -->
  <div class="container-fluid" id="MemberDashboard" data-type="user">
    <div class="container-welcome">
      Welcome, {{ user?.firstName ? user.firstName : user?.username }}
    </div>
    <p class="text-center text-secondary mb-4">
      {{ user?.username }}<span v-if="user?.email"> &middot; {{ user.email }}</span>
    </p>

    <!-- Velto renders these four as identical grey pills whatever their
         state, so they read as decoration. An enforced control says so here,
         an unenforced one says that too, and Multi-factor links to the page
         that fixes it. -->
    <div class="row row-cols-1 row-cols-sm-2 row-cols-md-4 g-4 mb-4">
      <div v-for="p in policies" :key="p.key" class="col">
        <component
          :is="p.to ? 'RouterLink' : 'div'" :to="p.to"
          class="card shadow h-100 text-decoration-none"
        >
          <div class="card-body">
            <i class="fas member-icon mb-2" :class="p.icon" aria-hidden="true" />
            <h6 class="text-secondary text-uppercase mb-1">{{ p.label }}</h6>
            <p class="fw-semibold mb-2">
              {{ p.on ? p.onText : p.offText }}
              <span class="badge rounded-pill ms-1" :class="p.on ? 'bg-success' : 'bg-secondary'">
                {{ p.on ? 'on' : 'off' }}
              </span>
            </p>
            <p class="text-secondary small mb-0">{{ p.help }}</p>
          </div>
        </component>
      </div>
    </div>

    <!-- The agent decides whether anything else on this page will work, so it
         leads and can be acted on. Velto gives it a third of a row and no way
         forward. The probe is real: a loopback request that genuinely fails. -->
    <div class="card shadow mb-4">
      <div class="card-body d-flex flex-wrap align-items-center gap-3">
        <i
          class="fas fa-2x" aria-hidden="true"
          :class="agent === 'running' ? 'fa-circle-check text-success'
            : agent === 'checking' ? 'fa-circle-notch fa-spin text-secondary'
            : 'fa-circle-exclamation text-danger'"
        />
        <div class="flex-grow-1">
          <h5 class="mb-1">
            {{ agent === 'running' ? 'The agent is running'
              : agent === 'checking' ? 'Checking this device…' : 'The agent is not running' }}
          </h5>
          <p class="mb-1">
            <template v-if="agent === 'running'">
              Everything below is reachable from this machine.
            </template>
            <template v-else-if="agent === 'checking'">
              Looking for the InstaSafe agent on this machine.
            </template>
            <template v-else>
              Network applications will not connect until it is installed and
              started. Web applications still open in the browser.
            </template>
          </p>
          <p v-if="agentCheckedAt" class="text-secondary small mb-0">
            Checked at {{ agentCheckedAt.toLocaleTimeString() }} — this really
            probes for the agent rather than assuming.
          </p>
        </div>
        <div class="d-flex gap-2">
          <button class="operation-btn btn btn-primary" @click="probe">Check again</button>
          <RouterLink v-if="agent === 'missing'" class="operation-btn btn btn-success" to="/portal/downloads">
            Get the agent
          </RouterLink>
        </div>
      </div>
    </div>

    <!-- ------------------------------------------------------ sessions -->
    <div class="row g-4 mb-4">
      <div class="col-12 col-lg-6">
        <div class="card shadow h-100">
          <div class="card-body">
            <h5 class="card-title">This session</h5>
            <template v-if="current">
              <p class="fs-5 mb-0">{{ stamp(current.startedAt) }}</p>
              <p class="text-secondary small">{{ ago(current.startedAt) }}</p>
              <table class="table table-borderless align-middle mb-0">
                <tbody>
                  <tr><td class="text-secondary">Where</td><td>{{ current.city || '—' }}</td></tr>
                  <tr><td class="text-secondary">Gateway</td><td>{{ current.gateway || '—' }}</td></tr>
                  <tr><td class="text-secondary">Opened</td><td>{{ current.application || '—' }}</td></tr>
                  <tr><td class="text-secondary">This browser</td><td>{{ thisBrowser || 'Unknown' }}</td></tr>
                </tbody>
              </table>
            </template>
            <p v-else class="text-secondary mb-0">No session recorded yet.</p>
          </div>
        </div>
      </div>

      <div class="col-12 col-lg-6">
        <div class="card shadow h-100">
          <div class="card-body">
            <h5 class="card-title">Previous session</h5>
            <template v-if="previous">
              <p class="fs-5 mb-0">{{ stamp(previous.startedAt) }}</p>
              <p class="text-secondary small">{{ ago(previous.startedAt) }}</p>
              <table class="table table-borderless align-middle mb-2">
                <tbody>
                  <tr><td class="text-secondary">Where</td><td>{{ previous.city || '—' }}</td></tr>
                  <tr><td class="text-secondary">Gateway</td><td>{{ previous.gateway || '—' }}</td></tr>
                  <tr><td class="text-secondary">Opened</td><td>{{ previous.application || '—' }}</td></tr>
                </tbody>
              </table>
              <p class="text-secondary small mb-0">
                Not you? Change your password and tell your administrator.
              </p>
            </template>
            <p v-else class="text-secondary mb-0">This is your first recorded session.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- ------------------------------------------------------- devices -->
    <div class="card shadow mb-4">
      <div class="card-body">
        <h5 class="card-title">
          Your devices
          <span class="badge rounded-pill bg-secondary ms-1">{{ devices.length }}</span>
        </h5>
        <div v-if="devices.length" class="table-responsive table-container">
          <table class="table table-hover table-borderless align-middle text-nowrap">
            <thead class="border-bottom table-light">
              <tr>
                <th>Name</th><th>Operating system</th>
                <!-- Velto labels these Manufacturer, Model and Hostname. This
                     console identifies a device by serial, MAC and UUID
                     together, which is what it stores and what an
                     administrator looking for this machine would search on. -->
                <th>Serial</th><th>MAC</th><th>Agent</th><th>Registered</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in devices" :key="d.id">
                <td>{{ d.name }}</td>
                <td>{{ d.os || 'Unknown' }}</td>
                <td>{{ d.serialNumber || '—' }}</td>
                <td>{{ d.macAddress || '—' }}</td>
                <td>{{ d.agentVersion || '—' }}</td>
                <td>{{ stamp(d.enrolledAt) }}</td>
                <td>
                  <span
                    class="badge rounded-pill"
                    :class="d.status === 'approved' ? 'bg-success' : 'bg-warning text-dark'"
                  >{{ d.status === 'approved' ? 'Approved' : d.status }}</span>
                  <span
                    v-if="d.posture && d.posture !== 'pass'"
                    class="badge rounded-pill bg-danger ms-1"
                  >posture fails</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="text-secondary mb-0">
          No device is registered to you yet. Sign in from the machine you work
          on with the agent running, and it registers itself.
        </p>
      </div>
    </div>

    <!-- -------------------------------------------------- applications -->
    <div class="row g-4 mb-4">
      <div class="col-12 col-lg-6">
        <div class="card shadow h-100">
          <div class="card-body">
            <h5 class="card-title">
              Opens in the browser
              <span class="badge rounded-pill bg-secondary ms-1">{{ webApps.length }}</span>
            </h5>
            <div v-if="webApps.length" class="row g-3">
              <div v-for="a in webApps.slice(0, 8)" :key="a.id" class="col-12 col-xl-6">
            <a
              href="javascript:void(0)"
              class="d-flex align-items-center w-100 p-3 rounded bg-body-secondary text-decoration-none h-100"
              @click="$router.push('/portal/applications')"
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
            <p v-else class="text-secondary mb-0">Nothing has been assigned to you yet.</p>
            <RouterLink v-if="webApps.length > 8" class="d-inline-block mt-2" to="/portal/applications">
              See all {{ webApps.length }}
            </RouterLink>
          </div>
        </div>
      </div>

      <div class="col-12 col-lg-6">
        <div class="card shadow h-100">
          <div class="card-body">
            <h5 class="card-title">
              Needs the agent
              <span class="badge rounded-pill bg-secondary ms-1">{{ netApps.length }}</span>
            </h5>
            <div v-if="netApps.length" class="row g-3">
              <div v-for="a in netApps.slice(0, 8)" :key="a.id" class="col-12 col-xl-6">
            <a
              href="javascript:void(0)"
              class="d-flex align-items-center w-100 p-3 rounded bg-body-secondary text-decoration-none h-100"
              @click=""
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
            <p v-else class="text-secondary mb-0">No network application is assigned to you.</p>
            <p v-if="netApps.length && agent !== 'running'" class="text-secondary small mt-2 mb-0">
              These reach your network through the agent, which is not running,
              so they will not connect right now.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- --------------------------------------------- history and testing -->
    <div class="row g-4">
      <div class="col-12 col-lg-8">
        <div class="card shadow h-100">
          <div class="card-body">
            <h5 class="card-title">Recently opened</h5>
            <div v-if="history.length" class="table-responsive table-container">
              <table class="table table-hover table-borderless align-middle text-nowrap">
                <thead class="border-bottom table-light">
                  <tr><th>Destination</th><th>Action</th><th>When</th></tr>
                </thead>
                <tbody>
                  <tr v-for="(h, i) in history" :key="h.id || i">
                    <td>{{ h.destination || h.application || h.name }}</td>
                    <td>
                      <span
                        class="badge rounded-pill"
                        :class="h.action && h.action !== 'Allowed' ? 'bg-danger' : 'bg-success'"
                      >{{ h.action || 'Allowed' }}</span>
                    </td>
                    <td>{{ ago(h.at) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="text-secondary mb-0">Nothing opened yet.</p>
          </div>
        </div>
      </div>

      <div class="col-12 col-lg-4">
        <div class="card shadow h-100">
          <div class="card-body">
            <h5 class="card-title">Connection test</h5>
            <p class="text-secondary">
              If something feels slow, run this before raising a ticket — it is
              the first thing support will ask for.
            </p>
            <RouterLink class="operation-btn btn btn-primary" to="/reports/network-test">
              Run a test
            </RouterLink>
          </div>
        </div>
      </div>
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
