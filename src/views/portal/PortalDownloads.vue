<script setup>
import { ref, computed, inject } from 'vue'
import api from '../../api'

/**
 * Download the agent.
 *
 * Velto shows five equal tiles and leaves you to work out which one you need.
 * The browser already knows, so the tile for the machine you are sitting at
 * leads and the rest follow — a download button for the wrong operating
 * system is noise at best and a support ticket at worst.
 */

const toast = inject('toast', () => {})

const PLATFORMS = [
  /* A real file, not a logged intention. See the note in the admin
     console's Downloads screen. */
  { key: 'windows', label: 'Windows', icon: 'fa-brands fa-windows',
    file: 'InstaSafe-Agent-Prototype.exe', href: '/downloads/InstaSafe-Agent-Prototype.exe',
    note: 'Windows 10 and 11, 64-bit. The working prototype — installer, tray and all.' },
  { key: 'linux', label: 'Linux', icon: 'fa-brands fa-linux',
    file: 'instasafe-agent.deb',
    note: 'Debian and RPM builds, with a systemd unit.' },
  { key: 'macos', label: 'macOS', icon: 'fa-brands fa-apple',
    file: 'InstaSafe.dmg',
    note: 'Signed and notarised. Ventura or later.' },
  { key: 'ios', label: 'iOS', icon: 'fa-brands fa-app-store-ios',
    store: 'App Store',
    note: 'Installed from the App Store, not served from here.' },
  { key: 'android', label: 'Android', icon: 'fa-brands fa-android',
    store: 'Google Play',
    note: 'Installed from Google Play, not served from here.' }
]

const detected = computed(() => {
  const ua = navigator.userAgent
  if (/Android/i.test(ua)) return 'android'
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Mac OS X/i.test(ua)) return 'macos'
  if (/Linux/i.test(ua)) return 'linux'
  return 'windows'
})
const mine = computed(() => PLATFORMS.find(p => p.key === detected.value))
const others = computed(() => PLATFORMS.filter(p => p.key !== detected.value))

const said = ref('')

async function get (p) {
  await api.events.record({
    type: 'download.requested',
    message: `Agent for ${p.label} requested from the member portal`
  })
  said.value = p.label
  toast(`${p.label} — recorded in the event log.`)
}
</script>

<template>
  <div class="container-fluid" id="MemberDownloads" data-type="user">
    <div class="container-heading mb-3">
      <h2>Get the InstaSafe agent</h2>
    </div>
    <p class="text-secondary">
      The agent is what connects this machine to your company's applications.
      Install it once; it starts with the machine after that.
    </p>

    <!-- The one you almost certainly want. -->
    <div v-if="mine" class="card shadow mb-4">
      <div class="card-body d-flex flex-wrap align-items-center gap-3">
        <i class="fa-2x member-icon" :class="mine.icon" aria-hidden="true" />
        <div class="flex-grow-1">
          <p class="text-secondary small mb-0">Looks like you are on</p>
          <h5 class="mb-1">{{ mine.label }}</h5>
          <p class="text-secondary mb-0">{{ mine.note }}</p>
          <p v-if="mine.file" class="text-secondary small mb-0">{{ mine.file }}</p>
        </div>
        <!-- A real file is an <a download>; a logged intention is a button.
             They do different things and should not look like one control
             with a different label. -->
        <a
          v-if="mine.href" class="operation-btn btn btn-primary"
          :href="mine.href" download @click="get(mine)"
        >Download</a>
        <button v-else class="operation-btn btn btn-primary" @click="get(mine)">
          {{ mine.store || 'Download' }}
        </button>
      </div>
    </div>

    <div class="container-heading mb-3"><h2>Other platforms</h2></div>
    <div class="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-4">
      <div v-for="p in others" :key="p.key" class="col">
        <div class="card shadow h-100">
          <div class="card-body d-flex flex-column">
            <i class="member-icon mb-2" :class="p.icon" aria-hidden="true" />
            <h6 class="mb-1">{{ p.label }}</h6>
            <p class="text-secondary small flex-grow-1 mb-2">
              {{ p.note }}
              <span v-if="p.file" class="d-block">{{ p.file }}</span>
            </p>
            <a
              v-if="p.href" class="operation-btn btn btn-primary align-self-start"
              :href="p.href" download @click="get(p)"
            >Download</a>
            <button
              v-else class="operation-btn btn btn-primary align-self-start"
              @click="get(p)"
            >{{ p.store || 'Download' }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- SCOPE.md rates the agent build S for every platform but Windows, and
         this is where that shows. Saying it beats handing somebody a file
         that does not exist. -->
    <div v-if="said" class="alert alert-info mt-4" role="alert">
      <template v-if="said === 'Windows'">
        That is a real executable — the agent prototype, about four hundred
        kilobytes, unsigned. Windows will warn you about an unknown publisher,
        which is correct: it has no code-signing certificate. Run it and you
        get the installer, the tray icon and the connection states.
      </template>
      <template v-else>
        In production this serves the signed agent for {{ said }}, with iOS and
        Android going to their stores. Only the Windows build exists so far, so
        this request is written to the event log instead of handing you a
        broken file.
      </template>
    </div>

    <div class="card shadow mt-4">
      <div class="card-body">
        <h5 class="card-title">After you install it</h5>
        <ol class="mb-0 ps-3">
          <li>Start the agent. On Windows and macOS it starts on its own after the first run.</li>
          <li>Sign in with the same username you used here.</li>
          <li>Your device registers itself and appears on your dashboard.</li>
          <li>An administrator approves it — until then, network applications stay closed.</li>
        </ol>
      </div>
    </div>
  </div>
</template>
