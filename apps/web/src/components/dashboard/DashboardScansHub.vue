<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import type { Scan } from '../../api/scans'
import type { GraphDocument } from '../../viewer/graph-types'
import { getScanGraph, listScans } from '../../api/scans'
import { getScanReport } from '../../api/scan-report'
import type { ScanReportV1 } from '../../api/scan-report-types'
import { scanReportMessages } from '../../services/scan-report-messages'
import ScanReportPanel from './ScanReportPanel.vue'
import { pollScanUntilTerminal } from '../../services/scan-poll'
import { scanMessages } from '../../services/scan-messages'
import { projectScansPath, scanReportPath } from '../../services/dashboard-routes'
import type { WebLocale } from '../../services/locale'
import OpenProjectPanel from './OpenProjectPanel.vue'
import ScanListPanel from './ScanListPanel.vue'
import ErrorState from '../ui/ErrorState.vue'
import SkeletonReport from '../ui/skeleton/SkeletonReport.vue'
import { dashboardMessages } from '../../services/dashboard-messages'

type InsightView = 'graph' | 'report'

const props = defineProps<{
  workspaceId: string
  locale: WebLocale
  compact?: boolean
  initialScanId?: string | null
  projectId?: string | null
  initialInsightView?: InsightView
}>()

const router = useRouter()

const messages = computed(() => scanMessages(props.locale))
const sharedMessages = computed(() => dashboardMessages(props.locale))
const reportMessages = computed(() => scanReportMessages(props.locale))
const insightView = ref<InsightView>(props.initialInsightView ?? 'graph')
const scans = ref<Scan[]>([])
const listLoading = ref(false)
const listError = ref('')
const selectedScanId = ref<string | null>(null)
const graphLoading = ref(false)
const graphError = ref(false)
const graphDocument = ref<GraphDocument | null>(null)
const reportLoading = ref(false)
const reportError = ref('')
const reportErrorDetail = ref('')
const reportDocument = ref<ScanReportV1 | null>(null)
let pollAbort: AbortController | null = null

const selectedScan = computed(() => scans.value.find(scan => scan.id === selectedScanId.value) ?? null)
/** Report route: the report takes the whole page (no scan list or open-project form above it). */
const reportMode = computed(
  () => insightView.value === 'report' && !props.compact && Boolean(selectedScanId.value || props.initialScanId)
)
const recentScans = computed(() =>
  [...scans.value].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 5)
)

async function loadScans() {
  if (!props.workspaceId) return
  listLoading.value = true
  listError.value = ''
  try {
    scans.value = await listScans(props.workspaceId)
    trackInFlightScans()
    if (!selectedScanId.value) {
      const preferred = props.initialScanId
        ?? scans.value.find(scan => scan.status === 'succeeded')?.id
      if (preferred) selectedScanId.value = preferred
    }
  } catch (cause) {
    listError.value = cause instanceof Error ? cause.message : messages.value.loadScansError
  } finally {
    listLoading.value = false
  }
}

function trackInFlightScans() {
  pollAbort?.abort()
  pollAbort = new AbortController()
  const pending = scans.value.filter(scan => scan.status === 'queued' || scan.status === 'running')
  for (const scan of pending) {
    void pollScanUntilTerminal(props.workspaceId, scan.id, {
      signal: pollAbort.signal,
      onUpdate(updated) {
        scans.value = scans.value.map(row => (row.id === updated.id ? updated : row))
      }
    }).catch(() => undefined)
  }
}

async function loadSelectedReport() {
  reportDocument.value = null
  graphDocument.value = null
  reportError.value = ''
  reportErrorDetail.value = ''
  graphError.value = false
  const scan = selectedScan.value
  if (!scan || scan.status !== 'succeeded' || !props.workspaceId) return
  if (insightView.value !== 'report') return
  const requestedScanId = scan.id
  reportLoading.value = true
  graphLoading.value = true
  // The report and the graph load independently: a slow or failed graph must not block the Summary.
  const graphRequest = loadGraphFor(requestedScanId)
  try {
    const report = await getScanReport(props.workspaceId, requestedScanId)
    if (selectedScanId.value === requestedScanId) reportDocument.value = report
  } catch (cause) {
    if (selectedScanId.value === requestedScanId) {
      reportError.value = reportMessages.value.loadReportError
      reportErrorDetail.value = cause instanceof Error ? cause.message : ''
    }
  } finally {
    reportLoading.value = false
  }
  await graphRequest
}

async function loadGraphFor(scanId: string) {
  graphLoading.value = true
  graphError.value = false
  try {
    const graph = await getScanGraph(props.workspaceId, scanId)
    if (selectedScanId.value === scanId) graphDocument.value = graph
  } catch {
    if (selectedScanId.value === scanId) {
      graphDocument.value = null
      graphError.value = true
    }
  } finally {
    if (selectedScanId.value === scanId) graphLoading.value = false
  }
}

function retryGraph() {
  if (selectedScanId.value) void loadGraphFor(selectedScanId.value)
}

