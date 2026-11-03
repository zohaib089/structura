<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BrandMark from '../brand/BrandMark.vue'
import ScanReportTree from './ScanReportTree.vue'
import ScanReportHierarchyGraph from './ScanReportHierarchyGraph.vue'
import ScanReportModuleGraph from './ScanReportModuleGraph.vue'
import ScanReportArchitecturePanel from './ScanReportArchitecturePanel.vue'
import ScanReportAnalysers from './ScanReportAnalysers.vue'
import type { ScanReportV1 } from '../../api/scan-report-types'
import type { GraphDocument } from '../../viewer/graph-types'
import type { WebLocale } from '../../services/locale'
import { scanReportMessages, type ReportTabId } from '../../services/scan-report-messages'
import {
  ALL_FINDING_SECTIONS,
  ALL_REPORT_SEVERITIES,
  buildFilteredReportExport,
  defaultReportFilters,
  filterFindings,
  filterImprovements,
  findingsForSection,
  type ReportViewFilters
} from '../../services/scan-report-filters'
import { buildReportFileTree, type ReportTreeNode } from '../../services/scan-report-tree'
import { exportFilteredReportJson, exportFilteredReportMarkdown } from '../../services/scan-report-export'
import { severityCssVar } from '../../services/scan-report-severity'
import {
  architectureViolationCount,
  graphHasArchitectureConfig
} from '../../services/scan-report-architecture'
import type { ReportFinding, ReportSection, ReportSeverity } from '../../api/scan-report-types'

const props = defineProps<{
  locale: WebLocale
  report: ScanReportV1
  scanId: string
  graph?: GraphDocument | null
}>()

const messages = computed(() => scanReportMessages(props.locale))
const filters = ref<ReportViewFilters>(defaultReportFilters())
const activeTab = ref<ReportTabId>('violations')
const hierarchyMode = ref<'tree' | 'graph'>('tree')
const selectedPath = ref<string | null>(null)
const pageByTab = ref<Record<ReportTabId, number>>({
  history: 1,
  violations: 1,
  security: 1,
  badPractices: 1,
  improvements: 1,
  removals: 1,
  architecture: 1
})

const PAGE_SIZE = 50

const filteredFindings = computed(() => filterFindings(props.report.findings, filters.value))
const filteredImprovements = computed(() => filterImprovements(props.report, filteredFindings.value))
const treeRoot = computed(() => buildReportFileTree(filteredFindings.value))

const tabs: ReportTabId[] = [
  'history',
  'violations',
  'security',
  'badPractices',
  'improvements',
  'removals',
  'architecture'
]

const architectureConfigured = computed(() => graphHasArchitectureConfig(props.graph))
const architectureViolationTotal = computed(() =>
  architectureConfigured.value
    ? architectureViolationCount(props.graph!.architecture)
    : 0
)

function tabLabel(tab: ReportTabId): string {
  return (
    {
      history: messages.value.tabHistory,
      violations: messages.value.tabViolations,
      security: messages.value.tabSecurity,
      badPractices: messages.value.tabBadPractices,
      improvements: messages.value.tabImprovements,
      removals: messages.value.tabRemovals,
      architecture: messages.value.tabArchitecture(architectureViolationTotal.value)
    } satisfies Record<ReportTabId, string>
  )[tab]
}

function toggleSeverity(severity: ReportSeverity) {
  const next = new Set(filters.value.severities)
  if (next.has(severity)) next.delete(severity)
  else next.add(severity)
  filters.value = { ...filters.value, severities: next }
}

function toggleSection(section: ReportSection) {
  const next = new Set(filters.value.sections)
  if (next.has(section)) next.delete(section)
  else next.add(section)
  filters.value = { ...filters.value, sections: next }
}

function onPathQueryInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  filters.value = { ...filters.value, pathQuery: value }
}

function selectNode(path: string) {
  selectedPath.value = path
}

function collectNodeFindings(node: ReportTreeNode | null, path: string | null): ReportFinding[] {
  if (!path) return []
  function walk(current: ReportTreeNode): ReportFinding[] {
    if (current.path === path) {
      if (current.kind === 'file') return [...current.findings]
      const rows: ReportFinding[] = []
      for (const child of current.children) rows.push(...walk(child))
      return rows
    }
    for (const child of current.children) {
      const match = walk(child)
      if (match.length > 0) return match
    }
    return []
  }
  return walk(node ?? treeRoot.value)
}

const detailFindings = computed(() => {
  const scoped = collectNodeFindings(treeRoot.value, selectedPath.value)
  return scoped.length > 0 ? scoped : filteredFindings.value.slice(0, PAGE_SIZE)
})

