<script setup lang="ts">
import { BaseEdge, type EdgeProps } from '@vue-flow/core'
import { computed } from 'vue'
import { EDGE_DASH, edgeClass, edgeStroke, edgeWidth } from '../edge-style'
import type { EdgeVisual, OverviewEdgeModel, RadialEdgeRole } from '../overview'
import { radialEdgePath } from '../radial-edge-path'

const props = defineProps<EdgeProps<OverviewEdgeModel>>()
const visual = computed<EdgeVisual>(() => props.data?.visual ?? 'extracted')
const role = computed<RadialEdgeRole>(() => props.data?.role ?? 'spoke')
const centre = computed(() => props.data?.radialCentre ?? { x: 0, y: 0 })
const path = computed(() =>
  radialEdgePath(props.sourceX, props.sourceY, props.targetX, props.targetY, centre.value, role.value)
)
const markerId = computed(() => `marker-${props.id}`)
const flowing = computed(() => Boolean(props.data?.flowing) && visual.value !== 'unresolved')
const revealed = computed(
  () => Boolean(props.data?.emphasized) || Boolean(props.data?.showAllCross) || props.selected
)
const hiddenCross = computed(() => role.value === 'cross' && !revealed.value)
const style = computed(() => ({
  stroke: edgeStroke(visual.value),
  strokeWidth: `calc(${edgeWidth(visual.value)} * var(--graph-disc-scale, 1) * 1px)`,
  strokeDasharray: flowing.value && visual.value === 'extracted'
    ? 'var(--graph-edge-dash-flow)'
    : EDGE_DASH[visual.value] === 'none' ? 'none' : EDGE_DASH[visual.value],
  strokeLinecap: visual.value === 'unresolved' ? 'round' : 'butt',
  fill: 'none',
  opacity: hiddenCross.value ? 0 : 1,
  pointerEvents: hiddenCross.value ? 'none' : 'stroke'
}))
</script>

<template>
  <g
    :class="[edgeClass(visual), `edge-role-${role}`, { 'is-flowing': flowing, 'is-revealed': revealed, 'is-cross-hidden': hiddenCross }]"
    :data-provenance="data?.provenance"
    :data-resolved="data?.resolved ? 'true' : 'false'"
    :data-weight="String(data?.weight ?? 1)"
    :data-role="role"
    :data-cross-hidden="hiddenCross ? 'true' : 'false'"
  >
    <defs v-if="visual === 'unresolved'">
      <marker :id="markerId" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
        <circle cx="4" cy="4" r="2.2" fill="none" :stroke="edgeStroke(visual)" />
      </marker>
    </defs>
    <BaseEdge
      :id="id"
      :path="path.path"
      :label-x="path.labelX"
      :label-y="path.labelY"
      :label="hiddenCross ? '' : (data?.label ?? '')"
      :style="style"
      :marker-end="visual === 'unresolved' && !hiddenCross ? `url(#${markerId})` : undefined"
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
.edge-role-cross :deep(.vue-flow__edge-path) {
  transition: opacity var(--duration-fast, 120ms) ease;
}
</style>
