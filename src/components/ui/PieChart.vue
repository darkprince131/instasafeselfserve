<script setup>
import { computed } from 'vue'

/**
 * The dashboard's pie, as production draws it.
 *
 * Veno renders four of these at 300x300 with Chart.js, and in the captured
 * tenant each one was a single blue slice with a thin white separator — which
 * is what a pie looks like when the tenant has one user doing anything. The
 * palette below is Chart.js's own default series, so a trial with real data
 * produces the same colours a customer sees.
 *
 * Drawn as SVG rather than canvas: nothing here needs a canvas, and an SVG
 * scales, prints and reads to a screen reader.
 */

const props = defineProps({
  /** [{ label, value }] — already sorted and trimmed by the caller. */
  slices: { type: Array, default: () => [] },
  size: { type: Number, default: 300 }
})

const PALETTE = [
  '#36a2eb', '#ff6384', '#ff9f40', '#ffcd56',
  '#4bc0c0', '#9966ff', '#c9cbcf', '#7cb342'
]

const total = computed(() => props.slices.reduce((n, s) => n + (s.value || 0), 0))

/** One slice means one circle: an arc of exactly 360° degenerates to a point. */
const whole = computed(() => props.slices.filter(s => s.value > 0).length === 1)

const arcs = computed(() => {
  if (!total.value) return []
  const r = props.size / 2
  let a = -Math.PI / 2
  return props.slices.map((s, i) => {
    const frac = (s.value || 0) / total.value
    const end = a + frac * Math.PI * 2
    const x1 = r + r * Math.cos(a)
    const y1 = r + r * Math.sin(a)
    const x2 = r + r * Math.cos(end)
    const y2 = r + r * Math.sin(end)
    const large = frac > 0.5 ? 1 : 0
    const d = `M ${r} ${r} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`
    a = end
    return { d, fill: PALETTE[i % PALETTE.length], label: s.label, value: s.value }
  })
})
</script>

<template>
  <div class="d-flex align-items-center justify-content-center">
    <span>
      <svg
        v-if="total"
        class="chart chart-pie" :width="size" :height="size"
        :viewBox="`0 0 ${size} ${size}`" role="img"
        :aria-label="slices.map(s => `${s.label}: ${s.value}`).join(', ')"
      >
        <circle
          v-if="whole" :cx="size / 2" :cy="size / 2" :r="size / 2"
          :fill="arcs.find(a => a.value > 0)?.fill || '#36a2eb'"
        />
        <path
          v-else v-for="(a, i) in arcs" :key="i"
          :d="a.d" :fill="a.fill" stroke="#fff" stroke-width="2"
        />
        <!-- the separator Chart.js leaves on a single-slice pie -->
        <line
          v-if="whole" :x1="size / 2" y1="0" :x2="size / 2" :y2="size / 2"
          stroke="#fff" stroke-width="2"
        />
      </svg>
      <p v-else class="no_data_p"> No results found </p>
    </span>
  </div>
</template>