const tabItems = computed(() => {
  if (activeTab.value === 'improvements') {
    return filteredImprovements.value
  }
  if (activeTab.value === 'history') {
    return findingsForSection(filteredFindings.value, 'history')
  }
  if (activeTab.value === 'architecture') {
    return []
  }
  return findingsForSection(filteredFindings.value, activeTab.value)
})

const totalPages = computed(() => Math.max(1, Math.ceil(tabItems.value.length / PAGE_SIZE)))
const currentPage = computed(() => pageByTab.value[activeTab.value] ?? 1)
const pagedTabItems = computed(() => {
  const page = currentPage.value
  const start = (page - 1) * PAGE_SIZE
  return tabItems.value.slice(start, start + PAGE_SIZE)
})
const historyFindings = computed(() => findingsForSection(filteredFindings.value, 'history'))
const pagedHistoryFindings = computed(() => {
  const page = currentPage.value
  const start = (page - 1) * PAGE_SIZE
  return historyFindings.value.slice(start, start + PAGE_SIZE)
})
const pagedImprovements = computed(() => {
  if (activeTab.value !== 'improvements') return []
  return pagedTabItems.value as typeof filteredImprovements.value
})
const pagedSectionFindings = computed(() => {
  if (activeTab.value === 'improvements' || activeTab.value === 'history') return []
  return pagedTabItems.value as ReportFinding[]
})

function setPage(tab: ReportTabId, page: number) {
  pageByTab.value = { ...pageByTab.value, [tab]: page }
}

function onTabKeydown(event: KeyboardEvent, index: number) {
  if (event.key === 'ArrowRight') {
    event.preventDefault()
    activeTab.value = tabs[(index + 1) % tabs.length] ?? 'violations'
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    activeTab.value = tabs[(index - 1 + tabs.length) % tabs.length] ?? 'violations'
  }
}

watch(filters, () => {
  for (const tab of tabs) setPage(tab, 1)
  selectedPath.value = null
})

watch(
  () => props.report,
  () => {
    filters.value = defaultReportFilters()
    selectedPath.value = null
    activeTab.value = 'violations'
  }
)

function exportJson() {
  exportFilteredReportJson(buildFilteredReportExport(props.report, filters.value), props.scanId)
}

function exportMarkdown() {
  exportFilteredReportMarkdown(buildFilteredReportExport(props.report, filters.value), props.scanId)
}

const history = computed(() => props.report.history)
</script>

