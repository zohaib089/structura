<script setup lang="ts">
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getScanGraph, listScans } from '../../api/scans'
import { getScanFileMeta } from '../../api/scan-file-meta'
import type { GraphDocument } from '../../viewer/graph-types'
import type { ReportFinding } from '../../api/scan-report-types'
import type { SeverityCounts } from '../../services/scan-report-tree'
import ViewerApp from '../../viewer/ViewerApp.vue'
import { dashboardMessages } from '../../services/dashboard-messages'
import { scanMessages } from '../../services/scan-messages'
import { resolveGraphFocusQuery } from '../../services/graph-node-focus'
import { isSupportedWebLocale, readLocalePreference, resolvePreferredWebLocale } from '../../services/locale'
import { useThemeStore } from '../../stores/theme'
import { storeToRefs } from 'pinia'
import '../../viewer/viewer-base.css'

const props = defineProps<{
  workspaceId: string
  projectId?: string | null
  scanId?: string | null
  prefetchedGraph?: GraphDocument | null
  pathSeverityCounts?: Map<string, SeverityCounts>
  scanFindings?: ReportFinding[]
}>()

const route = useRoute()
const themeStore = useThemeStore()
const { theme: shellTheme } = storeToRefs(themeStore)

const locale = computed(() => {
  const routeLocale = route.params.locale
  if (typeof routeLocale === 'string' && isSupportedWebLocale(routeLocale)) return routeLocale
  return resolvePreferredWebLocale(readLocalePreference(), navigator.languages)
})

const messages = computed(() => dashboardMessages(locale.value))
const scanCopy = computed(() => scanMessages(locale.value))
const loading = ref(false)
const loadError = ref('')
const graphDocument = ref<GraphDocument | null>(null)
const resolvedScanId = ref<string | null>(null)

const focusPath = computed(() => resolveGraphFocusQuery(route.query))

async function loadFileSummary(path: string): Promise<string | null> {
  const scanId = resolvedScanId.value
  if (!scanId) return null
  const meta = await getScanFileMeta(props.workspaceId, scanId, path)
  return meta?.summary ?? null
}

async function resolveScanId(): Promise<string | null> {
  if (props.scanId) return props.scanId
  const scans = await listScans(props.workspaceId)
  return scans.find(scan => scan.status === 'succeeded')?.id ?? null
}

async function loadGraph() {
  if (!props.workspaceId) return
  if (props.prefetchedGraph && props.scanId) {
    graphDocument.value = props.prefetchedGraph
    resolvedScanId.value = props.scanId
    loadError.value = ''
    loading.value = false
    return
  }
  loading.value = true
  loadError.value = ''
  graphDocument.value = null
  resolvedScanId.value = null
  try {
    const scanId = await resolveScanId()
    if (!scanId) {
      loadError.value = scanCopy.value.noScanSelected
      return
    }
    resolvedScanId.value = scanId
    graphDocument.value = await getScanGraph(props.workspaceId, scanId)
  } catch (cause) {
    loadError.value = cause instanceof Error ? cause.message : scanCopy.value.loadScanGraphError
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.workspaceId, props.scanId, props.prefetchedGraph] as const,
  () => {
    void loadGraph()
  },
  { immediate: true }
)
</script>

<template>
  <div class="scan-graph-view">
    <div v-if="loading" class="state-card" role="status">{{ scanCopy.loadingScanGraph }}</div>
    <div v-else-if="loadError" class="state-card error" role="alert">
      <p>{{ loadError }}</p>
      <button type="button" class="primary-button" @click="loadGraph">{{ messages.retry }}</button>
    </div>
    <ViewerApp
      v-else-if="graphDocument"
      embedded
      :locale="locale"
      :shell-theme="shellTheme"
      :graph-document="graphDocument"
      :focus-path="focusPath"
      :path-severity-counts="pathSeverityCounts"
      :scan-findings="scanFindings ?? []"
      :load-file-summary="loadFileSummary"
    />
  </div>
</template>

<style scoped>
.scan-graph-view {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  inline-size: 100%;
  min-inline-size: 0;
  min-block-size: 28rem;
  block-size: 100%;
}

/* Dedicated project-graph route uses shell flush content — fill the pane. */
:global(.shell-content--flush) .scan-graph-view {
  min-block-size: 0;
}

.state-card {
  padding: var(--space-5);
  border: 1px solid var(--color-border);
  border-radius: var(--r-md);
  background: var(--color-surface);
}

.state-card.error {
  color: var(--color-danger);
}

.primary-button {
  margin-top: var(--space-3);
  padding: var(--space-2) var(--space-4);
  border: 1px solid var(--button-primary-border);
  border-radius: var(--r-sm);
  background: var(--button-primary-bg);
  color: var(--button-primary-fg);
  cursor: pointer;
}

.scan-graph-view :deep(.viewer.viewer-embedded) {
  flex: 1 1 auto;
  inline-size: 100%;
  min-inline-size: 0;
  min-block-size: 28rem;
  block-size: 100%;
}
</style>
