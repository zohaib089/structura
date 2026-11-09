<script setup lang="ts">
import { computed } from 'vue'
import { RADIAL_RING_GAP } from '../overview'

const props = defineProps<{
  ringCount: number
  /** Actual ring radii from the layout (rings grow with population); falls back to the fixed gap. */
  radii?: number[]
}>()

const rings = computed(() => {
  if (props.radii && props.radii.length > 0) return props.radii
  const list: number[] = []
  for (let ring = 1; ring <= props.ringCount; ring += 1) list.push(ring * RADIAL_RING_GAP)
  return list
})
</script>

<template>
  <svg class="ring-guides" aria-hidden="true">
    <circle v-for="radius in rings" :key="radius" :r="radius" cx="0" cy="0" class="ring" />
  </svg>
</template>

<style scoped>
.ring-guides {
  /* Node positions are top-left corners; centre the rings on the disc centre of a node at (0,0). */
  display: block;
  margin-inline-start: calc(0.75rem * var(--graph-disc-scale, 1));
  margin-block-start: max(calc(var(--viewer-hit-target, 2.75rem) / 2), calc(0.75rem * var(--graph-disc-scale, 1)));
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
</style>
