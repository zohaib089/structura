<script setup lang="ts">
/**
 * ScanReportPanel - the interactive scan report. Opens on Summary; every other tab is a focused view.
 * This component only wires data, URL state and layout. The pieces live in ./report/:
 *   ReportHeader · ReportExportMenu · ReportTabs · ReportSummary · ReportFilters ·
 *   ReportFindingsTab (FindingsTable + ReportTree) · ReportImprovements · ReportArchitecture ·
 *   ReportGraph · ReportHistory
 */
import { computed } from 'vue'
import type { Scan } from '../../api/scans'
import type { ScanReportV1 } from '../../api/scan-report-types'
import type { GraphDocument } from '../../viewer/graph-types'
import { useReportRouteState } from '../../composables/useReportRouteState'
import { projectScansPath } from '../../services/dashboard-routes'
import type { WebLocale } from '../../services/locale'
import { architectureViolationCount, graphHasArchitectureConfig } from '../../services/scan-report-architecture'
import {
  buildFilteredReportExport,
  defaultReportFilters,
  filterFindings,
  filterImprovements,
  findingsForSection,
  type ReportViewFilters
} from '../../services/scan-report-filters'
import { formatRelativeTime, shortScanId } from '../../services/scan-report-format'
import { scanReportMessages, type ReportTabId } from '../../services/scan-report-messages'
import { buildReportSummary } from '../../services/scan-report-summary'
import { buildReportPathSeverityMap } from '../../services/scan-report-tree-display'
import ReportArchitecture from './report/ReportArchitecture.vue'
import ReportFindingsTab from './report/ReportFindingsTab.vue'
import ReportGraph from './report/ReportGraph.vue'
import ReportHeader from './report/ReportHeader.vue'
import ReportHistory from './report/ReportHistory.vue'
import ReportImprovements from './report/ReportImprovements.vue'
import ReportSummary from './report/ReportSummary.vue'
import ReportTabs from './report/ReportTabs.vue'

const props = defineProps<{
  locale: WebLocale
  report: ScanReportV1
  scanId: string
  workspaceId: string
  projectId: string
  graph?: GraphDocument | null
  graphLoading?: boolean
  graphError?: boolean
  /** The scan record, when known, for the branch and date in the header. */
  scan?: Scan | null
}>()

const emit = defineEmits<{ retryGraph: [] }>()

const messages = computed(() => scanReportMessages(props.locale))
const { activeTab, filters, setTab, setFilters, findingsHref, graphHref } = useReportRouteState(
  () => ({
    locale: props.locale,
    workspaceId: props.workspaceId,
    projectId: props.projectId,
    scanId: props.scanId
  })
)

/** Which findings belong to each category tab. "findings" shows every category. */
const SECTION_TABS = ['violations', 'security', 'badPractices', 'removals'] as const
type SectionTab = (typeof SECTION_TABS)[number]
function isSectionTab(tab: ReportTabId): tab is SectionTab {
  return (SECTION_TABS as readonly string[]).includes(tab)
}

const summary = computed(() => buildReportSummary(props.report, props.graph))

const architectureConfigured = computed(() => graphHasArchitectureConfig(props.graph))
const tabCounts = computed<Partial<Record<ReportTabId, number>>>(() => {
  const findings = props.report.findings
  const counts: Partial<Record<ReportTabId, number>> = {
    findings: findings.length,
    improvements: props.report.improvements.length
  }
  for (const section of SECTION_TABS) counts[section] = findingsForSection(findings, section).length
  if (architectureConfigured.value) {
    counts.architecture = architectureViolationCount(props.graph!.architecture)
  }
  if (props.report.history) counts.history = props.report.history.commits.length
  return counts
})

const tabLabel = computed(
  () =>
    ({
      summary: messages.value.tabSummary,
      findings: messages.value.tabFindings,
      violations: messages.value.tabViolations,
      security: messages.value.tabSecurity,
      badPractices: messages.value.tabBadPractices,
      improvements: messages.value.tabImprovements,
      removals: messages.value.tabRemovals,
      architecture: messages.value.tabArchitecture(0),
      graph: messages.value.tabGraph,
      history: messages.value.tabHistory
    })[activeTab.value]
)

// Findings for the active tab, before the user's filters are applied.
const tabFindings = computed(() => {
  const tab = activeTab.value
  if (tab === 'findings') return props.report.findings
  if (isSectionTab(tab)) return findingsForSection(props.report.findings, tab)
  return []
})

