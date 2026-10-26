<script setup lang="ts">
import { BRAND, pageTitle, quickstartCommand } from '../../../../packages/brand/src/brand'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import BrandMark from '../components/brand/BrandMark.vue'
import { resolvePreferredWebLocale, webLocaleDirection } from '../services/locale'
import {
  BUDGET_WARN_AT,
  HARD_EDGE_CAP,
  HARD_NODE_CAP,
  SEARCH_RESULT_CAP,
  SUPPORTED_SCHEMA
} from './caps'
import type { GraphDocument, GraphError, GraphNode } from './graph-types'
import { formatMessage, viewerMessages } from './messages'
import {
  buildOverview,
  collapseView,
  defaultFilters,
  emptyViewState,
  expandView,
  focusHits,
  indexGraph,
  pinPath,
  searchGraph,
  type FocusQuery,
  type ViewFilters,
  type ViewState
} from './overview'
import { parseGraphFile, type ParseHandle } from './parse-client'
import { sampleGraph } from './sample-graph'
import BudgetMeter from './components/BudgetMeter.vue'
import CoveragePanel from './components/CoveragePanel.vue'
import DriftPanel from './components/DriftPanel.vue'
import ErrorBanner from './components/ErrorBanner.vue'
import FilterRail from './components/FilterRail.vue'
import FocusBar from './components/FocusBar.vue'
import GraphCanvas from './components/GraphCanvas.vue'
import GraphLegend from './components/GraphLegend.vue'
import GraphSourcePicker from './components/GraphSourcePicker.vue'
import NodeDetail from './components/NodeDetail.vue'
import SearchPalette from './components/SearchPalette.vue'

const locale = resolvePreferredWebLocale(null, navigator.languages)
const messages = viewerMessages(locale)
const direction = webLocaleDirection(locale)
const numbers = new Intl.NumberFormat(locale)
const knownKinds = new Set(['directory', 'file', 'symbol', 'external', 'unresolved'])

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
const palette = ref(false)
const shortcuts = ref(false)
const query = ref('')
const railOpen = ref(false)
const inspectorOpen = ref(false)
const tab = ref<'details' | 'coverage' | 'drift'>('details')
const ready = ref(false)
const selection = ref<{ kind: 'node' | 'edge'; id: string } | null>(null)
const activeId = ref<string | null>(null)
const announce = ref('')
const viewState = ref<ViewState>(emptyViewState())
const filters = ref<ViewFilters>(defaultFilters())
const focus = ref<FocusQuery | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

let requestId = 0
let handle: ParseHandle | null = null
let loadingTimer = 0
let toastTimer = 0

const index = computed(() => (graph.value ? indexGraph(graph.value) : null))
const focusMembers = computed(() => {
  if (!focus.value || !index.value) return null
  const hits = focusHits(index.value, focus.value)
  return new Set([focus.value.nodeId, ...hits.confirmed, ...hits.possible])
})
const overview = computed(() => {
  if (!index.value) return null
  return buildOverview(index.value, viewState.value, filters.value, focusMembers.value)
})
const search = computed(() => (index.value ? searchGraph(index.value, query.value, SEARCH_RESULT_CAP) : { hits: [], total: 0 }))
const nodeRatio = computed(() => (overview.value ? overview.value.nodes.length / HARD_NODE_CAP : 0))
const edgeRatio = computed(() => (overview.value ? overview.value.edges.length / HARD_EDGE_CAP : 0))
const ratio = computed(() => Math.max(nodeRatio.value, edgeRatio.value))
const atCap = computed(() => (overview.value?.nodes.length ?? 0) >= HARD_NODE_CAP || (overview.value?.edges.length ?? 0) >= HARD_EDGE_CAP)

