<script setup lang="ts">
import { computed, ref } from 'vue'
import type { DashboardMessages } from '../../services/dashboard-messages'

const props = defineProps<{
  messages: DashboardMessages
}>()

const nodeIds = ['Web UI', 'API', 'Auth', 'Workspace', 'Inventory', 'Database'] as const
type NodeId = typeof nodeIds[number]

const edges: Array<{ from: NodeId; to: NodeId }> = [
  { from: 'Web UI', to: 'API' },
  { from: 'API', to: 'Auth' },
  { from: 'API', to: 'Workspace' },
  { from: 'Workspace', to: 'Inventory' },
  { from: 'Auth', to: 'Database' },
  { from: 'Inventory', to: 'Database' }
]

const nodePaths: Record<NodeId, string> = {
  'Web UI': 'apps/web/src',
  API: 'apps/api/src',
  Auth: 'apps/api/src/auth',
  Workspace: 'apps/api/src/workspaces',
  Inventory: 'apps/api/src/analysis/inventory',
  Database: 'apps/api/src/database'
}
const selectedNode = ref<NodeId>('API')
const selectedNodeLabel = computed(() => selectedNode.value)
const selectedConnections = computed(() =>
  edges.filter(edge => edge.from === selectedNode.value || edge.to === selectedNode.value)
)
</script>

<template>
  <div class="architecture-demo">
    <section class="demo-banner" aria-labelledby="demo-title">
      <p class="eyebrow">{{ messages.syntheticDemoLabel }}</p>
      <h2 id="demo-title">{{ messages.syntheticDemoTitle }}</h2>
      <p>{{ messages.syntheticDemoDescription }}</p>
    </section>

    <section class="demo-panel" :aria-label="messages.architectureGraph">
      <h3>{{ messages.architectureGraph }}</h3>
      <div class="graph-nodes" role="group" :aria-label="messages.selectGraphNode">
        <button
          v-for="node in nodeIds"
          :key="node"
          type="button"
          class="graph-node"
          :class="{ selected: selectedNode === node }"
          :aria-pressed="selectedNode === node"
          @click="selectedNode = node"
        >
          <span class="node-dot" aria-hidden="true" />
          {{ node }}
        </button>
      </div>
      <ul class="graph-edges" :aria-label="messages.architectureGraph">
        <li v-for="edge in edges" :key="`${edge.from}-${edge.to}`">
          <span>{{ edge.from }}</span>
          <span class="edge-line" aria-hidden="true">→</span>
          <span>{{ edge.to }}</span>
        </li>
      </ul>
      <div class="node-details" aria-live="polite">
        <h4>{{ messages.nodeDetails }}</h4>
        <p>{{ selectedNodeLabel }} · {{ messages.syntheticDemoLabel }}</p>
        <code>{{ nodePaths[selectedNode] }}</code>
        <ul v-if="selectedConnections.length" class="node-connections">
          <li v-for="edge in selectedConnections" :key="`${edge.from}-${edge.to}`">
            <code>{{ edge.from }}</code>
            <span aria-hidden="true">→</span>
            <code>{{ edge.to }}</code>
          </li>
        </ul>
      </div>
    </section>

    <section class="demo-panel report-panel" :aria-label="messages.demoReport">
      <h3>{{ messages.demoReport }}</h3>
      <div class="demo-metrics">
        <div><strong>{{ nodeIds.length }}</strong><span>{{ messages.demoModulesMetric }}</span></div>
        <div><strong>{{ edges.length }}</strong><span>{{ messages.demoConnectionsMetric }}</span></div>
      </div>
      <ul class="demo-findings">
        <li>{{ messages.demoFindingOne }}</li>
        <li>{{ messages.demoFindingTwo }}</li>
      </ul>
      <p class="demo-limitation">{{ messages.demoLimitation }}</p>
    </section>
  </div>
</template>

<style scoped>
.architecture-demo {
  display: grid;
  gap: var(--space-5);
}

.demo-banner,
.demo-panel {
  padding: var(--space-5);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: color-mix(in srgb, var(--color-surface-raised) var(--alpha-80), transparent);
}

.demo-banner {
  border-color: color-mix(in srgb, var(--color-info) var(--alpha-40), var(--color-border));
}

.demo-banner h2,
.demo-panel h3,
.node-details h4 {
  margin: var(--space-2) 0;
}

.demo-banner p:last-child,
.node-details p {
  margin-bottom: 0;
  color: var(--color-text-secondary);
}

.graph-nodes {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
  margin-block: var(--space-4);
}

.graph-node {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 3rem;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font: inherit;
  text-align: start;
  cursor: pointer;
}

.graph-node.selected {
  border-color: var(--color-accent-primary);
  box-shadow: var(--focus-ring);
}

.node-dot {
  width: 0.65rem;
  height: 0.65rem;
  flex: 0 0 auto;
  border-radius: var(--radius-full);
  background: var(--color-accent-primary);
}

.graph-edges {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.graph-edges li {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-2);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-accent-primary) var(--alpha-04), transparent);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.edge-line {
  color: var(--color-accent-primary);
}

.node-details {
  margin-top: var(--space-4);
  padding: var(--space-3) var(--space-4);
  border-inline-start: 3px solid var(--color-accent-primary);
  background: color-mix(in srgb, var(--color-accent-primary) var(--alpha-04), transparent);
}

.node-details > code {
  display: inline-block;
  margin-top: var(--space-2);
  overflow-wrap: anywhere;
  color: var(--color-text-primary);
}

.node-connections {
  display: grid;
  gap: var(--space-2);
  margin: var(--space-3) 0 0;
  padding: 0;
  list-style: none;
}

.node-connections li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.node-connections code {
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
}

.demo-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-6);
  margin-block: var(--space-4);
}

.demo-metrics div {
  display: grid;
  gap: var(--space-1);
}

.demo-metrics strong {
  font-size: var(--font-size-3xl);
}

.demo-metrics span,
.demo-findings {
  color: var(--color-text-secondary);
}

.demo-findings {
  display: grid;
  gap: var(--space-2);
  padding-inline-start: var(--space-5);
}

.demo-limitation {
  margin-bottom: 0;
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-warning) var(--alpha-08), transparent);
  color: var(--color-text-secondary);
}

@media (max-width: 640px) {
  .graph-nodes,
  .graph-edges {
    grid-template-columns: 1fr;
  }
}
</style>