<template>
  <section class="report-panel" :aria-label="messages.panelTitle">
    <header class="panel-heading">
      <div class="heading-row">
        <BrandMark :size="36" />
        <div>
          <p class="eyebrow">{{ messages.panelEyebrow }}</p>
          <h2>{{ messages.panelTitle }}</h2>
          <p class="lede">{{ messages.panelDescription }}</p>
        </div>
      </div>
      <div class="export-actions">
        <button type="button" class="secondary-button" @click="exportJson">{{ messages.exportJson }}</button>
        <button type="button" class="secondary-button" @click="exportMarkdown">{{ messages.exportMarkdown }}</button>
      </div>
    </header>

    <section class="filters" :aria-label="messages.filtersTitle">
      <fieldset>
        <legend>{{ messages.filterSeverity }}</legend>
        <div class="chip-row">
          <label v-for="severity in ALL_REPORT_SEVERITIES" :key="severity" class="chip">
            <input
              type="checkbox"
              :checked="filters.severities.has(severity)"
              @change="toggleSeverity(severity)"
            >
            <span :style="{ color: severityCssVar(severity) }">{{ messages.severityLabel(severity) }}</span>
          </label>
        </div>
      </fieldset>
      <fieldset>
        <legend>{{ messages.filterSection }}</legend>
        <div class="chip-row">
          <label v-for="section in ALL_FINDING_SECTIONS" :key="section" class="chip">
            <input
              type="checkbox"
              :checked="filters.sections.has(section)"
              @change="toggleSection(section)"
            >
            {{ messages.sectionLabel(section) }}
          </label>
        </div>
      </fieldset>
      <label class="path-filter">
        {{ messages.filterPath }}
        <input
          type="search"
          :value="filters.pathQuery"
          :placeholder="messages.filterPathPlaceholder"
          @input="onPathQueryInput"
        >
      </label>
    </section>

    <ScanReportAnalysers :report="report" :messages="messages" />

    <div class="layout-grid">
      <section class="tree-panel">
        <div class="subheading">
          <h3>{{ messages.treeTitle }}</h3>
          <div class="mode-toggle" role="tablist" :aria-label="messages.treeTitle">
            <button
              type="button"
              role="tab"
              :aria-selected="hierarchyMode === 'tree'"
              :class="{ active: hierarchyMode === 'tree' }"
              @click="hierarchyMode = 'tree'"
            >
              {{ messages.treeView }}
            </button>
            <button
              type="button"
              role="tab"
              :aria-selected="hierarchyMode === 'graph'"
              :class="{ active: hierarchyMode === 'graph' }"
              @click="hierarchyMode = 'graph'"
            >
              {{ messages.graphView }}
            </button>
          </div>
        </div>
        <ScanReportTree
          v-if="hierarchyMode === 'tree'"
          :root="treeRoot"
          :selected-path="selectedPath"
          :messages="messages"
          @select="selectNode"
        />
        <template v-else>
          <p v-if="architectureConfigured" class="graph-hint muted">{{ messages.architectureGraphHint }}</p>
          <ScanReportModuleGraph
            v-if="architectureConfigured && graph?.architecture"
            :graph="graph"
            :architecture="graph.architecture"
          />
          <ScanReportHierarchyGraph
            v-else
            :root="treeRoot"
            :selected-path="selectedPath"
            @select="selectNode"
          />
        </template>
      </section>

      <section class="detail-panel" :aria-label="messages.detailTitle">
        <h3>{{ messages.detailTitle }}</h3>
        <p v-if="detailFindings.length === 0" class="muted">{{ messages.detailEmpty }}</p>
        <ul v-else class="finding-list">
          <li v-for="finding in detailFindings.slice(0, PAGE_SIZE)" :key="finding.id">
            <span class="severity" :style="{ color: severityCssVar(finding.severity) }">
              {{ messages.severityLabel(finding.severity) }}
            </span>
            <span>{{ messages.sectionLabel(finding.section) }}</span>
            <p>{{ finding.message }}</p>
            <p class="meta">
              <code>{{ finding.file }}<template v-if="finding.line">:{{ finding.line }}</template></code>
              <span v-if="finding.tool"> · {{ finding.tool }}</span>
            </p>
          </li>
        </ul>
      </section>
    </div>

    <div class="tabs" role="tablist" :aria-label="messages.panelTitle">
      <button
        v-for="(tab, index) in tabs"
        :id="`report-tab-${tab}`"
        :key="tab"
        type="button"
        role="tab"
        :aria-selected="activeTab === tab"
        :aria-controls="`report-panel-${tab}`"
        :tabindex="activeTab === tab ? 0 : -1"
        class="tab-button"
        :class="{ active: activeTab === tab }"
        @click="activeTab = tab"
        @keydown="onTabKeydown($event, index)"
      >
        {{ tabLabel(tab) }}
      </button>
    </div>

    <section
      v-for="tab in tabs"
      :id="`report-panel-${tab}`"
      :key="`panel-${tab}`"
      role="tabpanel"
      :aria-labelledby="`report-tab-${tab}`"
      :hidden="activeTab !== tab"
      class="tab-panel"
    >
      <template v-if="tab === 'history'">
        <p v-if="!history" class="muted">{{ messages.emptySection }}</p>
        <template v-else>
          <p v-if="history.limitedHistory" class="muted">{{ messages.historyLimited }}</p>
          <div class="history-grid">
            <section>
              <h4>{{ messages.historyTimeline }}</h4>
              <p v-if="history.commits.length === 0" class="muted">{{ messages.emptySection }}</p>
              <ol v-else class="history-list">
                <li v-for="commit in history.commits.slice(0, PAGE_SIZE)" :key="commit.hash">
                  <strong>{{ commit.subject }}</strong>
                  <span>{{ commit.author }} · {{ commit.date }}</span>
                  <code>{{ commit.hash.slice(0, 8) }}</code>
                </li>
              </ol>
            </section>
            <section>
              <h4>{{ messages.historyHotspots }}</h4>
              <p v-if="history.hotspots.length === 0" class="muted">{{ messages.emptySection }}</p>
              <ol v-else class="history-list">
                <li v-for="row in history.hotspots.slice(0, PAGE_SIZE)" :key="row.path">
                  <code>{{ row.path }}</code>
                  <strong>{{ row.score }}</strong>
                </li>
              </ol>
            </section>
            <section>
              <h4>{{ messages.historyChurn }}</h4>
              <p v-if="history.fileChurn.length === 0" class="muted">{{ messages.emptySection }}</p>
              <ol v-else class="history-list">
                <li v-for="row in history.fileChurn.slice(0, PAGE_SIZE)" :key="row.path">
                  <code>{{ row.path }}</code>
                  <span>+{{ row.additions }} / −{{ row.deletions }} · {{ row.commits }} commits</span>
                </li>
              </ol>
            </section>
            <section>
              <h4>{{ messages.historyAuthors }}</h4>
              <p v-if="history.authors.length === 0" class="muted">{{ messages.emptySection }}</p>
              <ol v-else class="history-list">
                <li v-for="author in history.authors.slice(0, PAGE_SIZE)" :key="`${author.name}-${author.email ?? ''}`">
                  <strong>{{ author.name }}</strong>
                  <span>{{ author.commitCount }} commits</span>
                </li>
              </ol>
            </section>
          </div>
        </template>
        <p v-if="historyFindings.length > 0" class="section-findings-heading">History findings</p>
        <ul v-if="historyFindings.length > 0" class="finding-list">
          <li v-for="finding in pagedHistoryFindings" :key="finding.id">
            <span class="severity" :style="{ color: severityCssVar(finding.severity) }">
              {{ messages.severityLabel(finding.severity) }}
            </span>
            <p>{{ finding.message }}</p>
            <p class="meta"><code>{{ finding.file }}</code></p>
          </li>
        </ul>
      </template>

      <template v-else-if="tab === 'architecture'">
        <ScanReportArchitecturePanel :graph="graph ?? null" :messages="messages" />
      </template>

      <template v-else-if="tab === 'improvements'">
        <p v-if="filteredImprovements.length === 0" class="muted">{{ messages.emptySection }}</p>
        <ul v-else class="finding-list">
          <li v-for="row in pagedImprovements" :key="row.id">
            <p>{{ row.message }}</p>
            <p class="meta">Related: {{ row.relatedFindingIds.join(', ') }}</p>
          </li>
        </ul>
      </template>

      <template v-else>
        <p v-if="tabItems.length === 0" class="muted">{{ messages.emptySection }}</p>
        <ul v-else class="finding-list">
          <li v-for="finding in pagedSectionFindings" :key="finding.id">
            <span class="severity" :style="{ color: severityCssVar(finding.severity) }">
              {{ messages.severityLabel(finding.severity) }}
            </span>
            <p>{{ finding.message }}</p>
            <p class="meta">
              <code>{{ finding.file }}<template v-if="finding.line">:{{ finding.line }}</template></code>
            </p>
          </li>
        </ul>
      </template>

      <div v-if="tab !== 'architecture' && tabItems.length > PAGE_SIZE" class="pagination">
        <button
          type="button"
          class="secondary-button"
          :disabled="currentPage <= 1"
          @click="setPage(tab, currentPage - 1)"
        >
          {{ messages.paginationPrevious }}
        </button>
        <span role="status">
          {{ messages.paginationStatus(currentPage, totalPages, tabItems.length) }}
        </span>
        <button
          type="button"
          class="secondary-button"
          :disabled="currentPage >= totalPages"
          @click="setPage(tab, currentPage + 1)"
        >
          {{ messages.paginationNext }}
        </button>
      </div>
    </section>
  </section>
