<script setup lang="ts">
import { BRAND, pageTitle, quickstartCommand } from '../../../../packages/brand/src/brand'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { HARD_EDGE_CAP, HARD_NODE_CAP, SUPPORTED_SCHEMA } from './caps'
import type { GraphDocument, GraphError } from './graph-types'
import { formatMessage, viewerMessages } from './messages'
import { buildOverview, collapseView, defaultFilters, emptyViewState, expandView, indexGraph, type ViewState } from './overview'
import { parseGraphFile, type ParseHandle } from './parse-client'
import { sampleGraph } from './sample-graph'
import { resolvePreferredWebLocale, webLocaleDirection } from '../services/locale'
import ErrorBanner from './components/ErrorBanner.vue'
import GraphCanvas from './components/GraphCanvas.vue'
import GraphSourcePicker from './components/GraphSourcePicker.vue'

const locale = resolvePreferredWebLocale(null, navigator.languages)
const messages = viewerMessages(locale)
const direction = webLocaleDirection(locale)
const numbers = new Intl.NumberFormat(locale)

const theme = ref<'light' | 'dark'>(
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
)
const graph = shallowRef<GraphDocument | null>(null)
const error = ref<GraphError | null>(null)
const loading = ref(false)
const loadingVisible = ref(false)
const fileName = ref('')
const sample = ref(false)
const dragging = ref(false)
const toast = ref('')
const ready = ref(false)
const selection = ref<string | null>(null)
const activeId = ref<string | null>(null)
const announce = ref('')
const viewState = ref<ViewState>(emptyViewState())
const fileInput = ref<HTMLInputElement | null>(null)

let requestId = 0
let handle: ParseHandle | null = null
let loadingTimer = 0
let toastTimer = 0

const index = computed(() => (graph.value ? indexGraph(graph.value) : null))
const overview = computed(() => (index.value ? buildOverview(index.value, viewState.value, defaultFilters()) : null))
const atCap = computed(() => (overview.value?.nodes.length ?? 0) >= HARD_NODE_CAP || (overview.value?.edges.length ?? 0) >= HARD_EDGE_CAP)

onMounted(() => {
  document.documentElement.lang = locale
  document.documentElement.dir = direction
  document.documentElement.dataset.theme = theme.value
  document.title = pageTitle(messages.title)
  window.addEventListener('dragenter', onDragEnter)
  window.addEventListener('dragover', onDragOver)
  window.addEventListener('dragleave', onDragLeave)
  window.addEventListener('drop', onDrop)
})

onBeforeUnmount(() => {
  window.removeEventListener('dragenter', onDragEnter)
  window.removeEventListener('dragover', onDragOver)
  window.removeEventListener('dragleave', onDragLeave)
  window.removeEventListener('drop', onDrop)
  handle?.cancel()
})

watch(theme, (value) => {
  document.documentElement.dataset.theme = value
})

watch(overview, (value) => {
  if (!value) return
  if (!activeId.value || !value.nodes.some((node) => node.id === activeId.value)) {
    activeId.value = value.nodes[0]?.id ?? null
  }
})

function showToast(text: string) {
  toast.value = text
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toast.value = ''
  }, 3000)
}

function format(template: string, values: Record<string, string | number> = {}) {
  return formatMessage(template, values)
}

async function copyText(text: string) {
  try {
    await navigator.clipboard?.writeText(text)
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    document.body.appendChild(area)
    area.select()
    document.execCommand('copy')
    area.remove()
  }
  showToast(messages.toastCopied)
}

function openPicker() {
  fileInput.value?.click()
}

function onInput(event: Event) {
  const input = event.target
  if (!(input instanceof HTMLInputElement) || !input.files?.[0]) return
  void openBlob(input.files[0], false)
  input.value = ''
}

async function openSample() {
  const blob = new Blob([JSON.stringify(sampleGraph)], { type: 'application/json' })
  const file = new File([blob], BRAND.graphFile, { type: 'application/json' })
  await openBlob(file, true)
}