onMounted(() => {
  document.documentElement.lang = locale
  document.documentElement.dir = direction
  document.documentElement.dataset.theme = theme.value
  document.title = pageTitle(messages.title)
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('dragenter', onDragEnter)
  window.addEventListener('dragover', onDragOver)
  window.addEventListener('dragleave', onDragLeave)
  window.addEventListener('drop', onDrop)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
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
  toastTimer = window.setTimeout(() => { toast.value = '' }, 3000)
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
  focus.value = null
  viewState.value = emptyViewState()
  filters.value = defaultFilters()
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
  if (node.more) {
    if (atCap.value) return
    viewState.value = expandView(viewState.value, id)
    announce.value = format(messages.moreNext, { n: numbers.format(Math.min(node.remainder, 50)) })
    return
  }
  if (!node.cluster) return
  if (node.expanded) {
    viewState.value = collapseView(index.value, viewState.value, id)
    announce.value = format(messages.announceCollapsed, { name: node.label, n: numbers.format(node.clusterSize) })
    return
  }
  if (atCap.value) return
  viewState.value = expandView(viewState.value, id)
  announce.value = format(messages.announceExpanded, { name: node.label, n: numbers.format(node.clusterSize) })
}

function selectNode(id: string, fromClick: boolean) {
  selection.value = { kind: 'node', id }
  activeId.value = id
  tab.value = 'details'
  if (fromClick) inspectorOpen.value = true
  const node = overview.value?.nodes.find((item) => item.id === id)
  announce.value = format(messages.announceSelected, { name: node?.label || id, path: node?.path || '' })
}

function selectEdge(id: string) {
  selection.value = { kind: 'edge', id }
  tab.value = 'details'
  inspectorOpen.value = true
}

function enterFocus() {
  if (!selection.value || selection.value.kind !== 'node' || !index.value) return
  focus.value = { nodeId: selection.value.id, direction: 'out', depth: 1, confirmedOnly: false }
  viewState.value = pinPath(index.value, viewState.value, selection.value.id)
}

function jumpTo(id: string) {
  if (!index.value) return
  viewState.value = pinPath(index.value, viewState.value, id)
  palette.value = false
  query.value = ''
  selectNode(id, true)
  activeId.value = id
}

function toggleProvenance(key: 'extracted' | 'inferred' | 'unresolved') {
  filters.value = {
    ...filters.value,
    provenance: { ...filters.value.provenance, [key]: !filters.value.provenance[key] }
  }
}

function toggleKind(id: string) {
  const current = filters.value.kinds ?? index.value?.kinds ?? []
  const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
  filters.value = { ...filters.value, kinds: next }
}

function toggleLanguage(id: string) {
  const current = filters.value.languages ?? index.value?.languages ?? []
  const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
  filters.value = { ...filters.value, languages: next }
}

function legendToggle(visual: 'extracted' | 'inferred' | 'unresolved' | 'mixed') {
  if (visual === 'mixed' || visual === 'inferred') toggleProvenance('inferred')
  else toggleProvenance(visual)
}

function resetFilters() {
  filters.value = defaultFilters()
}

function expandEverything() {
  if (!index.value || index.value.document.nodes.length > HARD_NODE_CAP) return
  const expanded = [...index.value.children.keys()]
  const revealed: Record<string, number> = { root: HARD_NODE_CAP }
  for (const id of expanded) revealed[id] = HARD_NODE_CAP
  viewState.value = { expanded, revealed, pinned: [] }
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
  if (value.code === 'too-large') return format(messages.errorTooLarge, { size: numbers.format(value.actualBytes), limit: numbers.format(value.limitBytes) })
  return format(messages.errorSchema, { path: value.paths[0] ?? '/' })
}

function errorBody(value: GraphError): string {
  if (value.code === 'unsupported-version') return format(messages.versionBody, { supported: SUPPORTED_SCHEMA })
  return fileName.value
}

const detail = computed(() => {
  if (!selection.value || !index.value || !overview.value) return null
  if (selection.value.kind === 'edge') {
    const edge = overview.value.edges.find((item) => item.id === selection.value?.id)
    if (!edge) return null
    return {
      title: edge.label || edge.provenance,
      kind: edge.hierarchy ? 'contains' : 'bundle',
      path: '',
      span: '',
      provenance: format(messages.detailsProvenance, { ext: edge.extracted, inf: edge.inferred, unres: edge.unresolved }),
      confidence: '',
      reason: '',
      internal: '',
      weight: String(edge.weight),
      importKind: edge.importKind,
      typeOnly: edge.typeOnly
    }
  }
  const model = overview.value.nodes.find((item) => item.id === selection.value?.id)
  const node = index.value.nodesById.get(selection.value.id)
  return {
    title: model?.label || node?.label || selection.value.id,
    kind: node?.kind || model?.kind || '',
    path: model?.path || pathOf(node),
    span: spanOf(node),
    provenance: '',
    confidence: confidenceOf(node),
    reason: reasonOf(node),
    internal: model ? format(messages.detailsInternal, { n: numbers.format(model.internalEdges) }) : '',
    weight: '',
    importKind: '',
    typeOnly: ''
  }
})

function pathOf(node: GraphNode | undefined): string {
  if (!node) return ''
  if ((node.kind === 'directory' || node.kind === 'file') && 'path' in node) return node.path
  if (node.kind === 'symbol' && 'file' in node) return node.file
  return ''
}
function spanOf(node: GraphNode | undefined): string {
  if (!node || node.kind !== 'symbol' || !('span' in node)) return ''
  return `${node.span.start.line}:${node.span.start.col}`
}
function confidenceOf(node: GraphNode | undefined): string {
  void node
  return ''
}
function reasonOf(node: GraphNode | undefined): string {
  if (node?.kind === 'unresolved' && 'reason' in node) return node.reason
  return ''
}

const legendRows = computed(() => {
  const present = new Set(overview.value?.edges.map((edge) => edge.visual) ?? [])
  const rows: { visual: 'extracted' | 'inferred' | 'unresolved' | 'mixed'; label: string }[] = []
  if (present.has('extracted')) rows.push({ visual: 'extracted', label: `${messages.provExtracted} — ${messages.provExtractedDesc}` })
  if (present.has('inferred')) rows.push({ visual: 'inferred', label: `${messages.provInferred} — ${messages.provInferredDesc}` })
  if (present.has('mixed')) rows.push({ visual: 'mixed', label: `${messages.provMixed} — ${messages.provMixedDesc}` })
  if (present.has('unresolved')) rows.push({ visual: 'unresolved', label: `${messages.provUnresolved} — ${messages.provUnresolvedDesc}` })
  return rows.map((row) => ({
    ...row,
    count: format(messages.legendCount, {
      n: numbers.format(overview.value?.edges.filter((edge) => edge.visual === row.visual).reduce((sum, edge) => sum + edge.weight, 0) ?? 0)
    })
  }))
})

const focusSummary = computed(() => (focus.value && index.value ? focusHits(index.value, focus.value) : null))
const unknownKinds = computed(() => graph.value?.nodes.filter((node) => !knownKinds.has(node.kind)).length ?? 0)
const parsedPct = computed(() => {
  const files = graph.value?.coverage.files
  if (!files || files.discovered === 0) return 0
  return Math.round((files.parsed / files.discovered) * 100)
})
const coverageBanner = computed(() => {
  const files = graph.value?.coverage.files
  if (!files) return ''
  const missed = files.discovered - files.parsed
  if (missed > 0) return format(messages.coverageBanner, { n: numbers.format(missed) })
  return ''
})

function onKeydown(event: KeyboardEvent) {
  const target = event.target
  const typing = target instanceof HTMLElement && Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
  if (event.key === 'Escape') {
    if (palette.value) palette.value = false
    else if (shortcuts.value) shortcuts.value = false
    else if (focus.value) focus.value = null
    else if (selection.value) selection.value = null
    else {
      railOpen.value = false
      inspectorOpen.value = false
    }
    return
  }
  if (typing) return
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    palette.value = true
    return
  }
  if (event.key === '/' || event.key === '?') {
    event.preventDefault()
    if (event.key === '?') shortcuts.value = true
    else palette.value = true
    return
  }
  if (!overview.value) return
  if (event.key === '1') toggleProvenance('extracted')
  if (event.key === '2') toggleProvenance('inferred')
  if (event.key === '3') toggleProvenance('unresolved')
  if (event.key.toLowerCase() === 'f' && selection.value?.kind === 'node') enterFocus()
  if (event.key === 'Enter' && activeId.value) toggleNode(activeId.value)
  if (event.key === ' ' && activeId.value) {
    event.preventDefault()
    selectNode(activeId.value, true)
  }
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) && activeId.value) {
    event.preventDefault()
    const next = nearest(event.key)
    if (next) {
      activeId.value = next
      const element = document.querySelector<HTMLElement>(`[data-node-id="${CSS.escape(next)}"]`)
      element?.focus()
    }
  }
}

