<script setup>
/**
 * Production's page heading, which is two elements and no more:
 *
 *   <div class="container-heading mb-3">
 *     <h2>Users <a class="info-icon" data-bs-toggle="tooltip" …>
 *       <i class="fas fa-info-circle"></i></a></h2>
 *   </div>
 *
 * `subtitle` becomes the tooltip on the info icon rather than a line of text
 * under the title, because that is where production puts the same sentence —
 * "A person that is provisioned in Secure Access through any of the
 * authentication profiles" is the tooltip on `/users`, verbatim from the
 * capture. A screen with no sentence simply has no icon.
 *
 * The `actions` slot is kept for the handful of screens that put a control
 * beside the title; the dashboard is one, with its Quick Start Guide button.
 */
import { onMounted, onUpdated, ref } from 'vue'

defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  /** Unused now — the empty-state switches moved into the Trial panel. */
  collection: { type: String, default: '' }
})

const root = ref(null)

/* Bootstrap tooltips are opt-in: production initialises them on page load and
   so does this, on mount and after any re-render that adds one. */
function arm () {
  const Tooltip = window.bootstrap?.Tooltip
  if (!Tooltip || !root.value) return
  for (const el of root.value.querySelectorAll('[data-bs-toggle="tooltip"]')) {
    Tooltip.getOrCreateInstance(el)
  }
}
onMounted(arm)
onUpdated(arm)
</script>

<template>
  <div ref="root" class="container-heading mb-3" :class="{ 'd-flex align-items-center': $slots.actions }">
    <h2 :class="{ 'me-3': $slots.actions }">
      {{ title }}
      <a
        v-if="subtitle" class="info-icon"
        data-bs-toggle="tooltip" data-bs-placement="bottom"
        :aria-label="subtitle" :title="subtitle"
      ><i class="fas fa-info-circle" /></a>
    </h2>
    <slot name="actions" />
  </div>
</template>
