<script setup lang="ts">
import { computed } from 'vue'
import { VueFlow, type Edge, type Node } from '@vue-flow/core'
import '@vue-flow/core/dist/style.css'
import type { GraphArchitecture, GraphDocument } from '../../viewer/graph-types'
import { buildModuleDependencyEdges } from '../../services/scan-report-architecture'

const props = defineProps<{
  graph: GraphDocument
  architecture: GraphArchitecture
}>()

const moduleEdges = computed(() => buildModuleDependencyEdges(props.graph, props.architecture))

const moduleNames = computed(() => {
  const names = new Set<string>()
  for (const mod of props.architecture.modules) names.add(mod.name)
  for (const edge of moduleEdges.value) {
    names.add(edge.sourceModule)
    names.add(edge.targetModule)
  }
  return [...names].sort((a, b) => a.localeCompare(b))
})

const flowNodes = computed<Node[]>(() =>
  moduleNames.value.map((name, index) => ({
    id: name,
    position: { x: (index % 4) * 200, y: Math.floor(index / 4) * 120 },
    data: { label: name },
    style: {
      borderColor: 'var(--color-border-strong)',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderRadius: 'var(--radius-md)',
      padding: '8px 12px',
      fontSize: '12px',
      background: 'var(--color-surface)',
      minWidth: '120px',
      textAlign: 'center'
    }
  }))
)

const flowEdges = computed<Edge[]>(() =>
  moduleEdges.value.map(edge => ({
    id: edge.id,
    source: edge.sourceModule,
    target: edge.targetModule,
    label: edge.violating ? 'Violation' : edge.edgeKind,
    ariaLabel: edge.ariaLabel,
    style: edge.violating
      ? {
          stroke: 'var(--color-danger)',
          strokeWidth: 3,
          strokeDasharray: '6 4'
        }
      : {
          stroke: 'var(--color-text-secondary)',
          strokeWidth: 1.5
        },
    labelStyle: edge.violating
      ? { fill: 'var(--color-danger)', fontWeight: 700 }
      : { fill: 'var(--color-text-secondary)' },
    animated: edge.violating
  }))
)

const emptyGraph = computed(() => flowEdges.value.length === 0)
</script>

<template>
  <div class="graph-shell">
    <p v-if="emptyGraph" class="empty" role="status">
      No cross-module import edges were found in this scan graph.
    </p>
    <VueFlow
      v-else
      :nodes="flowNodes"
      :edges="flowEdges"
      :fit-view-on-init="true"
      :nodes-draggable="false"
      :nodes-connectable="false"
      :elements-selectable="true"
      :zoom-on-scroll="true"
      :pan-on-scroll="true"
      class="report-flow"
    />
  </div>
</template>

<style scoped>
.graph-shell {
  height: 28rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: color-mix(in srgb, var(--color-surface) var(--alpha-50), transparent);
}

.report-flow {
  width: 100%;
  height: 100%;
}

.empty {
  margin: 0;
  padding: var(--space-4);
  color: var(--color-text-secondary);
}
</style>
