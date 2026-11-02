<script setup lang="ts">
import { BaseEdge, getBezierPath, type EdgeProps } from '@vue-flow/core'
import { computed } from 'vue'
import { EDGE_DASH, edgeClass, edgeStroke, edgeWidth } from '../edge-style'
import type { EdgeVisual, OverviewEdgeModel } from '../overview'

const props = defineProps<EdgeProps<OverviewEdgeModel>>()
const visual = computed<EdgeVisual>(() => props.data?.visual ?? 'extracted')
const path = computed(() => getBezierPath(props))
const markerId = computed(() => `marker-${props.id}`)
const style = computed(() => ({
  stroke: edgeStroke(visual.value),
  strokeWidth: edgeWidth(visual.value),
  strokeDasharray: EDGE_DASH[visual.value] === 'none' ? 'none' : EDGE_DASH[visual.value],
  strokeLinecap: visual.value === 'unresolved' ? 'round' : 'butt',
  fill: 'none'
}))
</script>

<template>
  <g
    :class="edgeClass(visual)"
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
