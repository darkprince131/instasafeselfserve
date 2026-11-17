<script setup>
/**
 * Production's confirm dialog, markup-for-markup — `#dynamicAlertModal` from
 * the `users--delete-confirm` capture:
 *
 *   .modal.fade.show > .modal-dialog.modal-dialog-centered > .modal-content
 *     .custom-modal-body
 *       #modalIcon > i.model-icon.mb-3.fas.fa-trash-alt.text-danger   (80px)
 *       h2.modal-title.mb-3    "Are You Sure?"
 *       p.modal-message.mb-3   "Do you want to delete the user?"
 *       .modal-buttons.d-flex.justify-content-end
 *         button.btn.btn-secondary                "Cancel"
 *         button.btn.btn-danger.ms-3              "Yes, Delete it!"
 *   .modal-backdrop.fade.show
 *
 * The redesign named the object being destroyed instead of asking "Are You
 * Sure?" over a glyph. That is better and it is a visible difference on a
 * captured screen, so production wins: the heading and the glyph are
 * production's, and what the redesign added survives as the sentence in
 * `.modal-message`, which production also fills.
 */
defineProps({
  open: Boolean,
  /** Shown in `.modal-message`; the heading stays production's. */
  title: { type: String, default: '' },
  body: { type: String, default: '' },
  confirmLabel: { type: String, default: 'Yes, Delete it!' },
  heading: { type: String, default: 'Are You Sure?' },
  icon: { type: String, default: 'fa-trash-alt' },
  destructive: { type: Boolean, default: true }
})
const emit = defineEmits(['update:open', 'confirm'])
</script>

<template>
  <Teleport to="body">
    <template v-if="open">
      <div
        class="modal fade show" tabindex="-1" role="dialog" aria-modal="true"
        data-bs-backdrop="static" data-bs-keyboard="false" style="display:block;z-index:1075"
      >
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="custom-modal-body">
              <div id="modalIcon">
                <i
                  class="model-icon mb-3 fas" :class="[icon, destructive ? 'text-danger' : 'text-warning']"
                />
              </div>
              <h2 class="modal-title mb-3" id="modalTitle">{{ heading }}</h2>
              <p class="modal-message mb-3" id="modalMessage">
                <slot>{{ body || title }}</slot>
              </p>
              <div class="modal-buttons d-flex justify-content-end">
                <button type="button" class="btn btn-secondary" @click="emit('update:open', false)">Cancel</button>
                <button
                  type="button" class="btn ms-3"
                  :class="destructive ? 'btn-danger' : 'btn-primary'"
                  id="modalActionButton" @click="emit('confirm')"
                >{{ confirmLabel }}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade show" style="z-index:1070" />
    </template>
  </Teleport>
</template>
