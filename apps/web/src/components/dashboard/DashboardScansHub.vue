<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Scan } from '../../api/scans'
import type { GraphDocument } from '../../viewer/graph-types'
import { getScanGraph, listScans } from '../../api/scans'
import { pollScanUntilTerminal } from '../../services/scan-poll'
import { scanMessages } from '../../services/scan-messages'
import type { WebLocale } from '../../services/locale'
import OpenProjectPanel from './OpenProjectPanel.vue'
import ScanListPanel from './ScanListPanel.vue'
import DashboardGraphPanel from './DashboardGraphPanel.vue'

const props = defineProps<{
  workspaceId: string
  locale: WebLocale
  compact?: boolean
}>()

const messages = computed(() => scanMessages(props.locale))
const scans = ref<Scan[]>([])
const listLoading = ref(false)
const listError = ref('')
const selectedScanId = ref<string | null>(null)
const graphLoading = ref(false)
const graphError = ref('')
const graphLabel = ref('')
const graphDocument = ref<GraphDocument | null>(null)
let pollAbort: AbortController | null = null

const selectedScan = computed(() => scans.value.find(scan => scan.id === selectedScanId.value) ?? null)
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
      const latestSucceeded = scans.value.find(scan => scan.status === 'succeeded')
      if (latestSucceeded) selectedScanId.value = latestSucceeded.id
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

async function loadSelectedGraph() {
  graphDocument.value = null
  graphLabel.value = ''
  graphError.value = ''
  const scan = selectedScan.value
  if (!scan || scan.status !== 'succeeded' || !props.workspaceId) return
  graphLoading.value = true
  try {
    const graph = await getScanGraph(props.workspaceId, scan.id)
    graphLabel.value = messages.value.scanSourceLabel(scan)
    graphDocument.value = graph
  } catch (cause) {
    graphError.value = cause instanceof Error ? cause.message : messages.value.loadScanGraphError
  } finally {
    graphLoading.value = false
  }
}

function onScanFinished(scan: Scan) {
  scans.value = [scan, ...scans.value.filter(row => row.id !== scan.id)]
  if (scan.status === 'succeeded') selectedScanId.value = scan.id
}

function selectScan(scanId: string) {
  selectedScanId.value = scanId
}

watch(
  () => props.workspaceId,
  () => {
    selectedScanId.value = null
    graphDocument.value = null
    void loadScans()
  },
  { immediate: true }
)

watch(selectedScanId, () => {
  void loadSelectedGraph()
})
</script>

<template>
  <section class="scans-hub" :aria-label="messages.hubTitle">
    <header v-if="!compact" class="hub-header">
      <p class="eyebrow">{{ messages.hubEyebrow }}</p>
      <h1>{{ messages.hubTitle }}</h1>
      <p>{{ messages.hubDescription }}</p>
    </header>

    <OpenProjectPanel
      v-if="!compact"
      :workspace-id="workspaceId"
      :locale="locale"
      @scan-finished="onScanFinished"
    />

    <ScanListPanel
      :locale="locale"
      :scans="compact ? recentScans : scans"
      :loading="listLoading"
      :error="compact ? '' : listError"
      :selected-scan-id="selectedScanId"
      @refresh="loadScans"
      @select="selectScan"
    />

    <p v-if="graphLoading" role="status">{{ messages.loadingScanGraph }}</p>
    <p v-else-if="graphError" class="feedback error" role="alert">{{ graphError }}</p>
    <p v-else-if="!compact && selectedScan?.status !== 'succeeded'" class="muted">{{ messages.noScanSelected }}</p>

    <DashboardGraphPanel
      v-if="graphDocument"
      :locale="locale"
      :graph-document="graphDocument"
      :graph-label="graphLabel"
      :scan-id="selectedScanId"
      :workspace-id="workspaceId"
    />
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
  font-size: var(--font-size-xs);
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
  color: var(--color-accent-primary);
}

.muted {
  color: var(--color-text-secondary);
}

.feedback.error {
  color: var(--color-danger);
}
</style>
