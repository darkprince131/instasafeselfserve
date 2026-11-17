import { ref, computed } from 'vue'

/**
 * Production does not float its add/edit form over the list. It splits the
 * row: the table shrinks to `col-md-6` and a `.card.show` takes the other
 * half, with its own heading, its tabs and a Save/Reset footer. The capture
 * `users-groups--users--add` is exactly that, and it is one of the screens
 * this project is measured against.
 *
 * That shape couples two components that are siblings in every view —
 * `DataTable` renders the row, `Sheet` renders the card — so rather than
 * thread a prop through fifty call sites, the table publishes a column to
 * teleport into and this counter says whether anything is in it.
 *
 * A counter rather than a boolean because a screen can open a second panel
 * from inside the first (a secret, a nested list); those render as modals and
 * do not claim the column, so only panels that actually take it register.
 */
const openPanels = ref(0)

export const PANEL_SLOT = 'list-side-panel'

export const panelOpen = computed(() => openPanels.value > 0)

export function claimPanel () { openPanels.value++ }
export function releasePanel () { openPanels.value = Math.max(0, openPanels.value - 1) }

/** True once the column exists in the DOM and can be teleported into. */
export function slotReady () {
  return typeof document !== 'undefined' && !!document.getElementById(PANEL_SLOT)
}