function nearest(key: string): string | null {
  if (!overview.value || !activeId.value) return null
  const origin = overview.value.positions.get(activeId.value)
  if (!origin) return null
  let best: string | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (const node of overview.value.nodes) {
    if (node.id === activeId.value) continue
    const point = overview.value.positions.get(node.id)
    if (!point) continue
    const dx = point.x - origin.x
    const dy = point.y - origin.y
    if (key === 'ArrowLeft' && dx >= 0) continue
    if (key === 'ArrowRight' && dx <= 0) continue
    if (key === 'ArrowUp' && dy >= 0) continue
    if (key === 'ArrowDown' && dy <= 0) continue
    const distance = dx * dx + dy * dy
    if (distance < bestDistance) {
      best = node.id
      bestDistance = distance
    }
  }
  return best
}

function exportCoverage() {
  const rows = graph.value?.coverage.byLanguage ?? []
  const lines = ['language,parsed,partial,failed,skipped', ...rows.map((row) => [row.language ?? '', row.parsed, row.partial, row.failed, row.skipped].join(','))]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'coverage.csv'
  anchor.click()
  URL.revokeObjectURL(url)
  showToast(messages.toastCopied)
}

const command = quickstartCommand()
const snippet = 'layers: []\nrules: []\n'
</script>