const improvementFindings = computed(() => filterFindings(props.report.findings, filters.value))
const filteredImprovements = computed(() => filterImprovements(props.report, improvementFindings.value))
const improvementsEmptyKind = computed(() =>
  props.report.improvements.length === 0 ? 'none' : 'filtered'
)

const pathSeverityCounts = computed(() => buildReportPathSeverityMap(props.report.findings))
const historyFindings = computed(() => findingsForSection(props.report.findings, 'history'))

const exportFilters = computed(() => filters.value)
const exportCount = computed(() => filterFindings(props.report.findings, exportFilters.value).length)
function buildExport() {
  return buildFilteredReportExport(props.report, exportFilters.value)
}

const headerMeta = computed(() =>
  messages.value.scanMeta(
    shortScanId(props.scanId),
    props.scan?.branch ?? null,
    formatRelativeTime(props.scan?.finishedAt ?? props.scan?.createdAt ?? props.report.generatedAt, props.locale)
  )
)
const backTo = computed(() => projectScansPath(props.locale, props.workspaceId, props.projectId))
const graphAvailable = computed(() => Boolean(props.graph) || Boolean(props.graphLoading))

function onFiltersUpdate(next: ReportViewFilters) {
  setFilters(next)
}
function clearImprovementFilters() {
  const defaults = defaultReportFilters()
  setFilters({ ...filters.value, severities: defaults.severities, pathQuery: '' })
}
function showAllFindings() {
  setTab('findings')
}
</script>

<template>
  <section class="report" :aria-label="messages.panelTitle" data-testid="scan-report">
    <ReportHeader
      :messages="messages"
      :scan-id="scanId"
      :meta="headerMeta"
      :back-to="backTo"
      :graph-to="graphHref()"
      :graph-available="graphAvailable"
      :build-export="buildExport"
      :export-count="exportCount"
    />

    <ReportTabs
      class="report__tabs"
      :model-value="activeTab"
      :messages="messages"
      :counts="tabCounts"
      @update:model-value="setTab"
    />

    <p class="report__hint" data-testid="report-hint">{{ messages.tabHint(activeTab) }}</p>

    <div
      :id="`report-panel-${activeTab}`"
      role="tabpanel"
      :aria-labelledby="`report-tab-${activeTab}`"
      class="report__panel"
    >
      <ReportSummary
        v-if="activeTab === 'summary'"
        :summary="summary"
        :messages="messages"
        :findings-href="findingsHref"
        :graph-href="graphHref"
        :graph-loading="graphLoading"
      />

      <ReportFindingsTab
        v-else-if="activeTab === 'findings' || isSectionTab(activeTab)"
        :key="activeTab"
        :findings="tabFindings"
        :filters="filters"
        :messages="messages"
        :tab-label="tabLabel"
        :show-sections="activeTab === 'findings'"
        :graph-href="graphHref"
        @update:filters="onFiltersUpdate"
        @show-all="showAllFindings"
      />

      <template v-else-if="activeTab === 'improvements'">
        <ReportImprovements
          :improvements="filteredImprovements"
          :messages="messages"
          :tab-label="tabLabel"
          :empty-kind="improvementsEmptyKind"
          @clear-filters="clearImprovementFilters"
          @show-all="showAllFindings"
        />
      </template>

      <ReportArchitecture
        v-else-if="activeTab === 'architecture'"
        :graph="graph ?? null"
        :messages="messages"
        :graph-href="graphHref"
        :graph-loading="graphLoading"
        :graph-error="graphError"
        @retry-graph="emit('retryGraph')"
      />

      <ReportGraph
        v-else-if="activeTab === 'graph'"
        :workspace-id="workspaceId"
        :project-id="projectId"
        :scan-id="scanId"
        :graph="graph ?? null"
        :graph-loading="Boolean(graphLoading)"
        :path-severity-counts="pathSeverityCounts"
        :findings="report.findings"
        :messages="messages"
        @retry="emit('retryGraph')"
      />

      <ReportHistory
        v-else-if="activeTab === 'history'"
        :history="report.history"
        :findings="historyFindings"
        :messages="messages"
        :tab-label="messages.tabHistory"
        :graph-href="graphHref"
      />
    </div>
  </section>
</template>

<style scoped>
.report {
  display: grid;
  gap: var(--space-4);
  inline-size: 100%;
}

.report__hint {
  margin: 0;
  max-inline-size: 60rem;
  font-size: var(--text-13);
  line-height: var(--text-13-lh);
  color: var(--color-text-secondary);
}

.report__panel {
  min-inline-size: 0;
}
</style>