</template>

<style scoped>
.report-panel {
  display: grid;
  gap: var(--space-5);
}

.panel-heading {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-4);
}

.heading-row {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
}

.eyebrow {
  margin: 0;
  font-size: var(--font-size-xs);
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
  color: var(--color-accent-primary);
}

.panel-heading h2 {
  margin: var(--space-2) 0;
}

.lede,
.muted,
.meta {
  color: var(--color-text-secondary);
}

.filters {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

fieldset {
  border: none;
  margin: 0;
  padding: 0;
}

legend {
  font-weight: var(--font-weight-bold);
  margin-bottom: var(--space-2);
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
}

.path-filter {
  display: grid;
  gap: var(--space-2);
}

.path-filter input {
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
  font: inherit;
  background: var(--color-surface);
}

.layout-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  gap: var(--space-4);
}

.subheading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}

.graph-hint {
  margin: 0 0 var(--space-2);
  font-size: var(--font-size-sm);
}

.mode-toggle {
  display: inline-flex;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.mode-toggle button {
  border: none;
  background: transparent;
  padding: var(--space-2) var(--space-3);
  cursor: pointer;
  font: inherit;
}

.mode-toggle button.active {
  background: color-mix(in srgb, var(--color-accent-primary) var(--alpha-08), transparent);
}

.detail-panel,
.tree-panel,
.tab-panel {
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--color-surface-raised) var(--alpha-80), transparent);
}

.finding-list,
.history-list {
  display: grid;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.finding-list li {
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.severity {
  font-weight: var(--font-weight-bold);
  margin-inline-end: var(--space-2);
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.tab-button {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  padding: var(--space-2) var(--space-3);
  cursor: pointer;
  font: inherit;
}

.tab-button.active,
.tab-button:focus-visible {
  outline: 2px solid var(--color-accent-primary);
  outline-offset: 1px;
}

.tab-button.active {
  background: color-mix(in srgb, var(--color-accent-primary) var(--alpha-08), transparent);
}

.history-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
}

.pagination {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-3);
}

.secondary-button {
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface);
  cursor: pointer;
  font: inherit;
}

.export-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

@media (max-width: 920px) {
  .layout-grid,
  .history-grid {
    grid-template-columns: 1fr;
  }
}
</style>
