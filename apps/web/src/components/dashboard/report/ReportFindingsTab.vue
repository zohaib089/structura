<script setup lang="ts">
/**
 * ReportFindingsTab - body of the "All findings" and per-category tabs:
 * filters, an optional folder tree on the left and the findings table.
 * Picking a folder or file narrows the table to that path.
 */
import { computed, ref, watch } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import type { ReportFinding } from '../../../api/scan-report-types'
import {
  defaultReportFilters,
  filterFindings,
  type ReportViewFilters
} from '../../../services/scan-report-filters'
import type { ScanReportMessages } from '../../../services/scan-report-messages'
import { compareFindingsBySeverity } from '../../../services/scan-report-severity'
import { buildReportFileTree } from '../../../services/scan-report-tree'
import FindingsTable from './FindingsTable.vue'
import ReportFilters from './ReportFilters.vue'
import ReportTree from './ReportTree.vue'

const props = defineProps<{
  /** All findings that belong to this tab, before the user's filters. */
  findings: ReportFinding[]
  filters: ReportViewFilters
  messages: ScanReportMessages
  tabLabel: string
  /** True on "All findings", where the category filter is meaningful. */
  showSections: boolean
  graphHref: (path: string) => RouteLocationRaw
}>()

const emit = defineEmits<{
  'update:filters': [filters: ReportViewFilters]
  showAll: []
}>()

const selectedPath = ref<string | null>(null)
const treeOpen = ref(true)

const filtered = computed(() => {
  // On a single-category tab the category filter must not hide the tab's own findings.
  const effective: ReportViewFilters = props.showSections
    ? props.filters
    : { ...props.filters, sections: new Set(props.findings.map(f => f.section)) }
  return filterFindings(props.findings, effective).sort(compareFindingsBySeverity)
})

const treeRoot = computed(() => buildReportFileTree(filtered.value))

const scoped = computed(() => {
  const path = selectedPath.value
  if (!path) return filtered.value
  return filtered.value.filter(row => row.file === path || row.file.startsWith(`${path}/`))
})

watch(
  () => props.filters,
  () => {
    selectedPath.value = null
  },
  { deep: true }
)

const emptyKind = computed<'none' | 'filtered'>(() => (props.findings.length === 0 ? 'none' : 'filtered'))

function clearFilters() {
  selectedPath.value = null
  const defaults = defaultReportFilters()
  emit('update:filters', {
    severities: defaults.severities,
    sections: props.showSections ? defaults.sections : props.filters.sections,
    pathQuery: ''
  })
}
</script>

<template>
  <div class="findings-tab">
    <ReportFilters
      :model-value="filters"
      :messages="messages"
      :show-sections="showSections"
      :shown="scoped.length"
      :total="findings.length"
      @update:model-value="value => emit('update:filters', value)"
    />

    <div class="findings-tab__body" :class="{ 'findings-tab__body--no-tree': !treeOpen || findings.length === 0 }">
      <aside v-if="findings.length > 0" class="findings-tab__tree" :aria-label="messages.treeTitle">
        <button type="button" class="tree-toggle" :aria-expanded="treeOpen" @click="treeOpen = !treeOpen">
          {{ treeOpen ? messages.treeToggleHide : messages.treeToggleShow }}
        </button>
        <ReportTree
          v-if="treeOpen"
          :root="treeRoot"
          :selected-path="selectedPath"
          :messages="messages"
          :graph-href="graphHref"
          @select="path => (selectedPath = path)"
        />
      </aside>

      <div class="findings-tab__table">
        <p v-if="selectedPath" class="scope" role="status">
          <span>{{ messages.treeScope(selectedPath) }}</span>
          <button type="button" class="scope__clear" @click="selectedPath = null">{{ messages.clearTreeScope }}</button>
        </p>
        <FindingsTable
          :findings="scoped"
          :messages="messages"
          :tab-label="tabLabel"
          :graph-href="graphHref"
          :empty-kind="emptyKind"
          @clear-filters="clearFilters"
          @show-all="emit('showAll')"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.findings-tab__body {
  display: grid;
  grid-template-columns: minmax(14rem, 18rem) minmax(0, 1fr);
  gap: var(--space-5);
  padding-block-start: var(--space-4);
}

.findings-tab__body--no-tree {
  grid-template-columns: minmax(0, 1fr);
}

.findings-tab__tree {
  min-inline-size: 0;
}

.tree-toggle {
  margin-block-end: var(--space-2);
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-text-secondary);
  font: inherit;
  font-size: var(--text-12);
  cursor: pointer;
}

.tree-toggle:hover {
  color: var(--color-text-primary);
}

.tree-toggle:focus-visible,
.scope__clear:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
  border-radius: var(--r-xs);
}

.findings-tab__table {
  min-inline-size: 0;
}

.scope {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin: 0 0 var(--space-2);
  font-size: var(--text-13);
  color: var(--color-text-secondary);
}

.scope__clear {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-brand-amber-ui);
  font: inherit;
  cursor: pointer;
}

@media (max-width: 920px) {
  .findings-tab__body {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
