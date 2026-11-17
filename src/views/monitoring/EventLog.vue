<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import api from '../../api'
import PageHeader from '../../components/ui/PageHeader.vue'
import DataTable from '../../components/ui/DataTable.vue'
import EmptyState from '../../components/ui/EmptyState.vue'
import { fmtAgo } from '../../resources.js'

/**
 * The event log.
 *
 * This is the screen that proves the demo is wired rather than a set of
 * screenshots: every action taken anywhere in the console writes a row here.
 * Add a user, approve a device, enrol MFA, run the access explorer — then
 * come here and it is recorded, with the real actor and timestamp.
 */

const rows = ref([]); const total = ref(0); const loading = ref(true)
const page = ref(1); const perPage = ref(10)
const sort = ref('at'); const dir = ref('desc')
const search = ref(''); const filter = ref('all')

/**
 * Veno prints three columns here and nothing else: an absolute timestamp,
 * the username, and the sentence. Event type, source IP, location and
 * severity were the redesign's; the type is folded into the sentence, which
 * is where veno has it too.
 */
const stamp = (v) => {
  if (!v) return ''
  const d = new Date(v)
  const n = (x) => String(x).padStart(2, '0')
  return d.getFullYear() + '-' + n(d.getMonth() + 1) + '-' + n(d.getDate()) + ' ' +
         n(d.getHours()) + ':' + n(d.getMinutes()) + ':' + n(d.getSeconds())
}

const columns = [
  { key: 'at', label: 'Time', cell: stamp },
  { key: 'actor', label: 'Username' },
  { key: 'message', label: 'Log' }
]

/** Veno's own period control. The window is applied on the server there; the
 *  mock adapter has every row in one store, so it is applied on load. */
const period = ref('today')

function reload () { page.value = 1; load() }

/** The list as it stands on screen, as a file. */
function exportCsv () {
  const cell = (row, col) => {
    const v = col.cell ? col.cell(row[col.key], row) : row[col.key]
    return '"' + String(v ?? '').replace(/"/g, '""') + '"'
  }
  const body = [
    columns.map(c => '"' + c.label + '"').join(','),
    ...rows.value.map(row => columns.map(col => cell(row, col)).join(','))
  ].join(String.fromCharCode(10))
  const url = URL.createObjectURL(new Blob([body], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url; a.download = 'event-logs.csv'
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const chips = [
  { key: 'all', label: 'Select events...' },
  { key: 'warning', label: 'Warnings only' },
  { key: 'auth', label: 'Authentication' },
  { key: 'device', label: 'Devices' },
  { key: 'access', label: 'Access decisions' }
]

async function load () {
  loading.value = true
  const filters = {}
  if (filter.value === 'warning') filters.severity = 'warning'
  else if (filter.value !== 'all') {
    filters.type = (v) => String(v).startsWith(filter.value)
  }
  const res = await api.events.list({
    page: page.value, perPage: perPage.value, sort: sort.value, dir: dir.value,
    search: search.value, searchFields: ['type', 'message', 'actor', 'ip', 'city'],
    filters
  })
  rows.value = res.data; total.value = res.total; loading.value = false
}

let timer
watch(search, () => { clearTimeout(timer); timer = setTimeout(() => { page.value = 1; load() }, 220) })
watch([page, perPage, filter], load)
function onSort (k, d) { sort.value = k; dir.value = d; page.value = 1; load() }

onMounted(load)
</script>

<template>
  <div class="container-fluid i-page">
    <PageHeader
      title="Event Logs"
      subtitle="List of users with their event log report"
    />

    <!-- Veno's own period control: a bare form-select in its own row, with
         the event picker under it. Neither is a filter chip, which is what
         this screen had. -->
    <div class="row">
      <div class="col-auto mb-2">
        <select class="form-select" v-model="period" @change="reload">
          <option value="hour">Hour</option>
          <option value="today">Today</option>
          <option value="last_24_hours">Last 24 Hours</option>
          <option value="week">Week</option>
          <option value="month">Month</option>
          <option value="date_range">Date Range</option>
        </select>
      </div>
    </div>

    <div class="row mt-1 mb-2">
      <div class="col-12 col-md-8">
        <select class="form-select" v-model="filter" @change="reload" aria-label="Select events">
          <option v-for="c in chips" :key="c.key" :value="c.key">{{ c.label }}</option>
        </select>
      </div>
    </div>

    <DataTable
      :columns="columns" :rows="rows" :total="total" :loading="loading"
      v-model:page="page" v-model:perPage="perPage" v-model:search="search"
      :sort="sort" :dir="dir" :selectable="false" :boxed="false"
      @sort="onSort"
    >
      <template #tools>
        <button class="operation-btn btn btn-success" @click="exportCsv"> CSV </button>
        <span>
          <RouterLink class="operation-btn btn btn-primary" to="/profile/export-log"> SIEM Export </RouterLink>
        </span>
      </template>
    </DataTable>
  </div>
</template>
