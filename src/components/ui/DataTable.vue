<script setup>
import { ref, computed, watch } from 'vue'
import { panelOpen, PANEL_SLOT } from '../../lib/list-panel.js'

/**
 * The list template — 54 of the console's screens are this component with
 * different columns, so it is the highest-leverage piece of UI in the
 * project. It now emits production's own markup, captured from `/users`:
 *
 *   div.row.mb-2
 *     .col-12.col-md-6   operation buttons (the `tools` slot)
 *     .col-12.col-md-6   search · "1-4 of 4" · pager · rows-per-page
 *   div.container-separator > .row
 *     .col-12[.col-md-6 while a panel is open]
 *       .table-responsive.table-container
 *         table.table.table-hover.table-borderless.align-middle.text-nowrap
 *           thead.border-bottom.table-light
 *         .text-center.m-2 > i.fas.fa-frown + span   ("No results found")
 *     #list-side-panel.col-12.col-md-6                the add/edit card
 *
 * What was dropped, deliberately (CLAUDE.md §8.5): sortable headers and the
 * column chooser. Both are good and neither exists in production, and they
 * sit *inside* the list template, which is where a difference is most
 * visible. The access explorer and the guided flows are kept — they are
 * additions beside the product, not alterations to it.
 *
 * What was kept: `sort`/`dir` props and the `sort` event, because nine
 * screens pass them and a default sort order is not a visible feature.
 *
 * Production's page sizes are 10 / 30 / 50 and the count reads "1-4 of 4".
 * Row click opens the record — there is no per-row edit button anywhere in
 * production, and the whole table is `cursor:pointer` in style.css.
 */

const props = defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, default: () => [] },
  total: { type: Number, default: 0 },
  loading: Boolean,
  page: { type: Number, default: 1 },
  perPage: { type: Number, default: 10 },
  sort: { type: String, default: '' },
  dir: { type: String, default: 'asc' },
  selectable: { type: Boolean, default: true },
  rowKey: { type: String, default: 'id' },
  rowAction: { type: Object, default: null },
  /** Bound to the search box in the right-hand column. */
  search: { type: String, default: '' },
  searchable: { type: Boolean, default: true },
  /**
   * Most lists sit in `.container-separator`, which is what gives
   * `.table-container` its border. The report screens do not — the event log
   * puts `.table-responsive.table-container` straight into the page, with no
   * border at all — so this is how a screen says which it is.
   */
  boxed: { type: Boolean, default: true }
})

const emit = defineEmits([
  'update:page', 'update:perPage', 'update:search',
  'sort', 'selection', 'row-action', 'row-click'
])

const selected = ref(new Set())
const draft = ref(props.search)
watch(() => props.search, (v) => { draft.value = v })

const pages = computed(() => Math.max(1, Math.ceil(props.total / props.perPage)))
const from = computed(() => props.total === 0 ? 0 : (props.page - 1) * props.perPage + 1)
const to = computed(() => Math.min(props.page * props.perPage, props.total))

// a new page of rows invalidates the old selection
watch(() => props.rows, () => { selected.value = new Set(); emitSelection() })

function emitSelection () { emit('selection', [...selected.value]) }

function toggleRow (row) {
  const s = new Set(selected.value)
  const k = row[props.rowKey]
  s.has(k) ? s.delete(k) : s.add(k)
  selected.value = s
  emitSelection()
}

const allOn = computed(() =>
  props.rows.length > 0 && props.rows.every(r => selected.value.has(r[props.rowKey])))
const someOn = computed(() =>
  props.rows.some(r => selected.value.has(r[props.rowKey])) && !allOn.value)

function toggleAll () {
  selected.value = allOn.value ? new Set() : new Set(props.rows.map(r => r[props.rowKey]))
  emitSelection()
}

function clearSelection () { selected.value = new Set(); emitSelection() }
defineExpose({ clearSelection })

/** Production searches on Enter, not as you type. */
function commitSearch () { emit('update:search', draft.value) }

function value (row, col) {
  const raw = row[col.key]
  return col.cell ? col.cell(raw, row) : raw
}

/**
 * Production badges every status, always filled, always a pill.
 * `col.pill(value, row)` returns '' for the expected case in the redesign's
 * model; here that becomes `bg-success`, which is what the capture shows on
 * every Active row.
 */
function badgeClass (col, row) {
  const tone = col.pill ? col.pill(row[col.key], row) : ''
  if (tone === 'bad') return 'bg-danger'
  if (tone === 'att') return 'bg-warning text-dark'
  if (tone === 'off') return 'bg-secondary'
  return 'bg-success'
}

function cellClass (col) {
  return {
    'text-end': col.align === 'right',
    'text-center': col.align === 'center',
    'text-capitalize': col.capitalize,
    'text-uppercase': col.upper
  }
}
</script>

