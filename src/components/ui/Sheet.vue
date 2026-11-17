<script setup>
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'
import { PANEL_SLOT, claimPanel, releasePanel, slotReady } from '../../lib/list-panel.js'

/**
 * The add / edit / view panel.
 *
 * Production has two shapes for this and both are in the captures:
 *
 *  1. Beside the list. The table shrinks to `col-md-6`, a `.card.show` takes
 *     the other half, and it carries a red `X` (`.card-close-btn`), its own
 *     `.container-heading`, and a `Save` / `Reset` footer in `.nav-btn`s.
 *     This is `users-groups--users--add`.
 *  2. A modal. `#UserModel` — "User Details", `modal-xl modal-dialog-centered`
 *     — for a record opened from somewhere that has no list beside it, and
 *     for a panel opened from inside another panel.
 *
 * So this component picks: if the screen published a side column it uses it,
 * otherwise, and always when `nested`, it renders the modal. Neither one is
 * the redesign's floating right-hand sheet, which was the thing that made the
 * screen read as a different product.
 */

const props = defineProps({
  open: Boolean,
  /** A panel opened from inside another: always a modal, always on top. */
  nested: Boolean,
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  /** Kept for call-site compatibility; the column's width is production's. */
  width: { type: String, default: '' }
})
const emit = defineEmits(['update:open'])

/** true → render into the list's side column; false → render as a modal. */
const inColumn = ref(false)
let claimed = false

function release () {
  if (claimed) { releasePanel(); claimed = false }
}

watch(() => props.open, async (o) => {
  if (!o) { release(); inColumn.value = false; return }
  if (props.nested) { inColumn.value = false; return }
  /* Claim the column first: the table only renders the target once something
     has claimed it, so the element does not exist until after this tick. */
  claimPanel(); claimed = true
  await nextTick()
  inColumn.value = slotReady()
  if (!inColumn.value) release()
}, { immediate: true })

onBeforeUnmount(release)

function close () { emit('update:open', false) }
function onKey (e) { if (e.key === 'Escape') close() }
</script>

<template>
  <!-- 1 · beside the list -->
  <Teleport v-if="open && inColumn" :to="`#${PANEL_SLOT}`">
    <div class="card show" @keydown="onKey">
      <div class="card-body">
        <button class="btn card-close-btn float-end" type="button" aria-label="Close" @click="close">X</button>
        <div class="container-heading mb-3">
          <h2>
            {{ title }}
            <a
              v-if="subtitle" class="info-icon" data-bs-toggle="tooltip" data-bs-placement="bottom"
              :aria-label="subtitle" :title="subtitle"
            ><i class="fas fa-info-circle" /></a>
          </h2>
        </div>
        <form @submit.prevent>
          <slot />
          <div v-if="$slots.footer" class="row mt-2">
            <div class="col-12 d-flex"><slot name="footer" /></div>
          </div>
        </form>
      </div>
    </div>
  </Teleport>

  <!-- 2 · the modal, which is production's own #UserModel -->
  <Teleport v-else-if="open" to="body">
    <div
      class="modal fade show" tabindex="-1" role="dialog" aria-modal="true"
      data-bs-backdrop="static" data-bs-keyboard="false"
      style="display:block" :style="{ zIndex: nested ? 1070 : 1055 }"
      @keydown="onKey"
    >
      <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header d-flex justify-content-between">
            <h1 class="modal-title fs-5">{{ title }}</h1>
            <button class="btn card-close-btn float-end" type="button" aria-label="Close" @click="close">X</button>
          </div>
          <div class="modal-body">
            <p v-if="subtitle" class="form-text mb-3">{{ subtitle }}</p>
            <slot />
          </div>
          <div v-if="$slots.footer" class="modal-footer"><slot name="footer" /></div>
        </div>
      </div>
    </div>
    <div class="modal-backdrop fade show" :style="{ zIndex: nested ? 1065 : 1050 }" @click="close" />
  </Teleport>
</template>