async function openBlob(file: File, asSample: boolean) {
  const token = ++requestId
  handle?.cancel()
  graph.value = null
  error.value = null
  ready.value = false
  selection.value = null
  viewState.value = emptyViewState()
  sample.value = asSample
  fileName.value = file.name
  loading.value = true
  loadingVisible.value = false
  window.clearTimeout(loadingTimer)
  loadingTimer = window.setTimeout(() => {
    if (loading.value) loadingVisible.value = true
  }, 250)
  if (file.size > 20 * 1024 * 1024) loadingVisible.value = true
  const next = parseGraphFile(file)
  handle = next
  const result = await next.promise
  if (token !== requestId) return
  loading.value = false
  loadingVisible.value = false
  if (!result.ok) {
    error.value = result.error
    return
  }
  graph.value = result.graph
  if (result.graph.nodes.length === 0) ready.value = true
}

function closeGraph() {
  requestId += 1
  handle?.cancel()
  graph.value = null
  error.value = null
  fileName.value = ''
  sample.value = false
  ready.value = false
}

function onDragEnter(event: DragEvent) {
  if ([...(event.dataTransfer?.types ?? [])].includes('Files')) dragging.value = true
}

function onDragOver(event: DragEvent) {
  if (dragging.value) event.preventDefault()
}

function onDragLeave(event: DragEvent) {
  if (event.target === window) dragging.value = false
}

function onDrop(event: DragEvent) {
  event.preventDefault()
  dragging.value = false
  const files = [...(event.dataTransfer?.files ?? [])]
  const first = files[0]
  if (!first) return
  if (files.length > 1) showToast(format(messages.dropMultiple, { file: first.name }))
  void openBlob(first, false)
}

function toggleNode(id: string) {
  if (!index.value || !overview.value) return
  const node = overview.value.nodes.find((item) => item.id === id)
  if (!node) return
  if (node.more || node.cluster) {
    if (node.cluster && node.expanded) {
      viewState.value = collapseView(index.value, viewState.value, id)
      announce.value = format(messages.announceCollapsed, { name: node.label, n: numbers.format(node.clusterSize) })
      return
    }
    if (atCap.value) return
    viewState.value = expandView(viewState.value, id)
    announce.value = node.more
      ? format(messages.moreNext, { n: numbers.format(Math.min(node.remainder, 50)) })
      : format(messages.announceExpanded, { name: node.label, n: numbers.format(node.clusterSize) })
  }
}

function selectNode(id: string) {
  selection.value = id
  activeId.value = id
  const node = overview.value?.nodes.find((item) => item.id === id)
  announce.value = format(messages.announceSelected, { name: node?.label || id, path: node?.path || '' })
}

function errorPaths(value: GraphError): string[] {
  return value.code === 'invalid-graph' ? value.paths.slice(0, 5) : []
}

function errorMore(value: GraphError): string {
  if (value.code !== 'invalid-graph' || value.paths.length <= 5) return ''
  return format(messages.errorMore, { n: numbers.format(value.paths.length - 5) })
}

function errorTitle(value: GraphError): string {
  if (value.code === 'unsupported-version') {
    return format(messages.versionTitle, { found: value.found ?? messages.versionMissing })
  }
  if (value.code === 'invalid-json') return format(messages.errorNotJson, { where: value.where })
  if (value.code === 'too-large') {
    return format(messages.errorTooLarge, { size: numbers.format(value.actualBytes), limit: numbers.format(value.limitBytes) })
  }
  return format(messages.errorSchema, { path: value.paths[0] ?? '/' })
}

function errorBody(value: GraphError): string {
  if (value.code === 'unsupported-version') return format(messages.versionBody, { supported: SUPPORTED_SCHEMA })
  return fileName.value
}

const command = quickstartCommand()
</script>