<template>
  <div class="viewer" :dir="direction">
    <a class="skip" href="#graph-canvas">{{ messages.skip }}</a>
    <header class="topbar" role="banner">
      <BrandMark :size="24" />
      <span class="wordmark">{{ BRAND.wordmark }}</span>
      <span v-if="sample" class="pill">{{ messages.samplePill }}</span>
      <span v-if="fileName" class="file" dir="ltr" :title="fileName">{{ fileName }}</span>
      <input id="graph-file" ref="fileInput" data-testid="file-input" class="file-input" type="file" accept=".json,application/json" @change="onInput" />
      <button type="button" @click="openPicker">{{ messages.choose }}</button>
      <button type="button" class="search" aria-keyshortcuts="Control+K Meta+K /" @click="palette = true">{{ messages.search }}</button>
      <button type="button" :aria-label="theme === 'dark' ? messages.themeToLight : messages.themeToDark" @click="theme = theme === 'dark' ? 'light' : 'dark'">
        {{ theme === 'dark' ? messages.themeToLight : messages.themeToDark }}
      </button>
      <button type="button" class="drawer-toggle" :aria-label="messages.railToggle" @click="railOpen = !railOpen">{{ messages.filters }}</button>
      <button type="button" class="drawer-toggle" :aria-label="messages.inspectorToggle" @click="inspectorOpen = !inspectorOpen">{{ messages.inspector }}</button>
    </header>

    <aside class="rail" :class="{ 'is-open': railOpen }" :aria-label="messages.filters">
      <FilterRail
        :label="messages.filters"
        :provenance-label="messages.filterProvenance"
        :kind-label="messages.filterNodeKind"
        :language-label="messages.filterLanguage"
        :drift-label="messages.filterDriftOnly"
        :reset-label="messages.filterReset"
        :empty-label="messages.filterOpen"
        :disabled="!graph"
        :extracted="filters.provenance.extracted"
        :inferred="filters.provenance.inferred"
        :unresolved="filters.provenance.unresolved"
        :drift-only="filters.driftOnly"
        :kinds="(index?.kinds ?? []).map((id) => ({ id, label: id, checked: !filters.kinds || filters.kinds.includes(id) }))"
        :languages="(index?.languages ?? []).map((id) => ({ id, label: id || '—', checked: !filters.languages || filters.languages.includes(id) }))"
        :extracted-text="messages.provExtracted"
        :inferred-text="messages.provInferred"
        :unresolved-text="messages.provUnresolved"
        @toggle-provenance="toggleProvenance"
        @toggle-kind="toggleKind"
        @toggle-language="toggleLanguage"
        @toggle-drift="filters = { ...filters, driftOnly: !filters.driftOnly }"
        @reset="resetFilters"
      />
      <GraphLegend :title="messages.legendTitle" :rows="legendRows" @toggle="legendToggle" />
      <button type="button" :disabled="!index || index.document.nodes.length > HARD_NODE_CAP" @click="expandEverything">
        {{ index && index.document.nodes.length > HARD_NODE_CAP
          ? format(messages.expandAllDisabled, { n: numbers.format(index.document.nodes.length), budget: numbers.format(HARD_NODE_CAP) })
          : messages.expandAll }}
      </button>
    </aside>

    <main class="stage">
      <p v-if="loading" class="loading" role="status">
        <span class="sr-only">{{ messages.loadingSr }}</span>
        {{ loadingVisible ? messages.loadingBuilding : messages.loadingSr }}
        <button v-if="loadingVisible" type="button" @click="closeGraph">{{ messages.loadingCancel }}</button>
      </p>
      <div v-if="dragging" class="drop-overlay">{{ format(messages.dropOverlay, { graphFile: BRAND.graphFile }) }}</div>
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
      <FocusBar
        v-if="focus && focusSummary"
        :label="messages.focusBar"
        :name="detail?.title || focus.nodeId"
        :dependencies="messages.focusDependencies"
        :dependents="messages.focusDependents"
        :both="messages.focusBoth"
        :depth-label="format(messages.focusDepth, { n: focus.depth })"
        :confirmed-only="messages.focusConfirmedOnly"
        :confirmed="format(messages.focusConfirmed, { n: numbers.format(focusSummary.confirmed.length) })"
        :possible="format(messages.focusPossible, { n: numbers.format(focusSummary.possible.length) })"
        :unresolved="focusSummary.unresolvedLeaving ? format(messages.focusUnresolvedLeave, { n: numbers.format(focusSummary.unresolvedLeaving) }) : ''"
        :none="focusSummary.confirmed.length + focusSummary.possible.length === 0 ? format(messages.focusNone, { n: focus.depth }) : ''"
        :exit="messages.focusExit"
        :direction="focus.direction"
        :depth="focus.depth"
        :confirmed-only-on="focus.confirmedOnly"
        @direction="focus = focus ? { ...focus, direction: $event } : focus"
        @depth="focus = focus ? { ...focus, depth: $event } : focus"
        @confirmed="focus = focus ? { ...focus, confirmedOnly: !focus.confirmedOnly } : focus"
        @exit="focus = null"
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
        :selected-id="selection?.kind === 'node' ? selection.id : null"
        :active-id="activeId"
        :more-label="(count) => format(messages.moreNode, { n: numbers.format(count) })"
        :expand-label="messages.expand"
        :collapse-label="messages.collapse"
        :zoom-in="messages.zoomIn"
        :zoom-out="messages.zoomOut"
        :zoom-fit="messages.zoomFit"
        @select="selectNode($event, true)"
        @toggle="toggleNode"
        @select-edge="selectEdge"
        @ready="ready = true"
      />
      <p v-else-if="graph && graph.nodes.length === 0" class="empty-graph">{{ messages.detailsEmpty }}</p>
      <p v-if="overview && overview.nodes.length === 0 && graph" class="empty-graph">{{ messages.filterEmpty }}</p>
    </main>

    <aside class="inspector" :class="{ 'is-open': inspectorOpen }" :aria-label="messages.inspector">
      <div role="tablist">
        <button type="button" role="tab" :aria-selected="tab === 'details'" @click="tab = 'details'">{{ messages.tabDetails }}</button>
        <button type="button" role="tab" :aria-selected="tab === 'coverage'" @click="tab = 'coverage'">{{ messages.tabCoverage }}</button>
        <button type="button" role="tab" :aria-selected="tab === 'drift'" @click="tab = 'drift'">{{ messages.tabDrift }}</button>
      </div>
      <NodeDetail
        v-if="tab === 'details'"
        :empty="messages.detailsEmpty"
        :kind-label="messages.detailsKind"
        :path-label="messages.detailsPath"
        :span-label="messages.detailsSpan"
        :provenance-label="messages.detailsProvenance"
        :confidence-label="messages.detailsConfidence"
        :reason-label="messages.detailsReason"
        :internal-label="messages.detailsInternal"
        :weight-label="messages.detailsWeight"
        :import-kind-label="messages.detailsImportKind"
        :type-only-label="messages.detailsTypeOnly"
        :focus-label="messages.focusEnter"
        :detail="detail"
        @focus="enterFocus"
      />
      <CoveragePanel
        v-else-if="tab === 'coverage'"
        :coverage="graph?.coverage ?? null"
        :none="format(messages.coverageNone, { cli: BRAND.cliName })"
        :bar="graph ? format(messages.coverageBar, { parsed: numbers.format(graph.coverage.files.parsed), partial: numbers.format(graph.coverage.files.partial), skipped: numbers.format(graph.coverage.files.skipped), total: numbers.format(graph.coverage.files.discovered) }) : ''"
        :banner="coverageBanner"
        :full="graph && !coverageBanner ? format(messages.coverageFull, { n: numbers.format(graph.coverage.files.discovered) }) : ''"
        :honesty="messages.coverageHonesty"
        :language="messages.coverageColLanguage"
        :parsed="messages.coverageColParsed"
        :partial="messages.coverageColPartial"
        :failed="messages.coverageColFailed"
        :skipped="messages.coverageColSkipped"
        :export-label="format(messages.coverageExport, { n: numbers.format(graph?.coverage.byLanguage.length ?? 0) })"
        @export="exportCoverage"
      />
      <DriftPanel
        v-else
        :title="messages.driftNoConfigTitle"
        :body="format(messages.driftNoConfigBody, { config: BRAND.configFile })"
        :status="messages.driftNotConfigured"
        :snippet-label="messages.driftSnippetLabel"
        :snippet="snippet"
        :copy-label="messages.driftCopy"
        @copy="copyText(snippet)"
      />
      <p v-if="unknownKinds">{{ format(messages.unknownKinds, { n: numbers.format(unknownKinds) }) }}</p>
    </aside>

    <footer class="status" role="contentinfo">
      <BudgetMeter
        :text="format(messages.budgetMeter, { nodes: numbers.format(overview?.nodes.length ?? 0), nodeBudget: numbers.format(HARD_NODE_CAP), edges: numbers.format(overview?.edges.length ?? 0), edgeBudget: numbers.format(HARD_EDGE_CAP) })"
        :ratio="ratio"
        :warn="ratio >= BUDGET_WARN_AT"
        :full="atCap"
        :near-label="messages.budgetNear"
        :full-label="messages.budgetFull"
        :hidden-label="overview && overview.hiddenNodes > 0 ? format(messages.budgetHidden, { n: numbers.format(overview.hiddenNodes) }) : ''"
      />
      <button type="button" @click="tab = 'coverage'; inspectorOpen = true">{{ format(messages.statusCoverage, { pct: numbers.format(parsedPct) }) }}</button>
      <button type="button" @click="tab = 'drift'; inspectorOpen = true">{{ messages.driftNotConfigured }}</button>
      <span v-if="sample">{{ messages.sampleFooter }}</span>
    </footer>

    <SearchPalette
      v-if="palette"
      :label="messages.search"
      :placeholder="messages.searchPlaceholder"
      :none="format(messages.searchNone, { q: query })"
      :hint="messages.searchHint"
      :more="format(messages.searchMore, { n: numbers.format(Math.max(search.total - search.hits.length, 0)) })"
      :footer="messages.searchFooter"
      :hits="search.hits"
      :total="search.total"
      :query="query"
      @input="query = $event"
      @choose="jumpTo"
      @close="palette = false"
    />
    <div v-if="shortcuts" class="scrim" role="dialog" aria-modal="true" :aria-label="messages.shortcutsTitle">
      <h2>{{ messages.shortcutsTitle }}</h2>
      <p>{{ messages.graphLabel }}</p>
      <button type="button" @click="shortcuts = false">{{ messages.shortcutsClose }}</button>
    </div>
    <p class="sr-only" aria-live="polite">{{ announce }}</p>
    <p v-if="toast" class="toast" role="status">{{ toast }}</p>
  </div>
