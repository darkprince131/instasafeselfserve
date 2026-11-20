<script setup>
import { ref, watch, computed } from 'vue'
import api from '../../api'
import { resetCreated } from '../../lib/limits.js'
import { TOURS } from '../../tours.js'
import {
  COLLECTIONS, consoleDemo, PRESETS, applyPreset, currentPreset, emptiedCount
} from '../../lib/console-state.js'
import { tenant, daysLeft, forgetTrial } from '../../lib/trial.js'

/**
 * Everything the trial adds that production has no home for, in one stock
 * Bootstrap offcanvas: the Demo Inbox, the guided flows, the empty-state
 * switches and the sandbox reset.
 *
 * It is one surface rather than four header controls on purpose. Production's
 * header has exactly six things in it and every one of them is in the
 * captures; four more would be the first thing a visitor notices. An
 * offcanvas behind a single link is invisible until it is asked for, and
 * `offcanvas`, `nav-tabs`, `list-group`, `card` and `btn` are all stock
 * Bootstrap 5.3.8 — which is what production is built from.
 */

const props = defineProps({ open: Boolean })
const emit = defineEmits(['update:open', 'read', 'tour'])

const tab = ref('start')
const items = ref([])
const loading = ref(false)
const resetting = ref(false)

const KIND_ICON = {
  sms: 'fa-comment-sms', email: 'fa-envelope', push: 'fa-bell',
  webhook: 'fa-code', siem: 'fa-shield-halved', report: 'fa-file-lines'
}

async function load () {
  loading.value = true
  try {
    const res = await api.inbox.list({ perPage: 0, sort: 'at', dir: 'desc' })
    items.value = res.data
  } finally { loading.value = false }
}

watch(() => props.open, (o) => { if (o) load() })

async function markRead (m) {
  if (m.read) return
  await api.inbox.markRead(m.id)
  m.read = true
  emit('read')
}

async function clearAll () {
  await api.inbox.clear()
  items.value = []
  emit('read')
}

const unread = computed(() => items.value.filter(m => !m.read).length)

