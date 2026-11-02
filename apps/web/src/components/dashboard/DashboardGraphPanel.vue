<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { GraphDocument } from '../../viewer/graph-types'
import { readGraph } from '../../viewer/read-graph'
import { computeDashboardGraphStats, type DashboardGraphStats } from '../../services/dashboard-graph-stats'
import { dashboardGraphMessages } from '../../services/dashboard-graph-messages'
import { viewerHref } from '../../services/viewer-link'
import {
  openViewerWithStagedGraph,
  stageGraphForViewer
} from '../../services/viewer-graph-handoff'
import type { WebLocale } from '../../services/locale'

const props = defineProps<{
  locale: WebLocale
  graphDocument?: GraphDocument | null
  graphLabel?: string
  workspaceId?: string
  scanId?: string | null
}>()

const messages = computed(() => dashboardGraphMessages(props.locale))
const loadState = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
const parseError = ref('')
const graphLabel = ref('')
const stats = ref<DashboardGraphStats | null>(null)
const stagedGraphText = ref<string | null>(null)
const dropActive = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const viewerUrl = viewerHref()

const hasGraph = computed(() => loadState.value === 'ready' && stats.value !== null)
const showEntryPoints = computed(() => (stats.value?.entryPoints.length ?? 0) > 0)
const canOpenViewer = computed(() => hasGraph.value && stagedGraphText.value !== null)

function applyGraph(document: GraphDocument, label: string, text: string) {
  stats.value = computeDashboardGraphStats(document)
  graphLabel.value = label
  stagedGraphText.value = text
  loadState.value = 'ready'
  parseError.value = ''
}

async function loadText(text: string, label: string) {
  loadState.value = 'loading'
  parseError.value = ''
  const result = readGraph(text)
  if (!result.ok) {
    loadState.value = 'error'
    parseError.value = formatReadError(result.error, messages.value)
    stats.value = null
    stagedGraphText.value = null
    return
  }
  applyGraph(result.graph, label, text)
}

function formatReadError(error: { code: string }, msgs: ReturnType<typeof dashboardGraphMessages>): string {
  if (error.code === 'invalid-json') return msgs.parseInvalidJson
  if (error.code === 'too-large') return msgs.parseTooLarge
  if (error.code === 'unsupported-version') return msgs.parseUnsupportedVersion
  if (error.code === 'invalid-graph') return msgs.parseInvalidGraph
  return msgs.parseInvalidGraph
}

async function loadFile(file: File) {
  await loadText(await file.text(), file.name)
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) void loadFile(file)
  input.value = ''
}

function openFilePicker() {
  fileInput.value?.click()
}

function onDrop(event: DragEvent) {
  event.preventDefault()
  dropActive.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) void loadFile(file)
}

function onDragOver(event: DragEvent) {
  event.preventDefault()
  dropActive.value = true
}

function onDragLeave() {
  dropActive.value = false
}

function onDropKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    openFilePicker()
  }
}

function openViewer() {
  if (!stagedGraphText.value) return
  stageGraphForViewer(graphLabel.value || 'Scan graph', stagedGraphText.value)
  openViewerWithStagedGraph(viewerUrl)
}

watch(
  () => props.graphDocument,
  (document) => {
    if (document) {
      applyGraph(document, props.graphLabel || messages.value.loadedGraph, JSON.stringify(document))
    }
  },
  { immediate: true }
)
</script>

