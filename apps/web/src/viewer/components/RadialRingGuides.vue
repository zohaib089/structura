<script setup lang="ts">
import { computed } from 'vue'
import { ringLabelDegrees, ringRadius } from '../../components/graph/radial-geometry'
import { stepsAway } from '../../services/landing-page-copy'
import '../../components/graph/radial-graph.css'

const props = defineProps<{
  ringCount: number
}>()

const rings = computed(() => {
  const list: { ring: number; radius: number; x: number; y: number; text: string }[] = []
  for (let ring = 1; ring <= props.ringCount; ring += 1) {
    const radius = ringRadius(ring)
    const radians = (ringLabelDegrees(ring) * Math.PI) / 180
    list.push({
      ring,
      radius,
      x: radius * Math.cos(radians),
      y: radius * Math.sin(radians) + 3,
      text: stepsAway(ring)
    })
  }
  return list
})
</script>

<template>
  <svg class="ring-guides" aria-hidden="true">
    <circle
      v-for="ring in rings"
      :key="ring.ring"
      :r="ring.radius"
      cx="0"
      cy="0"
      class="radial__ring"
      :class="`radial__ring--${ring.ring}`"
    />
    <text
      v-for="ring in rings"
      :key="`label-${ring.ring}`"
      :x="ring.x"
      :y="ring.y"
      text-anchor="middle"
      class="radial__ring-label"
    >
      {{ ring.text }}
    </text>
  </svg>
</template>

<style scoped>
.ring-guides {
  overflow: visible;
  pointer-events: none;
  inline-size: 1px;
  block-size: 1px;
}
</style>
