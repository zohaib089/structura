<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, onUpdated, ref } from 'vue'
import { RADIAL_RING_GAP } from '../overview'
import type { HalfRingCaption } from '../file-neighborhood'

const props = defineProps<{
  ringCount: number
  /** Actual ring radii from the layout (rings grow with population); falls back to the fixed gap. */
  radii?: number[]
  halfCaptions?: HalfRingCaption[]
  /** Narrow panes: title over count ("USES" / "36") so the plate keeps clear of the centre disc. */
  stackedCaptions?: boolean
}>()

const rings = computed(() => {
  // Prefer exact layout radii so guides sit under nodes. Only fall back when layout has
  // not supplied radii yet — and never invent extra outer rings beyond ringCount.
  if (props.radii && props.radii.length > 0) return props.radii
  const list: number[] = []
  const n = Math.max(0, props.ringCount)
  for (let ring = 1; ring <= n; ring += 1) list.push(ring * RADIAL_RING_GAP)
  return list
})

const captionMarks = computed(() => {
  const radius = rings.value[0]
  if (!radius || !props.halfCaptions?.length) return []
  const r = radius * 0.58
  return props.halfCaptions.map((caption) => ({
    ...caption,
    x: r * Math.cos(caption.angle),
    y: r * Math.sin(caption.angle),
    anchor: 'middle',
    text: `${caption.title} · ${caption.count}`,
    title: caption.title,
    count: String(caption.count)
  }))
})

// A plate behind each caption so spokes that cross the label never run through the text.
const textEls = ref<SVGTextElement[]>([])
const plates = ref<Record<string, { x: number; y: number; w: number; h: number }>>({})
function measure() {
  const next: Record<string, { x: number; y: number; w: number; h: number }> = {}
  for (const el of textEls.value) {
    const side = el?.dataset.side
    if (!side || typeof el.getBBox !== 'function') continue
    const b = el.getBBox()
    if (!b.width) continue
    const padX = b.height * 0.45
    const padY = b.height * 0.2
    next[side] = { x: b.x - padX, y: b.y - padY, w: b.width + padX * 2, h: b.height + padY * 2 }
  }
  const same = JSON.stringify(next) === JSON.stringify(plates.value)
  if (!same) plates.value = next
}
// The caption font follows --graph-mark-scale (set after the fit), so re-measure when its box changes.
let observer: ResizeObserver | null = null
function observe() {
  if (typeof ResizeObserver === 'undefined') return
  observer?.disconnect()
  observer = new ResizeObserver(() => measure())
  for (const el of textEls.value) if (el) observer.observe(el)
}
onMounted(() => nextTick(() => { measure(); observe() }))
onUpdated(() => nextTick(() => { measure(); observe() }))
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <svg class="ring-guides" aria-hidden="true" :data-radii="rings.join(',')">
    <circle v-for="radius in rings" :key="radius" :r="radius" cx="0" cy="0" class="ring" />
    <template v-for="mark in captionMarks" :key="mark.side">
    <rect
      v-if="plates[mark.side]"
      class="half-caption-plate"
      :x="plates[mark.side].x"
      :y="plates[mark.side].y"
      :width="plates[mark.side].w"
      :height="plates[mark.side].h"
      :rx="plates[mark.side].h / 2"
    />
    <text
      ref="textEls"
      :data-side="mark.side"
      class="half-caption"
      :x="mark.x"
      :y="mark.y"
      :text-anchor="mark.anchor"
      dominant-baseline="middle"
    ><template v-if="stackedCaptions"><tspan :x="mark.x" dy="-1.15em">{{ mark.title }}</tspan><tspan :x="mark.x" dy="1.1em">{{ mark.count }}</tspan></template><template v-else>{{ mark.text }}</template></text>
    </template>
  </svg>
</template>

<style scoped>
.ring-guides {
  /* Node positions are top-left corners; centre the rings on the disc centre of a node at (0,0). */
  display: block;
  margin-inline-start: calc(0.75rem * var(--graph-disc-scale, 1));
  /* Same as half the regular disc — matches Vue Flow handle / spoke centre. */
  margin-block-start: calc(0.75rem * var(--graph-disc-scale, 1));
  overflow: visible;
  pointer-events: none;
  inline-size: 1px;
  block-size: 1px;
}
.ring {
  fill: none;
  stroke: #3b5683;
  stroke-width: calc(1.25px * var(--graph-disc-scale, 1));
  stroke-dasharray: 2 7;
  opacity: 0.9;
}
.ring:nth-child(1) {
  stroke-dasharray: none;
  opacity: 0.85;
}
.ring:nth-child(2) {
  stroke-dasharray: 4 6;
  opacity: 0.85;
}
.half-caption-plate {
  fill: var(--color-surface, #07111f);
  fill-opacity: 0.92;
  stroke: #3b5683;
  stroke-opacity: 0.55;
  stroke-width: calc(1px * var(--graph-mark-scale, 1));
}
.half-caption {
  fill: var(--color-text-secondary, #c5d0e0);
  font-size: calc(11px * var(--graph-mark-scale, 1));
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  paint-order: stroke fill;
  stroke: var(--color-surface, #07111f);
  stroke-width: calc(4px * var(--graph-mark-scale, 1));
  stroke-linejoin: round;
}
</style>