<template>
  <div class="viewer" :dir="direction">
    <a class="skip" href="#graph-canvas">{{ messages.skip }}</a>
    <header class="topbar" role="banner">
      <span class="wordmark">{{ BRAND.wordmark }}</span>
      <span v-if="sample" class="pill">{{ messages.samplePill }}</span>
      <span v-if="fileName" class="file" dir="ltr" :title="fileName">{{ fileName }}</span>
      <input id="graph-file" ref="fileInput" data-testid="file-input" class="file-input" type="file" @change="onInput" />
      <button type="button" @click="openPicker">{{ messages.choose }}</button>
      <button type="button" :aria-label="theme === 'dark' ? messages.themeToLight : messages.themeToDark" @click="theme = theme === 'dark' ? 'light' : 'dark'">
        {{ theme === 'dark' ? messages.themeToLight : messages.themeToDark }}
      </button>
    </header>
    <main class="stage">
      <p v-if="loading" class="loading" role="status">
        <span class="sr-only">{{ messages.loadingSr }}</span>
        {{ loadingVisible ? messages.loadingBuilding : messages.loadingSr }}
        <button v-if="loadingVisible" type="button" @click="closeGraph">{{ messages.loadingCancel }}</button>
      </p>
      <div v-if="dragging" class="drop-overlay">{{ format(messages.dropOverlay, { graphFile: BRAND.graphFile }) }}</div>
      <p v-if="toast" class="toast" role="status">{{ toast }}</p>
      <GraphSourcePicker
        v-if="!graph && !error"
        :title="format(messages.emptyTitle, { graphFile: BRAND.graphFile })"
        :drop-hint="messages.emptyDrop"
        :choose-label="messages.choose"
        :sample-label="messages.sample"
        :private-line="messages.emptyPrivate"
        :no-file="messages.emptyNoFile"
        :command="command"
        :copy-label="messages.toastCopied"
        :dragging="dragging"
        :drop-overlay="format(messages.dropOverlay, { graphFile: BRAND.graphFile })"
        @sample="openSample"
        @copy="copyText(command)"
      />
      <ErrorBanner
        v-if="error"
        :title="errorTitle(error)"
        :body="errorBody(error)"
        :paths="errorPaths(error)"
        :more-label="errorMore(error)"
        :choose-label="messages.errorAnother"
        :copy-label="messages.errorCopy"
        @choose="openPicker"
        @copy="copyText(errorTitle(error))"
      />
      <GraphCanvas
        v-if="overview && graph && graph.nodes.length > 0"
        :nodes="overview.nodes"
        :edges="overview.edges"
        :positions="overview.positions"
        :total-nodes="graph.summary.nodes"
        :total-edges="graph.summary.edges"
        :cluster-count="overview.nodes.filter((node) => node.cluster).length"
        :ready="ready"
        :label="messages.graphLabel"
        :selected-id="selection"
        :active-id="activeId"
        :more-label="(count) => format(messages.moreNode, { n: numbers.format(count) })"
        :expand-label="messages.expand"
        :collapse-label="messages.collapse"
        @select="selectNode"
        @toggle="toggleNode"
        @ready="ready = true"
      />
      <p v-else-if="graph && graph.nodes.length === 0" class="empty-graph">{{ messages.emptyGraph }}</p>
      <p class="sr-only" role="status">{{ announce }}</p>
    </main>
  </div>
</template>

<style scoped>
.viewer {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  block-size: 100vh;
  background: var(--color-canvas);
  color: var(--color-text-primary);
}
.topbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--color-surface);
  border-block-end: 1px solid var(--color-border);
}
.wordmark { font-weight: 700; letter-spacing: -0.02em; }
.file {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-inline-size: 16rem;
}
.stage { position: relative; min-block-size: 0; block-size: 100%; }
.file-input {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
.skip {
  position: absolute;
  inset-inline-start: var(--space-2);
  inset-block-start: -100%;
  z-index: 20;
  padding: var(--space-2);
  background: var(--color-surface-raised);
  color: var(--color-text-primary);
}
.skip:focus {
  inset-block-start: var(--space-2);
}
.loading, .toast, .empty-graph { padding: var(--space-3); }
.drop-overlay {
  position: absolute;
  inset: var(--space-3);
  display: grid;
  place-items: center;
  border: 1px dashed var(--color-border-strong);
  background: var(--color-surface);
}
.sr-only {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
button {
  min-block-size: 2.75rem;
  padding-inline: var(--space-3);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-surface-raised);
  color: var(--color-text-primary);
}
</style>
