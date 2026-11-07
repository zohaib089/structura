<script setup lang="ts">
import type { EdgeProps } from '@vue-flow/core'
import { computed } from 'vue'
import { quadraticEdgePath } from '../../components/graph/radial-geometry'
import '../../components/graph/radial-graph.css'
import type { EdgeVisual, OverviewEdgeModel } from '../overview'

const props = defineProps<EdgeProps<OverviewEdgeModel>>()
const visual = computed<EdgeVisual>(() => props.data?.visual ?? 'extracted')
const hot = computed(() => Boolean(props.data?.hot) && visual.value !== 'unresolved')
const path = computed(() =>
  quadraticEdgePath(props.sourceX, props.sourceY, props.targetX, props.targetY, 0, 0)
)
const kindClass = computed(() => {
  if (visual.value === 'unresolved') return 'radial__edge--unresolved'
  if (visual.value === 'mixed') return 'radial__edge--mixed'
  if (visual.value === 'inferred') return 'radial__edge--inferred'
  return ''
})
</script>

<template>
  <g
    :data-provenance="data?.provenance"
    :data-resolved="data?.resolved ? 'true' : 'false'"
    :data-weight="String(data?.weight ?? 1)"
  >
    <path
      :d="path"
      class="vue-flow__edge-path radial__edge"
      :class="[kindClass, { 'is-hot': hot }]"
    />
  </g>
</template>
