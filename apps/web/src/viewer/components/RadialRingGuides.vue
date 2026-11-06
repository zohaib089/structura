<script setup lang="ts">
import { computed } from 'vue'
import { RADIAL_RING_GAP } from '../overview'

const props = defineProps<{
  ringCount: number
}>()

const rings = computed(() => {
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
  overflow: visible;
  pointer-events: none;
  inline-size: 1px;
  block-size: 1px;
}
.ring {
  fill: none;
  stroke: color-mix(in srgb, var(--color-brand-navy-lift) 55%, var(--gray-4));
  stroke-width: 1;
  stroke-dasharray: 2 7;
  opacity: 0.7;
}
.ring:nth-child(1) {
  stroke-dasharray: none;
  opacity: 0.55;
}
.ring:nth-child(2) {
  stroke-dasharray: 4 6;
  opacity: 0.62;
}
</style>