</template>

<style scoped>
.viewer {
  display: grid;
  grid-template-columns: var(--viewer-rail-width) minmax(0, 1fr) var(--viewer-inspector-width);
  grid-template-rows: var(--viewer-topbar-height) minmax(0, 1fr) var(--viewer-statusbar-height);
  block-size: 100vh;
  background: var(--color-canvas);
  color: var(--color-text-primary);
}
.topbar {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding-inline: var(--space-3);
  background: var(--color-surface);
  border-block-end: 1px solid var(--color-border);
}
.stage {
  position: relative;
  display: flex;
  flex-direction: column;
  min-inline-size: 0;
  min-block-size: 0;
  block-size: 100%;
}
.rail, .inspector {
  overflow: auto;
  padding: var(--space-3);
  background: var(--color-surface);
  border-inline: 1px solid var(--color-border);
}
.status {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding-inline: var(--space-3);
  background: var(--color-surface);
  border-block-start: 1px solid var(--color-border);
}
.wordmark { font-weight: 700; letter-spacing: -0.03em; }
.pill {
  border: var(--graph-node-border-width) solid var(--color-brand-amber-ui);
  color: var(--color-brand-amber-ui);
  padding-inline: var(--space-2);
  border-radius: var(--radius-sm);
}
.file { font-family: var(--font-family-mono); max-inline-size: 12rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; unicode-bidi: isolate; }
.file-input { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip: rect(0 0 0 0); }
.skip { position: absolute; inset-inline-start: var(--space-2); inset-block-start: -100%; }
.skip:focus { inset-block-start: var(--space-2); z-index: var(--z-skip-link); }
.drop-overlay, .scrim { position: fixed; inset: 0; z-index: var(--z-palette); display: grid; place-items: center; background: var(--color-surface-overlay); }
.toast {
  position: fixed;
  inset-block-end: var(--space-4);
  inset-inline-start: 50%;
  z-index: var(--z-toast);
  transform: translateX(-50%);
  background: var(--color-surface-raised);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}
.sr-only { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip: rect(0 0 0 0); }
button {
  min-block-size: var(--viewer-hit-target);
  padding-inline: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-raised);
  color: var(--color-text-primary);
}
.empty-graph, .loading { padding: var(--space-4); }
@media (max-width: 1000px) {
  .viewer { grid-template-columns: minmax(0, 1fr); }
  .rail, .inspector {
    position: fixed;
    z-index: var(--z-viewer-drawer);
    inset-block: var(--viewer-topbar-height) var(--viewer-statusbar-height);
    inline-size: min(var(--viewer-rail-width), 88vw);
    transform: translateX(-110%);
  }
  .inspector { inset-inline-start: auto; inset-inline-end: 0; inline-size: min(var(--viewer-inspector-width), 88vw); transform: translateX(110%); }
  .rail.is-open, .inspector.is-open { transform: none; }
}
@media (max-width: 640px) {
  .file, .search { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  .inspector.is-open { inset-block-end: var(--viewer-statusbar-height); block-size: 60%; }
}
</style>
