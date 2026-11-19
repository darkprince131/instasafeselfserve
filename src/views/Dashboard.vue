<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import api from '../api'
import { isEmptied } from '../lib/console-state.js'
import PageHeader from '../components/ui/PageHeader.vue'
import PieChart from '../components/ui/PieChart.vue'
import QuickStart from '../components/trial/QuickStart.vue'

/**
 * Production's dashboard, markup-for-markup.
 *
 *   .container-heading.mb-3.d-flex.align-items-center
 *     h2.me-3 "Dashboard" + button.btn.btn-gradient.fw-bold "Quick Start Guide"
 *   .row.row-cols-1.row-cols-sm-2.row-cols-md-4.g-4
 *     four .card.shadow.h-100.dashboard, each .card-body.text-center with
 *     h5.card-title (two links either side of span.slash) and p.card-text
 *   hr.my-4 · two .col-md-6 panels, each h3.usage-title + a period select
 *            and a 300px pie
 *   hr.my-4 · two more
 *
 * The redesign replaced all of it: an attention band, a strip of unboxed
 * metrics, labelled bars instead of pies. Every one of those is a better
 * answer to "what needs me?" and every one is the first thing a visitor
 * would notice, because this is the screen the console opens on. So it goes
 * back, and what the trial adds goes where production already has a door:
 * the Quick Start Guide button, which is production's own.
 */

const startTour = inject('startTour', () => {})

const stats = ref({})
const loading = ref(true)
const quickStartOpen = ref(false)

const dataPeriod = ref('today')
const timePeriod = ref('today')
const anomalyPeriod = ref('today')
const blockedPeriod = ref('today')

const sessions = ref([])
const anomalies = ref([])
const blocked = ref([])

const num = (n) => (n ?? 0).toLocaleString()

onMounted(async () => {
  stats.value = await api.stats()
  sessions.value = (await api.sessions.list({ perPage: 0 })).data
  /* Anomalies and blocked services are activity, not objects, so neither has
     an empty-state switch of its own. They belong to the same question the
     event log answers - has anything happened here yet - so they follow it.
     Without this a day-one tenant showed two populated charts beside two
     empty ones and four zeroed counters. */
  const quiet = isEmptied('eventLog')
  if (quiet) { anomalies.value = []; blocked.value = [] } else {
    try { anomalies.value = (await api.anomalies.list({ perPage: 0 })).data } catch { anomalies.value = [] }
    try { blocked.value = (await api.blockedApps.list({ perPage: 0 })).data } catch { blocked.value = [] }
  }
  loading.value = false
})

/** Production's three windows, applied to what the sandbox actually holds. */
const WINDOW_MS = { hour: 36e5, today: 864e5, week: 7 * 864e5, month: 30 * 864e5 }
function within (at, period) {
  const ms = WINDOW_MS[period] ?? WINDOW_MS.today
  return Date.now() - new Date(at).getTime() <= ms
}

/** Top five by a measure, which is what "Top …" means on these panels. */
function topFive (rows, key, measure) {
  const totals = {}
  for (const r of rows) {
    const k = r[key] || 'unknown'
    totals[k] = (totals[k] || 0) + measure(r)
  }
  return Object.entries(totals)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
}

const dataUsage = computed(() => topFive(
  sessions.value.filter(s => within(s.startedAt, dataPeriod.value)),
  'username',
  (s) => Math.round(((s.bytesIn || 0) + (s.bytesOut || 0)) / 1024)
))

const timeUsage = computed(() => topFive(
  sessions.value.filter(s => within(s.startedAt, timePeriod.value)),
  'username',
  (s) => s.durationMin || 0
))

const anomalyTypes = computed(() => topFive(
  anomalies.value.filter(a => within(a.at, anomalyPeriod.value)),
  'anomalyType',
  () => 1
))

/* Veno's tenant has nothing here and prints "No results found"; the trial's
   blocklist is seeded, so this one usually has slices. */
const blockedServices = computed(() => topFive(
  blocked.value, 'name', () => 1
))

/** Production prints the renewal date as "31st Dec 2026". */
const renewal = computed(() => {
  const d = new Date(new Date().getFullYear(), 11, 31)
  const n = d.getDate()
  const suffix = n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'
  return `${n}${suffix} ${d.toLocaleString('en-GB', { month: 'short' })} ${d.getFullYear()}`
})
</script>