<template>
  <section class="graph-panel" :aria-label="messages.panelTitle">
    <div class="panel-heading">
      <div>
        <p class="eyebrow">{{ messages.panelEyebrow }}</p>
        <h2>{{ messages.panelTitle }}</h2>
        <p class="lede">{{ messages.panelDescription }}</p>
      </div>
      <button
        v-if="canOpenViewer"
        type="button"
        class="primary-button"
        @click="openViewer"
      >
        {{ messages.openViewer }}
      </button>
    </div>

    <div
      v-if="!graphDocument"
      class="drop-zone"
      :class="{ active: dropActive, loading: loadState === 'loading' }"
      role="button"
      tabindex="0"
      :aria-label="messages.dropZoneLabel"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
      @keydown="onDropKeydown"
    >
      <input
        ref="fileInput"
        class="sr-only"
        type="file"
        accept="application/json,.json"
        :aria-label="messages.chooseFile"
        @change="onFileChange"
      >
      <p v-if="loadState === 'loading'" role="status">{{ messages.loadingGraph }}</p>
      <template v-else>
        <p>{{ messages.dropHint }}</p>
        <button type="button" class="secondary-button" @click="openFilePicker">{{ messages.chooseFile }}</button>
      </template>
    </div>

    <p v-if="loadState === 'error'" class="feedback error" role="alert">{{ parseError }}</p>

    <div v-else-if="hasGraph && stats" class="insights">
      <p class="graph-source">
        <span>{{ messages.loadedGraph }}</span>
        <strong>{{ graphLabel }}</strong>
      </p>

      <div class="summary-cards">
        <article class="summary-card">
          <span>{{ messages.metricFiles }}</span>
          <strong>{{ stats.files }}</strong>
        </article>
        <article class="summary-card">
          <span>{{ messages.metricModules }}</span>
          <strong>{{ stats.modules }}</strong>
        </article>
        <article class="summary-card">
          <span>{{ messages.metricEdges }}</span>
          <strong>{{ stats.edges }}</strong>
        </article>
        <article class="summary-card">
          <span>{{ messages.metricExtracted }}</span>
          <strong>{{ stats.extractedEdges }}</strong>
        </article>
        <article class="summary-card">
          <span>{{ messages.metricInferred }}</span>
          <strong>{{ stats.inferredEdges }}</strong>
        </article>
      </div>

      <div class="rank-grid">
        <section class="rank-panel">
          <h3>{{ messages.topFanIn }}</h3>
          <p v-if="stats.topFanIn.length === 0" class="muted">{{ messages.noModuleRanks }}</p>
          <ol v-else>
            <li v-for="item in stats.topFanIn" :key="`in-${item.id}`">
              <span>{{ item.label }}</span>
              <strong>{{ item.count }}</strong>
            </li>
          </ol>
        </section>
        <section class="rank-panel">
          <h3>{{ messages.topFanOut }}</h3>
          <p v-if="stats.topFanOut.length === 0" class="muted">{{ messages.noModuleRanks }}</p>
          <ol v-else>
            <li v-for="item in stats.topFanOut" :key="`out-${item.id}`">
              <span>{{ item.label }}</span>
              <strong>{{ item.count }}</strong>
            </li>
          </ol>
        </section>
      </div>

      <section class="languages-panel">
        <h3>{{ messages.languagesTitle }}</h3>
        <p v-if="stats.languages.length === 0" class="muted">{{ messages.noLanguages }}</p>
        <ul v-else class="language-list">
          <li v-for="(row, index) in stats.languages" :key="`${row.language ?? 'unknown'}-${index}`">
            <span>{{ row.language ?? messages.unknownLanguage }}</span>
            <span>{{ messages.languageCounts(row.parsed, row.partial, row.failed, row.skipped) }}</span>
          </li>
        </ul>
      </section>

      <section v-if="showEntryPoints" class="entry-panel">
        <h3>{{ messages.entryPointsTitle }}</h3>
        <ul>
          <li v-for="entry in stats.entryPoints" :key="`${entry.path}-${entry.reason}`">
            <code>{{ entry.path }}</code>
            <span>{{ entry.reason }} · {{ entry.provenance }}</span>
          </li>
        </ul>
      </section>
    </div>

    <div v-else-if="loadState === 'idle' && !graphDocument" class="state-card muted-card" role="status">
      {{ messages.emptyGraph }}
    </div>
  </section>
</template>

<style scoped>
.graph-panel {
  display: grid;
  gap: var(--space-5);
}

.panel-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
}

.panel-heading h2 {
  margin: var(--space-2) 0;
}

.lede,
.muted,
.graph-source span {
  color: var(--color-text-secondary);
}

.eyebrow {
  margin: 0;
  font-size: var(--font-size-xs);
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
  color: var(--color-accent-primary);
}

.drop-zone {
  display: grid;
  gap: var(--space-3);
  justify-items: start;
  padding: var(--space-5);
  border: 1px dashed color-mix(in srgb, var(--color-accent-primary) var(--alpha-24), var(--color-border));
  border-radius: var(--radius-xl);
  background: color-mix(in srgb, var(--color-accent-primary) var(--alpha-04), transparent);
  cursor: pointer;
}

.drop-zone:focus-visible {
  outline: 2px solid var(--color-accent-primary);
  outline-offset: 2px;
}

.drop-zone.active {
  border-color: var(--color-accent-primary);
  background: color-mix(in srgb, var(--color-accent-primary) var(--alpha-08), transparent);
}

.drop-zone.loading {
  cursor: wait;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
  gap: var(--space-3);
}

.summary-card {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--color-surface) var(--alpha-50), transparent);
}

.summary-card span {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.summary-card strong {
  font-size: var(--font-size-2xl);
}

.rank-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
}

.rank-panel,
.languages-panel,
.entry-panel,
.state-card {
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--color-surface-raised) var(--alpha-80), transparent);
}

.rank-panel h3,
.languages-panel h3,
.entry-panel h3 {
  margin-top: 0;
}

.rank-panel ol,
.entry-panel ul,
.language-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: var(--space-2);
}

.rank-panel li,
.entry-panel li,
.language-list li {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
}

.feedback.error {
  padding: var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid color-mix(in srgb, var(--color-danger) var(--alpha-40), var(--color-border));
  color: var(--color-danger);
}

.primary-button,
.secondary-button {
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.primary-button {
  border: none;
  background: var(--color-accent-gradient-soft);
  color: var(--color-text-on-accent);
}

.secondary-button {
  border: 1px solid var(--color-border-strong);
  background: var(--color-surface);
  color: var(--color-text-primary);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

@media (max-width: 720px) {
  .rank-grid {
    grid-template-columns: 1fr;
  }
}
</style>
