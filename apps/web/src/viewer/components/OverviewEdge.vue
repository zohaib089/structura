<script setup lang="ts">
import { BaseEdge, getStraightPath, type EdgeProps } from '@vue-flow/core'
import { computed } from 'vue'
import { EDGE_DASH, edgeClass, edgeStroke, edgeWidth } from '../edge-style'
import type { EdgeVisual, OverviewEdgeModel } from '../overview'

const props = defineProps<EdgeProps<OverviewEdgeModel>>()
const visual = computed<EdgeVisual>(() => props.data?.visual ?? 'extracted')
const path = computed(() => getStraightPath(props))
const markerId = computed(() => `marker-${props.id}`)
const flowing = computed(() => Boolean(props.data?.flowing) && visual.value !== 'unresolved')
const style = computed(() => ({
  stroke: edgeStroke(visual.value),
  strokeWidth: `calc(${edgeWidth(visual.value)} * var(--graph-mark-scale, 1) * 1px)`,
  strokeDasharray: flowing.value && visual.value === 'extracted'
    ? 'var(--graph-edge-dash-flow)'
    : EDGE_DASH[visual.value] === 'none' ? 'none' : EDGE_DASH[visual.value],
  strokeLinecap: visual.value === 'unresolved' ? 'round' : 'butt',
  fill: 'none'
}))
</script>

<template>
  <g
    :class="[edgeClass(visual), { 'is-flowing': flowing }]"
    :data-provenance="data?.provenance"
    :data-resolved="data?.resolved ? 'true' : 'false'"
    :data-weight="String(data?.weight ?? 1)"
  >
    <defs v-if="visual === 'unresolved'">
      <marker :id="markerId" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
        <circle cx="4" cy="4" r="2.2" fill="none" :stroke="edgeStroke(visual)" />
      </marker>
    </defs>
    <BaseEdge
      :id="id"
      :path="path[0]"
      :label-x="path[1]"
      :label-y="path[2]"
      :label="data?.label ?? ''"
      :style="style"
      :marker-end="visual === 'unresolved' ? `url(#${markerId})` : undefined"
    />
  </g>
</template>

<style scoped>
@media (prefers-reduced-motion: no-preference) {
  .is-flowing :deep(.vue-flow__edge-path) {
    animation: edge-flow var(--duration-flow) linear infinite;
  }
}
@keyframes edge-flow {
  to { stroke-dashoffset: var(--graph-flow-offset); }
}
</style>





