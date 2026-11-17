<script setup>
import { computed } from 'vue'
import { tenant, daysLeft, expired, forgetTrial } from '../../lib/trial.js'

/**
 * What the console says at the edge of the trial.
 *
 * CLAUDE.md §8.1 left the boundary open; this takes the time-limited default
 * and gives it an end that is honest rather than a page that quietly stops
 * working. Two surfaces, both stock Bootstrap:
 *
 *   - with three days or fewer left, a dismissible `.alert.alert-warning`
 *     at the top of the content area. It is not a modal, because a visitor
 *     with two days left should be using the console, not reading about it.
 *   - once the clock runs out, a `.modal` with no close: the sandbox is
 *     read-only from here, and the only two things left to do are talk to
 *     somebody or start again.
 *
 * Nothing is deleted when a trial expires. The sandbox is still there, and
 * starting again reuses it — a visitor who comes back a month later should
 * not lose the rules they wrote.
 */

const emit = defineEmits(['dismiss'])
const props = defineProps({ warningDismissed: Boolean })

const warn = computed(() => !expired.value && daysLeft.value <= 3 && !props.warningDismissed)

function startAgain () {
  forgetTrial()
  location.href = '/signup'
}
</script>

<template>
  <!-- The banner brings its own gutter so that a console with nothing to say
       has no empty row above the page heading. -->
  <div v-if="warn" class="container-fluid pb-0">
    <div class="alert alert-warning alert-dismissible d-flex align-items-center mb-0" role="alert">
    <i class="fas fa-clock me-2" />
    <div>
      <strong>{{ daysLeft }} day{{ daysLeft === 1 ? '' : 's' }} left</strong> in this
      trial of {{ tenant.name }}. Everything you have configured stays in the
      sandbox; the console stops accepting changes when the trial ends.
      <a href="https://instasafe.com/contact-us/" class="alert-link" target="_blank" rel="noopener">
        Talk to us about a tenant of your own
      </a>.
    </div>
      <button type="button" class="btn-close" aria-label="Close" @click="emit('dismiss')" />
    </div>
  </div>

  <Teleport to="body">
    <template v-if="expired">
      <div
        class="modal fade show" tabindex="-1" role="dialog" aria-modal="true"
        data-bs-backdrop="static" data-bs-keyboard="false" style="display:block;z-index:1085"
      >
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="custom-modal-body">
              <div id="modalIcon"><i class="model-icon mb-3 fas fa-hourglass-end text-warning" /></div>
              <h2 class="modal-title mb-3">Your trial has ended</h2>
              <p class="modal-message mb-3">
                {{ tenant.name }} ran for 14 days. The sandbox is still here and
                nothing in it has been deleted — it just stops accepting changes.
              </p>
              <div class="modal-buttons d-flex justify-content-end">
                <button type="button" class="btn btn-secondary" @click="startAgain">Start another trial</button>
                <a
                  class="btn btn-primary ms-3" href="https://instasafe.com/contact-us/"
                  target="_blank" rel="noopener"
                >Talk to us</a>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade show" style="z-index:1080" />
    </template>
  </Teleport>
</template>