function when (at) {
  const s = (Date.now() - new Date(at)) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  return new Date(at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function touched () {
  window.dispatchEvent(new CustomEvent('i365:demo-state'))
}
function pickPreset (key) { applyPreset(key); touched() }
function flip (key) {
  consoleDemo[key] = consoleDemo[key] === 'empty' ? 'seeded' : 'empty'
  touched()
}
/* A flow either answers the sentence somebody arrived with, or it is
   second-order - worth knowing once the tenant exists, and noise before. */
const answeringFlows = computed(() => TOURS.filter(t => t.group === 'answers'))
const runningFlows = computed(() => TOURS.filter(t => t.group !== 'answers'))

const preset = computed(() => currentPreset())

/**
 * Put the sandbox back to seeded state.
 *
 * This wipes the local store and reseeds it, which is the only reset that
 * means anything: a visitor who has deleted the users wants them back, not a
 * second tenant. The trial identity survives — they are still signed in, with
 * the same days remaining — because losing that would make them sign up again
 * to undo a delete.
 */
async function resetSandbox () {
  if (!confirm('Reset this sandbox?\n\nEvery change you have made is discarded and the original data is seeded again. You stay signed in and your trial keeps its remaining days.')) return
  resetting.value = true
  try {
    await api.demo.reset()
    /* Putting the data back has to put the allowances back with it, or a
       visitor who resets finds they still cannot add an application. */
    resetCreated()
    location.reload()
  } finally { resetting.value = false }
}

function startTour (id) {
  emit('update:open', false)
  emit('tour', id)
}

function endTrial () {
  if (!confirm('End this trial and forget the sandbox?\n\nYou will be returned to sign-up.')) return
  forgetTrial()
  location.href = '/signin'
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="offcanvas-backdrop fade show" @click="emit('update:open', false)" />
    <div
      v-if="open"
      class="offcanvas offcanvas-end show" tabindex="-1" style="visibility:visible;width:min(460px,100vw)"
      role="dialog" aria-labelledby="trialPanelLabel"
    >
      <div class="offcanvas-header border-bottom">
        <div>
          <h5 class="offcanvas-title" id="trialPanelLabel">Trial</h5>
          <p class="mb-0 small text-body-secondary">
            {{ tenant.name }} · {{ daysLeft }} day{{ daysLeft === 1 ? '' : 's' }} left
          </p>
        </div>
        <button type="button" class="btn-close" aria-label="Close" @click="emit('update:open', false)" />
      </div>

      <div class="offcanvas-body p-0 d-flex flex-column">
        <ul class="nav nav-tabs px-3 pt-2 flex-nowrap">
          <li class="nav-item">
            <button class="nav-link" :class="{ active: tab === 'start' }" @click="tab = 'start'">Start</button>
          </li>
          <li class="nav-item">
            <button class="nav-link" :class="{ active: tab === 'inbox' }" @click="tab = 'inbox'">
              Inbox <span v-if="unread" class="badge rounded-pill bg-danger">{{ unread }}</span>
            </button>
          </li>
          <li class="nav-item">
            <button class="nav-link" :class="{ active: tab === 'flows' }" @click="tab = 'flows'">Flows</button>
          </li>
          <li class="nav-item">
            <button class="nav-link" :class="{ active: tab === 'data' }" @click="tab = 'data'">Data</button>
          </li>
        </ul>

        <div class="flex-grow-1 overflow-auto p-3">
          <!-- ---------------- Start ---------------- -->
          <template v-if="tab === 'start'">
            <p class="small">
              This is a full copy of the InstaSafe console, and it starts
              empty so that what you build is yours and not the seed's. The
              policy engine really evaluates, the authenticator really
              verifies, and every action you take is written to the event
              log. Load a running tenant below if you want to see it at
              production scale instead.
            </p>
            <div class="list-group mb-3">
              <RouterLink to="/dashboard" class="list-group-item list-group-item-action" @click="emit('update:open', false)">
                <strong class="d-block">Quick Start Guide</strong>
                <span class="small text-body-secondary">The jobs worth doing first, on the dashboard, ticked as you do them.</span>
              </RouterLink>
              <RouterLink to="/reports/event-logs" class="list-group-item list-group-item-action" @click="emit('update:open', false)">
                <strong class="d-block">Event Log</strong>
                <span class="small text-body-secondary">Proof the console is wired: your own actions are in it.</span>
              </RouterLink>
              <RouterLink to="/portal" class="list-group-item list-group-item-action" @click="emit('update:open', false)">
                <strong class="d-block">End-user portal</strong>
                <span class="small text-body-secondary">The same product from the other seat.</span>
              </RouterLink>
            </div>
            <button class="btn btn-outline-secondary btn-sm" @click="endTrial">End trial and start over</button>
          </template>

          <!-- ---------------- Inbox ---------------- -->
          <template v-else-if="tab === 'inbox'">
            <p class="small text-body-secondary">
              Anything that would leave the system in production lands here —
              SMS codes, e-mail, push approvals, SIEM payloads — with the real
              value in it.
            </p>
            <p v-if="loading" class="small">Loading…</p>
            <div v-else-if="!items.length" class="text-center text-body-secondary py-5">
              <i class="fas fa-frown p-1" /><span>No results found</span>
            </div>
            <div v-else class="list-group">
              <button
                v-for="m in items" :key="m.id"
                class="list-group-item list-group-item-action text-start"
                :class="{ 'fw-semibold': !m.read }"
                @click="markRead(m)"
              >
                <div class="d-flex align-items-center gap-2">
                  <span class="badge rounded-pill bg-secondary">
                    <i class="fa-solid me-1" :class="KIND_ICON[m.kind] || 'fa-circle-info'" />{{ m.kind }}
                  </span>
                  <span class="small">{{ m.subject }}</span>
                  <span class="ms-auto small text-body-secondary">{{ when(m.at) }}</span>
                </div>
                <p class="mb-0 small fw-normal mt-1">{{ m.body }}</p>
                <div v-if="m.meta?.code" class="fs-5 fw-bold mt-1">{{ m.meta.code }}</div>
              </button>
            </div>
            <button class="btn btn-outline-secondary btn-sm mt-3" :disabled="!items.length" @click="clearAll">
              Clear all
            </button>
          </template>

          <!-- ---------------- Flows ---------------- -->
          <template v-else-if="tab === 'flows'">
            <!-- Listed by the sentence a visitor arrives with, not by the
                 console noun the flow happens to touch. Somebody sent here
                 because an auditor asked for MFA is scanning for the word
                 MFA, not for "require multi-factor, and watch a user
                 enrol". -->
            <p class="small text-body-secondary">
              Each one walks a real job end to end, pausing on the screen that
              does it, with the ring showing what to press. Nothing is mimed —
              the steps are the console, and a step only completes when the
              work really happened.
            </p>

            <h6 class="small text-uppercase text-body-secondary mt-3">What brought you here</h6>
            <div class="list-group mb-3">
              <button
                v-for="t in answeringFlows" :key="t.id"
                class="list-group-item list-group-item-action text-start"
                @click="startTour(t.id)"
              >
                <strong class="d-block small">“{{ t.trigger }}”</strong>
                <span class="small text-body-secondary">
                  {{ t.title }} · {{ t.steps.length }} steps
                </span>
              </button>
            </div>

            <h6 class="small text-uppercase text-body-secondary">Once you are running</h6>
            <div class="list-group">
              <button
                v-for="t in runningFlows" :key="t.id"
                class="list-group-item list-group-item-action text-start"
                @click="startTour(t.id)"
              >
                <strong class="d-block small">{{ t.title }}</strong>
                <span class="small text-body-secondary">{{ t.steps.length }} steps</span>
              </button>
            </div>
          </template>

          <!-- ---------------- Data ---------------- -->
          <template v-else>
            <p class="small text-body-secondary">
              Empty or filled, per list. A console nobody has set up yet looks
              very different from a running one, and both are worth seeing.
            </p>
            <div class="btn-group w-100 mb-3">
              <button
                v-for="(p, k) in PRESETS" :key="k"
                class="btn btn-sm" :class="preset === k ? 'btn-primary' : 'btn-outline-secondary'"
                @click="pickPreset(k)"
              >{{ p.label }}</button>
            </div>
            <div class="list-group mb-3">
              <label
                v-for="c in COLLECTIONS" :key="c.key"
                class="list-group-item d-flex align-items-center gap-2"
              >
                <input
                  class="form-check-input m-0" type="checkbox"
                  :checked="consoleDemo[c.key] !== 'empty'"
                  @change="flip(c.key)"
                >
                <span class="small">{{ c.label }}</span>
              </label>
            </div>
            <p class="small text-body-secondary">
              {{ emptiedCount }} list{{ emptiedCount === 1 ? '' : 's' }} currently empty.
            </p>
            <hr>
            <button class="btn btn-danger btn-sm" :disabled="resetting" @click="resetSandbox">
              {{ resetting ? 'Resetting…' : 'Reset this sandbox' }}
            </button>
            <p class="small text-body-secondary mt-2 mb-0">
              Discards every change and seeds the original data again. You stay
              signed in.
            </p>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>
