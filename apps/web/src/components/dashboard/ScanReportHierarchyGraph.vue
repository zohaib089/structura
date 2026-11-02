<script setup lang="ts">
import { computed } from 'vue'
import { VueFlow, type Edge, type Node } from '@vue-flow/core'
import '@vue-flow/core/dist/style.css'
import type { ReportTreeNode } from '../../services/scan-report-tree'
import { highestSeverity } from '../../services/scan-report-tree'
import { severityCssVar } from '../../services/scan-report-severity'

const props = defineProps<{
  root: ReportTreeNode
  selectedPath: string | null
}>()

const emit = defineEmits<{
  select: [path: string]
}>()

const MAX_NODES = 120

interface LayoutRow {
  node: ReportTreeNode
  depth: number
  parentPath: string | null
}

const layoutRows = computed(() => {
  const rows: LayoutRow[] = []
  function walk(node: ReportTreeNode, depth: number, parentPath: string | null) {
    if (node.path !== '') rows.push({ node, depth, parentPath })
    if (rows.length >= MAX_NODES) return
    if (node.kind === 'folder') {
      for (const child of node.children) {
        if (rows.length >= MAX_NODES) break
        walk(child, depth + 1, node.path === '' ? null : node.path)
      }
    }
  }
  walk(props.root, 0, null)
  return rows
})

const truncated = computed(() => layoutRows.value.length >= MAX_NODES)

const flowNodes = computed<Node[]>(() =>
  layoutRows.value.map((row, index) => {
    const severity = highestSeverity(row.node.counts)
    return {
      id: row.node.path || `node-${index}`,
      position: { x: row.depth * 180, y: index * 72 },
      data: {
        label: row.node.name,
        path: row.node.path,
        count: row.node.counts.total,
        severity
      },
      style: {
        borderColor: severity ? severityCssVar(severity) : 'var(--color-border)',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderRadius: 'var(--radius-md)',
        padding: '6px 10px',
        fontSize: '12px',
        background: 'var(--color-surface)',
        width: '150px'
      }
    }
  })
)

const flowEdges = computed<Edge[]>(() =>
  layoutRows.value
    .filter(row => row.parentPath !== null)
    .map(row => ({
      id: `${row.parentPath}->${row.node.path}`,
      source: row.parentPath || '',
      target: row.node.path,
      animated: false
    }))
)

function onNodeClick(event: { node: Node }) {
  const path = typeof event.node.data?.path === 'string' ? event.node.data.path : null
  if (path) emit('select', path)
}
</script>

<template>
  <div class="graph-shell">
    <VueFlow
      :nodes="flowNodes"
      :edges="flowEdges"
      :fit-view-on-init="true"
      :nodes-draggable="false"
      :nodes-connectable="false"
      :elements-selectable="true"
      :zoom-on-scroll="true"
      :pan-on-scroll="true"
      class="report-flow"
      @node-click="onNodeClick"
    />
    <p v-if="truncated" class="truncation" role="status">
      Graph preview shows the first {{ MAX_NODES }} nodes. Use the tree view for the full hierarchy.
    </p>
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

.truncation {
  margin: 0;
  padding: var(--space-2) var(--space-3);
  border-top: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
</style>