<template>
  <div class="container-fluid i-page" id="AdminDashboard">
    <PageHeader title="Dashboard">
      <template #actions>
        <button
          type="button" class="btn btn-gradient fw-bold"
          @click="quickStartOpen = true"
        > Quick Start Guide </button>
      </template>
    </PageHeader>

    <div class="row row-cols-1 row-cols-sm-2 row-cols-md-4 g-4">
      <div class="col">
        <div class="card shadow h-100 dashboard">
          <div class="card-body text-center">
            <h5 class="card-title">
              <RouterLink to="/reports/gateway">{{ num(stats.gatewaysUp) }}</RouterLink>
              <span class="slash">/</span>
              <RouterLink to="/gateways">{{ num(stats.gateways) }}</RouterLink>
            </h5>
            <p class="card-text">ONLINE GATEWAYS</p>
          </div>
        </div>
      </div>
      <div class="col">
        <div class="card shadow h-100 dashboard">
          <div class="card-body text-center">
            <h5 class="card-title">
              <RouterLink to="/reports/live">{{ num(stats.sessionsLive) }}</RouterLink>
              <span class="slash">/</span>
              <RouterLink to="/users">{{ num(stats.users) }}</RouterLink>
            </h5>
            <p class="card-text">ONLINE USERS</p>
          </div>
        </div>
      </div>
      <div class="col">
        <div class="card shadow h-100 dashboard">
          <div class="card-body text-center">
            <h5 class="card-title">
              <RouterLink to="/users">{{ num(stats.licences?.used) }}</RouterLink>
              <span class="slash">/</span>
              <RouterLink to="/settings/subscription-details">{{ num(stats.licences?.total) }}</RouterLink>
            </h5>
            <p class="card-text">USER SUBSCRIPTION</p>
          </div>
        </div>
      </div>
      <div class="col">
        <div class="card shadow h-100 dashboard">
          <div class="card-body text-center">
            <h5 class="card-title">
              <RouterLink to="/settings/subscription-details">{{ renewal }}</RouterLink>
            </h5>
            <p class="card-text">SUBSCRIPTION RENEWAL</p>
          </div>
        </div>
      </div>
    </div>

    <hr class="my-4">

    <div class="row">
      <div class="col-md-6">
        <div class="row">
          <div class="col-md-8 col-sm-8"><h3 class="usage-title">Top Data Usages (in Kb)</h3></div>
          <div class="col-md-4 col-sm-4">
            <select class="form-select" v-model="dataPeriod">
              <option value="today">Today</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
          </div>
        </div>
        <div class="row"><PieChart :slices="dataUsage" /></div>
      </div>

      <hr class="my-4 d-md-none">

      <div class="col-md-6">
        <div class="row">
          <div class="col-md-8 col-sm-8"><h3 class="usage-title"> Top Time Usages (in Minutes)</h3></div>
          <div class="col-md-4 col-sm-4">
            <select class="form-select" v-model="timePeriod">
              <option value="today">Today</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
          </div>
        </div>
        <div class="row"><PieChart :slices="timeUsage" /></div>
      </div>
    </div>

    <hr class="my-4">

    <div class="row">
      <div class="col-md-6">
        <div class="row">
          <div class="col-md-8 col-sm-8"><h3 class="usage-title">Anomalies (by Types)</h3></div>
          <div class="col-md-4 col-sm-4">
            <select class="form-select" v-model="anomalyPeriod">
              <option value="today">Today</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
          </div>
        </div>
        <div class="row"><PieChart :slices="anomalyTypes" /></div>
      </div>

      <hr class="my-4 d-md-none">

      <div class="col-md-6">
        <div class="row">
          <div class="col-md-8 col-sm-8"><h3 class="usage-title">Top Blocked Services</h3></div>
          <div class="col-md-4 col-sm-4">
            <select class="form-select" v-model="blockedPeriod">
              <option value="today">Today</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
          </div>
        </div>
        <div class="row"><PieChart :slices="blockedServices" /></div>
      </div>
    </div>

    <Teleport to="body">
      <QuickStart
        v-if="quickStartOpen"
        :stats="stats"
        @close="quickStartOpen = false"
        @tour="(id) => { quickStartOpen = false; startTour(id) }"
      />
    </Teleport>
  </div>
</template>
