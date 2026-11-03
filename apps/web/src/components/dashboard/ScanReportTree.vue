<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ReportTreeNode } from '../../services/scan-report-tree'
import { highestSeverity } from '../../services/scan-report-tree'
import { severityCssVar } from '../../services/scan-report-severity'
import type { ScanReportMessages } from '../../services/scan-report-messages'

const props = defineProps<{
  root: ReportTreeNode
  selectedPath: string | null
  messages: ScanReportMessages
}>()

const emit = defineEmits<{
  select: [path: string]
}>()

const expanded = ref<Set<string>>(new Set())

function isExpanded(path: string): boolean {
  return path === '' || expanded.value.has(path)
}

function toggleExpanded(path: string) {
  const next = new Set(expanded.value)
  if (next.has(path)) next.delete(path)
  else next.add(path)
  expanded.value = next
}

interface VisibleRow {
  node: ReportTreeNode
  depth: number
}

const visibleRows = computed(() => {
  const rows: VisibleRow[] = []
  function walk(node: ReportTreeNode, depth: number) {
    if (node.path !== '') rows.push({ node, depth })
    if (node.kind === 'folder' && isExpanded(node.path)) {
      for (const child of node.children) walk(child, depth + 1)
    }
  }
  walk(props.root, 0)
  return rows
})

const focusedIndex = ref(0)

watch(
  () => props.root,
  () => {
    expanded.value = new Set(
      props.root.children.filter(child => child.kind === 'folder').map(child => child.path)
    )
    focusedIndex.value = 0
  },
  { immediate: true }
)

watch(
  () => props.selectedPath,
  (path) => {
    if (!path) return
    const index = visibleRows.value.findIndex(row => row.node.path === path)
    if (index >= 0) focusedIndex.value = index
  }
)

function selectRow(index: number) {
  const row = visibleRows.value[index]
  if (!row) return
  emit('select', row.node.path)
}

function onKeydown(event: KeyboardEvent) {
  const rows = visibleRows.value
  if (rows.length === 0) return
  const row = rows[focusedIndex.value]
  if (!row) return

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    focusedIndex.value = Math.min(rows.length - 1, focusedIndex.value + 1)
    selectRow(focusedIndex.value)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    focusedIndex.value = Math.max(0, focusedIndex.value - 1)
    selectRow(focusedIndex.value)
  } else if (event.key === 'ArrowRight' && row.node.kind === 'folder') {
    event.preventDefault()
    if (!isExpanded(row.node.path)) toggleExpanded(row.node.path)
  } else if (event.key === 'ArrowLeft' && row.node.kind === 'folder') {
    event.preventDefault()
    if (isExpanded(row.node.path)) toggleExpanded(row.node.path)
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    selectRow(focusedIndex.value)
  }
}

function severityStyle(node: ReportTreeNode) {
  const top = highestSeverity(node.counts)
  if (!top) return undefined
  return { '--node-severity': severityCssVar(top) } as Record<string, string>
}
</script>

<template>
  <div class="report-tree" @keydown="onKeydown">
    <ul role="tree" :aria-label="messages.treeTitle">
      <li
        v-for="(row, index) in visibleRows"
        :key="row.node.id"
        role="treeitem"
        :aria-expanded="row.node.kind === 'folder' ? isExpanded(row.node.path) : undefined"
        :aria-selected="selectedPath === row.node.path"
        :tabindex="focusedIndex === index ? 0 : -1"
        class="tree-row"
        :class="{ selected: selectedPath === row.node.path, folder: row.node.kind === 'folder' }"
        :style="{ paddingInlineStart: `calc(${row.depth} * var(--space-4))` }"
        @click="selectRow(index)"
        @focus="focusedIndex = index"
      >
        <button
          v-if="row.node.kind === 'folder'"
          type="button"
          class="expander"
          :aria-label="isExpanded(row.node.path) ? 'Collapse folder' : 'Expand folder'"
          @click.stop="toggleExpanded(row.node.path)"
        >
          {{ isExpanded(row.node.path) ? '▾' : '▸' }}
        </button>
        <span v-else class="expander spacer" aria-hidden="true" />
        <span class="node-label">{{ row.node.name }}</span>
        <span v-if="row.node.counts.total > 0" class="count-badge" :style="severityStyle(row.node)">
          {{ row.node.counts.total }}
        </span>
      </li>
    </ul>
    <p v-if="visibleRows.length === 0" class="muted">{{ messages.emptySection }}</p>
  </div>
</template>

<style scoped>
.report-tree {
  max-height: 28rem;
  overflow: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--color-surface) var(--alpha-50), transparent);
}

ul {
  margin: 0;
  padding: var(--space-2);
  list-style: none;
}

.tree-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  border-radius: var(--radius-md);
  padding: var(--space-1) var(--space-2);
  cursor: pointer;
}

.tree-row:focus-visible {
  outline: 2px solid var(--color-accent-primary);
  outline-offset: 1px;
}

.tree-row.selected {
  background: color-mix(in srgb, var(--color-accent-primary) var(--alpha-08), transparent);
}

.expander {
  width: 1.25rem;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  font: inherit;
  padding: 0;
}

.expander.spacer {
  display: inline-block;
}

.node-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: var(--font-size-sm);
}

.count-badge {
  flex: none;
  min-width: 1.5rem;
  padding: 0 var(--space-2);
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--node-severity, var(--color-text-secondary)) var(--alpha-16), transparent);
  color: var(--node-severity, var(--color-text-secondary));
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  text-align: center;
}

.muted {
  padding: var(--space-3);
  color: var(--color-text-secondary);
}
</style>