function setInsightView(view: InsightView) {
  const scan = selectedScan.value
  if (!scan) return
  const locale = props.locale
  const workspaceId = props.workspaceId
  const projectId = props.projectId ?? 'default'
  insightView.value = 'report'
  if (view === 'graph') {
    void router.push(scanReportPath(locale, workspaceId, projectId, scan.id, 'graph'))
  } else {
    void router.push(scanReportPath(locale, workspaceId, projectId, scan.id))
  }
  void loadSelectedReport()
}

function onScanFinished(scan: Scan) {
  scans.value = [scan, ...scans.value.filter(row => row.id !== scan.id)]
  if (scan.status === 'succeeded') selectedScanId.value = scan.id
}

function selectScan(scanId: string) {
  selectedScanId.value = scanId
  insightView.value = 'report'
  const locale = props.locale
  const workspaceId = props.workspaceId
  const projectId = props.projectId ?? 'default'
  void router.push(scanReportPath(locale, workspaceId, projectId, scanId))
}

watch(
  () => props.initialScanId,
  scanId => {
    if (scanId) selectedScanId.value = scanId
  },
  { immediate: true }
)

watch(
  () => props.workspaceId,
  () => {
    selectedScanId.value = null
    graphDocument.value = null
    reportDocument.value = null
    void loadScans()
  },
  { immediate: true }
)

watch(selectedScanId, () => {
  if (insightView.value === 'report') void loadSelectedReport()
})

watch(
  () => props.initialInsightView,
  view => {
    if (view) insightView.value = view
    if (view === 'report' && !reportLoading.value && !reportDocument.value) void loadSelectedReport()
  }
)
</script>

<template>
  <section class="scans-hub" :class="{ 'scans-hub--report': reportMode }" :aria-label="messages.hubTitle">
    <header v-if="!compact && !reportMode" class="hub-header">
      <p class="eyebrow">{{ messages.hubEyebrow }}</p>
      <h1>{{ messages.hubTitle }}</h1>
      <p>{{ messages.hubDescription }}</p>
    </header>

    <OpenProjectPanel
      v-if="!compact && !reportMode"
      :workspace-id="workspaceId"
      :locale="locale"
      @scan-finished="onScanFinished"
    />

    <ScanListPanel
      v-if="!reportMode"
      :locale="locale"
      :scans="compact ? recentScans : scans"
      :loading="listLoading"
      :error="compact ? '' : listError"
      :selected-scan-id="selectedScanId"
      @refresh="loadScans"
      @select="selectScan"
    />

    <div
      v-if="!reportMode && selectedScan?.status === 'succeeded'"
      class="insight-toggle"
      role="tablist"
      :aria-label="messages.selectScan"
    >
      <button
        type="button"
        role="tab"
        :aria-selected="false"
        class="insight-tab"
        @click="setInsightView('graph')"
      >
        {{ reportMessages.viewGraph }}
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="insightView === 'report'"
        class="insight-tab"
        :class="{ active: insightView === 'report' }"
        @click="setInsightView('report')"
      >
        {{ reportMessages.viewReport }}
      </button>
    </div>

    <template v-if="insightView === 'report'">
      <SkeletonReport v-if="reportLoading || (listLoading && !selectedScan)" :label="reportMessages.loadingReport" />
      <ErrorState
        v-else-if="reportError"
        :message="reportError"
        :details="reportErrorDetail || undefined"
        :retry-label="sharedMessages.retry"
        @retry="loadSelectedReport"
      />
      <div v-else-if="!compact && !reportDocument && selectedScan?.status !== 'succeeded'" class="not-ready" role="status">
        <p class="not-ready__title">{{ reportMessages.reportNotReadyTitle }}</p>
        <p class="muted">{{ reportMessages.reportNotReadyBody }}</p>
        <RouterLink class="not-ready__link" :to="projectScansPath(locale, workspaceId, projectId ?? 'default')">
          {{ reportMessages.backToScans }}
        </RouterLink>
      </div>

      <ScanReportPanel
        v-if="reportDocument && selectedScanId"
        :locale="locale"
        :report="reportDocument"
        :scan-id="selectedScanId"
        :workspace-id="workspaceId"
        :project-id="projectId ?? 'default'"
        :graph="graphDocument"
        :graph-loading="graphLoading"
        :graph-error="graphError"
        :scan="selectedScan"
        @retry-graph="retryGraph"
      />
    </template>
  </section>
</template>

<style scoped>
.scans-hub {
  display: grid;
  gap: var(--space-5);
}

.hub-header h1 {
  margin: var(--space-2) 0;
}

.eyebrow {
  margin: 0;
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
  color: var(--color-text-muted);
}

.muted {
  color: var(--color-text-secondary);
}

.not-ready {
  display: grid;
  justify-items: start;
  gap: var(--space-2);
  padding-block: var(--space-6);
}

.not-ready__title {
  margin: 0;
  font-weight: var(--font-weight-medium);
}

.not-ready__link {
  color: var(--color-brand-amber-ui);
}

.insight-toggle {
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.insight-tab {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface);
  cursor: pointer;
  font: inherit;
}

.insight-tab.active {
  border-color: var(--color-brand-amber-ui);
  background: var(--gray-3);
}

.insight-tab:focus-visible {
  outline: 2px solid var(--color-accent-primary);
  outline-offset: 2px;
}
</style>