<template>
  <!-- the toolbar row -->
  <div class="row mb-2">
    <div class="col-12 col-md-6 d-flex flex-wrap justify-content-start align-items-center">
      <slot name="tools" :selected="[...selected]" :clear="clearSelection" />
      <slot name="bulk" :ids="[...selected]" :clear="clearSelection" />
    </div>
    <div class="col-12 col-md-6 d-flex justify-content-end align-items-center">
      <input
        v-if="searchable"
        v-model="draft" type="search" class="form-control"
        placeholder="Type keyword and enter to search"
        @keyup.enter="commitSearch" @search="commitSearch"
      >
      <span class="fs-6 text-nowrap ms-2">{{ from }}-{{ to }} of {{ total }}</span>
      <button
        :disabled="page <= 1" class="btn pagination-btn" type="button"
        aria-label="Previous page" @click="emit('update:page', page - 1)"
      ><i class="fas fa-chevron-left" /></button>
      <select
        name="pageselect" id="pageselect" class="form-select pagination-select"
        :value="perPage" aria-label="Rows per page"
        @change="emit('update:perPage', Number($event.target.value))"
      >
        <option :value="10">10</option>
        <option :value="30">30</option>
        <option :value="50">50</option>
      </select>
      <button
        :disabled="page >= pages" class="btn pagination-btn" type="button"
        aria-label="Next page" @click="emit('update:page', page + 1)"
      ><i class="fas fa-chevron-right" /></button>
    </div>
  </div>

  <div :class="boxed ? 'container-separator' : ''">
    <div class="row">
      <div class="col-12" :class="panelOpen ? 'col-md-6' : 'col-md-12'">
        <div class="table-responsive table-container">
          <table class="table table-hover table-borderless align-middle text-nowrap">
            <thead class="border-bottom table-light">
              <tr>
                <th v-if="selectable">
                  <input
                    type="checkbox" id="selectAll" aria-label="Select all on this page"
                    :checked="allOn" :indeterminate.prop="someOn" @change="toggleAll"
                  >
                </th>
                <th
                  v-for="col in columns" :key="col.key"
                  :class="{ 'text-end': col.align === 'right', 'text-center': col.align === 'center' }"
                >{{ col.label }}</th>
                <th v-if="rowAction || $slots.actions">{{ $slots.actions ? 'Action' : '' }}</th>
              </tr>
            </thead>

            <tbody v-if="loading">
              <tr v-for="n in 5" :key="n">
                <td v-if="selectable" />
                <td v-for="col in columns" :key="col.key">&nbsp;</td>
                <td v-if="rowAction || $slots.actions" />
              </tr>
            </tbody>

            <tbody v-else>
              <tr v-for="row in rows" :key="row[rowKey]" @click="emit('row-click', row)">
                <td v-if="selectable" @click.stop>
                  <input
                    type="checkbox" :id="`checkbox-${row[rowKey]}`" :value="row[rowKey]"
                    :aria-label="`Select ${row.name || row.username || row[rowKey]}`"
                    :checked="selected.has(row[rowKey])" @change="toggleRow(row)"
                  >
                </td>

                <td
                  v-for="col in columns" :key="col.key"
                  :class="[cellClass(col), col.indicator ? 'd-flex align-items-center' : '']"
                >
                  <!-- Two first-column idioms, both production's. /users puts
                       a live-session dot before the name and links it to the
                       live report; /devices makes the name a bold blue link
                       to the record. Which one a screen uses is the screen's
                       business, so neither is a default. -->
                  <template v-if="col.indicator">
                    <RouterLink
                      to="/reports/live"
                      class="rounded-circle me-1 d-inline-block status-indicator"
                      :class="row.online ? 'bg-success' : 'bg-warning'"
                      @click.stop
                    /> {{ value(row, col) ?? '—' }}
                  </template>

                  <template v-else-if="col.link">
                    <a class="text-decoration-none fw-bold text-primary" role="button">{{ value(row, col) ?? '—' }}</a>
                  </template>

                  <!-- Velto prints its switches as Enabled / Disabled pills,
                       red for off — the user-groups capture is three of them
                       in a row. -->
                  <template v-else-if="col.bool">
                    <span class="badge rounded-pill" :class="row[col.key] ? 'bg-success' : 'bg-danger'">
                      {{ row[col.key] ? 'Enabled' : 'Disabled' }}
                    </span>
                  </template>

                  <template v-else-if="col.pill">
                    <span class="badge rounded-pill" :class="badgeClass(col, row)"> {{ value(row, col) }} </span>
                  </template>

                  <template v-else>{{ value(row, col) ?? '—' }}</template>
                </td>

                <td v-if="rowAction || $slots.actions" @click.stop>
                  <slot name="actions" :row="row">
                    <button
                      v-if="rowAction && (!rowAction.when || rowAction.when(row))"
                      class="btn btn-primary operation-btn"
                      @click="emit('row-action', row)"
                    >{{ rowAction.label }}</button>
                  </slot>
                </td>
              </tr>
            </tbody>
          </table>

          <div class="text-center m-2" :style="{ display: (!loading && !rows.length) ? '' : 'none' }">
            <i class="fas fa-frown p-1" /><span>No results found</span>
          </div>
        </div>
      </div>

      <!-- The add/edit card lands here; see lib/list-panel.js. -->
      <div v-show="panelOpen" :id="PANEL_SLOT" class="col-12 col-md-6" />
    </div>
  </div>
</template>
