<script setup lang="ts">
import { CircleAlert, Info, OctagonAlert, TriangleAlert } from '@lucide/vue'
import { BRAND, pageTitle, quickstartCommand } from '../../../../packages/brand/src/brand'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import BrandMark from '../components/brand/BrandMark.vue'
import ToastStack from '../components/ui/ToastStack.vue'
import { useToast } from '../composables/useToast'
import { resolvePreferredWebLocale, webLocaleDirection } from '../services/locale'
import {
  COMFORT_NODE_BUDGET,
  HARD_EDGE_CAP,
  HARD_NODE_CAP,
  SEARCH_RESULT_CAP,
  SUPPORTED_SCHEMA
} from './caps'
import { budgetTone } from './budget-tone'
import { fitDurationMs } from './motion'
import { formatByteSize } from './text'
import type { GraphDocument, GraphError, GraphNode } from './graph-types'
import { formatMessage, viewerMessages } from './messages'
import { GraphHistory, type GraphSnapshot } from './graph-history'
import { buildLinearOverview, isLinearControlId, toggleLinear } from './linear'
import { readLayoutPreference, writeLayoutPreference } from './layout-preference'
import {
  buildOverview,
  collapseView,
  collectEntryPoints,
  defaultFilters,
  emptyViewState,
  entryLabelForNode,
  entryOptionsForNucleus,
  expandRadialRing,
  expandView,
  focusHits,
  indexGraph,
  pinPath,
  resolveNucleusId,
  searchGraph,
  setFileNeighborhood,
  setFolderOverview,
  setNucleus,
  type FocusQuery,
  type ViewFilters,
  type ViewState,
  type GraphLayout
} from './overview'
import { parseGraphFile, type ParseHandle } from './parse-client'
import './graph-surface.css'
import { SEVERITY_LABELS } from '../services/severity-display'
import { resolveGraphNodeId } from '../services/graph-node-focus'
import type { ViewerReportFinding } from './report-types'
import { scanReportMessages } from '../services/scan-report-messages'
import type { SeverityCounts } from '../services/scan-report-tree'
import type { WebLocale } from '../services/locale'
import { buildNodeDetailSections, internalLinksText } from './node-detail-data'
import { sampleGraph } from './sample-graph'
import BudgetMeter from './components/BudgetMeter.vue'
import CoachMark from './components/CoachMark.vue'
import LoadingSkeleton from './components/LoadingSkeleton.vue'
import CoveragePanel from './components/CoveragePanel.vue'
import DriftPanel from './components/DriftPanel.vue'
import ErrorBanner from './components/ErrorBanner.vue'
import FilterRail from './components/FilterRail.vue'
import FocusBar from './components/FocusBar.vue'
import GraphCanvas from './components/GraphCanvas.vue'
import { ArrowLeft, ChartPie, GitCompareArrows, PanelRightClose, PanelRightOpen } from '@lucide/vue'
import GraphFloatingBar from './components/GraphFloatingBar.vue'
import GraphLegend from './components/GraphLegend.vue'
import GraphSourcePicker from './components/GraphSourcePicker.vue'
import NodeDetail, { type FileSummaryState } from './components/NodeDetail.vue'
import SearchPalette from './components/SearchPalette.vue'

const emit = defineEmits<{
  /** Open a workspace file; line (1-based) when the user picked a symbol in the file panel. */
  openFile: [path: string, line?: number]
}>()

const props = withDefaults(
  defineProps<{
    embedded?: boolean
    /** Host-provided memory for the collapsed panel (dashboard: browser storage, extension: webview state). */
    panelPrefs?: { read: () => boolean; write: (collapsed: boolean) => void } | null
    bootSample?: boolean
    locale?: WebLocale
    /** When set (embedded dashboard), follow the app shell theme instead of managing document theme locally. */
    shellTheme?: 'light' | 'dark' | null
    graphDocument?: GraphDocument | null
    focusPath?: string | null
    pathSeverityCounts?: Map<string, SeverityCounts>
    scanFindings?: ViewerReportFinding[]
    loadFileSummary?: (path: string) => Promise<string | null>
    /**
     * When false, applying focusPath selects the node without opening the inspector.
     * Default true keeps the dashboard and web app behaviour unchanged.
     */
    openInspectorOnFocus?: boolean
    /**
     * Embedded file mode: focusPath uses the import/importer neighbourhood
     * rather than pinning ancestor folders. Default false keeps the web app unchanged.
     */
    fileNeighborhood?: boolean
    /** The host opens files (VS Code webview): symbol rows in the file panel open the file at their line. */
    canOpenFiles?: boolean
    /**
     * Embedded project mode: nucleate the repo root and show top-level folders
     * and workspace packages. Default 'entry' keeps the web dashboard unchanged.
     */
    overviewLayout?: 'entry' | 'folders'
  }>(),
  {
    embedded: false,
    bootSample: false,
    shellTheme: null,
    graphDocument: null,
    focusPath: null,
    pathSeverityCounts: undefined,
    scanFindings: () => [],
    loadFileSummary: undefined,
    openInspectorOnFocus: true,
    fileNeighborhood: false,
    canOpenFiles: false,
    overviewLayout: 'entry'
  }
)

const locale = props.locale ?? resolvePreferredWebLocale(null, navigator.languages)
const messages = viewerMessages(locale)
const reportMessages = computed(() => scanReportMessages(locale))
const direction = webLocaleDirection(locale)
const numbers = new Intl.NumberFormat(locale)
const knownKinds = new Set(['directory', 'file', 'symbol', 'external', 'unresolved'])

const standaloneTheme = ref<'light' | 'dark'>(
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
)
const theme = computed(() => props.shellTheme ?? standaloneTheme.value)
const graph = shallowRef<GraphDocument | null>(null)
const error = ref<GraphError | null>(null)
const loading = ref(false)
const loadingVisible = ref(false)
const loadingBytes = ref(0)
const coachDismissed = ref(false)
const showAllCross = ref(false)
const fileName = ref('')
const sample = ref(false)
const dragging = ref(false)
const toasts = useToast()
const palette = ref(false)
const shortcuts = ref(false)
const query = ref('')
const railOpen = ref(false)
const inspectorOpen = ref(false)
const inspectorEl = ref<HTMLElement | null>(null)
const viewerEl = ref<HTMLElement | null>(null)
/**
 * Px of the graph canvas the open file panel covers on the right (desktop / wide panes). The graph
 * fits into the area left of it. Phones get 0: there the panel is a sheet below the toolbar.
 */
const panelInset = ref(0)
/** The open panel can shrink to a slim rail (tab icons + expand). Hosts may remember it via panelPrefs. */
const panelCollapsed = ref(props.panelPrefs?.read() ?? false)
const panelToggleEl = ref<HTMLButtonElement | null>(null)
function setPanelCollapsed(next: boolean, nextTab?: 'details' | 'coverage' | 'drift') {
  if (nextTab) tab.value = nextTab
  panelCollapsed.value = next
  props.panelPrefs?.write(next)
  // Keep keyboard focus on the toggle, which moves between the rail and the header.
  void nextTick(() => panelToggleEl.value?.focus())
}
watch(panelCollapsed, () => { void nextTick(measurePanelInset) }, { flush: 'post' })
/** Room for the floating toolbar (pane minus the side panel) picks its density so it stays on one row. */
const viewerWidth = ref(0)
let viewerResize: ResizeObserver | null = null
onMounted(() => {
  if (typeof ResizeObserver === 'undefined' || !viewerEl.value) return
  viewerResize = new ResizeObserver((entries) => { viewerWidth.value = Math.round(entries[0]?.contentRect.width ?? 0) })
  viewerResize.observe(viewerEl.value)
})
onBeforeUnmount(() => viewerResize?.disconnect())
const barDensity = computed<'full' | 'tight' | 'narrow' | 'xnarrow'>(() => {
  if (!viewerWidth.value || viewerWidth.value <= 640) return 'full'
  const space = viewerWidth.value - panelInset.value - 48
  if (space >= 940) return 'full'
  if (space >= 640) return 'tight'
  if (space >= 500) return 'narrow'
  return 'xnarrow'
})
function measurePanelInset() {
  const panel = inspectorEl.value
  const canvas = viewerEl.value?.querySelector<HTMLElement>('[data-testid="graph-canvas"]')
  const phone = typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 640px)').matches
  if (!inspectorOpen.value || !panel || !canvas || !viewerEl.value || phone) {
    panelInset.value = 0
    return
  }
  // The panel is anchored to the right edge (viewer, or the window when it is a fixed drawer); its
  // open position is known before the slide finishes, so the fit can move with it.
  const right = Math.min(viewerEl.value.getBoundingClientRect().right, window.innerWidth)
  const covered = canvas.getBoundingClientRect().right - (right - panel.offsetWidth)
  panelInset.value = covered > 0 ? Math.round(covered + 12) : 0
}
watch(inspectorOpen, () => { void nextTick(measurePanelInset) }, { flush: 'post' })
const tab = ref<'details' | 'coverage' | 'drift'>('details')
const ready = ref(false)
const selection = ref<{ kind: 'node' | 'edge'; id: string } | null>(null)
const activeId = ref<string | null>(null)
const announce = ref('')
const viewState = ref<ViewState>(emptyViewState())
/** Linear / Radial choice, remembered across loads in this browser. */
const preferredLayout = ref<GraphLayout>(readLayoutPreference())
const layout = computed<GraphLayout>(() => viewState.value.layout ?? 'radial')
function freshViewState(): ViewState {
  return { ...emptyViewState(), layout: preferredLayout.value }
}
/** Switch layout; the same file stays the centre and selection, and Back can undo it. */
function setLayout(next: GraphLayout) {
  if (next === layout.value) return
  remember()
  viewState.value = { ...viewState.value, layout: next }
  preferredLayout.value = next
  writeLayoutPreference(next)
  fitSignature.value += 1
}
const graphCanvas = ref<InstanceType<typeof GraphCanvas> | null>(null)
/** Back stack of graph views: nucleus / selection, expanded nodes, focus and viewport. */
const history = new GraphHistory()
const canGoBack = ref(false)
const restoreView = ref<{ token: number; viewport: GraphSnapshot['viewport'] } | null>(null)
const keepView = ref<{ token: number; id: string } | null>(null)
let viewToken = 0
let rememberedThisTick = false

/** Record the view the person is about to leave (once per user action). */
function remember() {
  if (!index.value || rememberedThisTick) return
  rememberedThisTick = true
  queueMicrotask(() => { rememberedThisTick = false })
  history.push({
    viewState: viewState.value,
    selection: selection.value,
    focus: focus.value,
    viewport: graphCanvas.value?.getViewport() ?? null,
    inspectorOpen: inspectorOpen.value
  })
  canGoBack.value = history.canGoBack
}

function forgetHistory() {
  history.clear()
  canGoBack.value = false
}

/** Back: put the previous graph view back (focus, selection, expanded nodes, zoom and pan). */
function goBack() {
  const previous = history.back()
  canGoBack.value = history.canGoBack
  if (!previous) return
  restoreView.value = { token: ++viewToken, viewport: previous.viewport }
  viewState.value = previous.viewState
  focus.value = previous.focus
  selection.value = previous.selection
  if (previous.selection?.kind === 'node') activeId.value = previous.selection.id
  inspectorOpen.value = previous.inspectorOpen
  tab.value = 'details'
  announce.value = messages.announceBack
}
const filters = ref<ViewFilters>(defaultFilters())
const focus = ref<FocusQuery | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const fileSummary = ref<string | null | undefined>(undefined)
const fileSummaryStatus = ref<FileSummaryState>('none')
let fileMetaRequestId = 0

let requestId = 0
let handle: ParseHandle | null = null
let loadingTimer = 0

const index = computed(() => (graph.value ? indexGraph(graph.value) : null))
const focusMembers = computed(() => {
  if (!focus.value || !index.value) return null
  const hits = focusHits(index.value, focus.value)
  return new Set([focus.value.nodeId, ...hits.confirmed, ...hits.possible])
})
const overview = computed(() => {
  if (!index.value) return null
  if (layout.value === 'linear') return buildLinearOverview(index.value, viewState.value, filters.value, focusMembers.value)
  return buildOverview(index.value, viewState.value, filters.value, focusMembers.value)
})
const entryOptions = computed(() =>
  index.value ? entryOptionsForNucleus(index.value, viewState.value.nucleusId) : []
)
const nucleusTag = computed(() => {
  if (props.fileNeighborhood) return messages.thisFileTag
  if (props.overviewLayout === 'folders') return messages.repositoryTag
  return messages.entryPointTag
})
const nucleusId = computed(() =>
  index.value ? resolveNucleusId(index.value, viewState.value.nucleusId) : ''
)
/** Disc rings take the file's highest severity colour; explain only the severities present in this scan. */
const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'] as const
const severityLegend = computed(() => {
  const present = new Set<string>()
  for (const counts of props.pathSeverityCounts?.values() ?? []) {
    for (const sev of SEVERITY_ORDER) if ((counts as unknown as Record<string, number>)[sev] > 0) present.add(sev)
  }
  return SEVERITY_ORDER.filter((sev) => present.has(sev))
})

const ringCount = computed(() => {
  if (!overview.value || layout.value === 'linear') return 0
  let max = 0
  for (const node of overview.value.nodes) max = Math.max(max, node.depth)
  return max
})
const nucleusLabel = computed(() => {
  if (!index.value) return ''
  return entryLabelForNode(index.value.nodesById.get(nucleusId.value), nucleusId.value)
})
/** The centre's visible name ("Repository", not the raw "." path) for the status line. */
const nucleusShownLabel = computed(() => overview.value?.nodes.find((n) => n.id === nucleusId.value)?.label || nucleusLabel.value)
const radialStatus = computed(() =>
  layout.value === 'linear' ? format(messages.statusLinear, { name: nucleusShownLabel.value }) : format(messages.statusRadial, { rings: ringCount.value === 1 ? messages.ringOne : format(messages.ringMany, { n: numbers.format(ringCount.value) }), name: nucleusShownLabel.value })
)
const panStatus = computed(() =>
  format(messages.statusPanZoom, { nodes: numbers.format(overview.value?.nodes.length ?? 0) })
)
const fitSignature = ref(0)
const search = computed(() => (index.value ? searchGraph(index.value, query.value, SEARCH_RESULT_CAP) : { hits: [], total: 0 }))
const nodeRatio = computed(() => (overview.value ? overview.value.nodes.length / HARD_NODE_CAP : 0))
const edgeRatio = computed(() => (overview.value ? overview.value.edges.length / HARD_EDGE_CAP : 0))
const ratio = computed(() => Math.max(nodeRatio.value, edgeRatio.value))
const atCap = computed(() => (overview.value?.nodes.length ?? 0) >= HARD_NODE_CAP || (overview.value?.edges.length ?? 0) >= HARD_EDGE_CAP)

onMounted(() => {
  if (!props.embedded) {
    document.documentElement.lang = locale
    document.documentElement.dir = direction
    document.documentElement.dataset.theme = standaloneTheme.value
    document.title = pageTitle(messages.title)
  }
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', measurePanelInset)
  if (!props.embedded) {
    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)
  }
  if (props.graphDocument) {
    void loadGraphDocument(props.graphDocument)
  } else if (props.bootSample || import.meta.env.VITE_VIEWER_BOOT_SAMPLE === 'true') {
    void openSample()
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', measurePanelInset)
  if (!props.embedded) {
    window.removeEventListener('dragenter', onDragEnter)
    window.removeEventListener('dragover', onDragOver)
    window.removeEventListener('dragleave', onDragLeave)
    window.removeEventListener('drop', onDrop)
  }
  handle?.cancel()
})

watch(standaloneTheme, (value) => {
  if (props.embedded || props.shellTheme) return
  document.documentElement.dataset.theme = value
})

watch(overview, (value) => {
  if (!value) return
  if (!activeId.value || !value.nodes.some((node) => node.id === activeId.value)) {
    activeId.value = value.nodes[0]?.id ?? null
  }
})

function recenterOnNode(id: string, quiet = false) {
  if (!index.value) return
  viewState.value = setNucleus(viewState.value, id)
  fitSignature.value += 1
  if (!quiet) showToast(messages.toastLayout)
}

function onEntryChange(id: string) {
  remember()
  recenterOnNode(id)
  selectNode(id, false)
}

function onRecentreDetail() {
  remember()
  if (selection.value?.kind === 'node') recenterOnNode(selection.value.id)
}

function onNavigateDetail(id: string) {
  selectNode(id, true)
}

function onExpandChildDetail(id: string) {
  if (!index.value) return
  remember()
  const node = index.value.nodesById.get(id)
  if (node?.kind === 'directory' && !atCap.value) {
    viewState.value = expandView(viewState.value, id)
  }
  selectNode(id, true)
}

function triggerFit() {
  fitSignature.value += 1
}

function showToast(text: string) {
  toasts.info(text)
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

async function loadGraphDocument(document: GraphDocument) {
  handle?.cancel()
  graph.value = document
  error.value = null
  loading.value = false
  loadingVisible.value = false
  ready.value = false
  selection.value = null
  focus.value = null
  forgetHistory()
  viewState.value = freshViewState()
  filters.value = defaultFilters()
  sample.value = false
  fileName.value = 'scan-graph.json'
  const indexed = indexGraph(document)
  if (props.overviewLayout === 'folders' && !props.focusPath) {
    const root = indexed.nodesById.has('dir:.') ? 'dir:.' : resolveNucleusId(indexed, null)
    viewState.value = setFolderOverview(viewState.value, root)
  } else {
    const entries = collectEntryPoints(indexed)
    if (entries[0]) viewState.value = setNucleus(viewState.value, entries[0].id)
  }
  if (document.nodes.length === 0) ready.value = true
  applyFocusPath(props.focusPath)
}

function applyFocusPath(path: string | null) {
  if (!path || !index.value) return
  const id = resolveGraphNodeId(index.value, path)
  if (!id) return
  if (props.fileNeighborhood) {
    viewState.value = setFileNeighborhood(viewState.value, id)
  } else {
    viewState.value = pinPath(index.value, viewState.value, id)
    viewState.value = setNucleus(viewState.value, id)
  }
  selectNode(id, props.openInspectorOnFocus, false)
  activeId.value = id
}

watch(
  () => props.graphDocument,
  (document, previous) => {
    if (!document || document === previous) return
    void loadGraphDocument(document)
  }
)

watch(
  () => [props.focusPath, index.value] as const,
  ([path, idx]) => {
    if (!idx) return
    applyFocusPath(path)
  }
)

async function openBlob(file: File, asSample: boolean) {
  const token = ++requestId
  handle?.cancel()
  graph.value = null
  error.value = null
  ready.value = false
  selection.value = null
  focus.value = null
  forgetHistory()
  viewState.value = freshViewState()
  filters.value = defaultFilters()
  sample.value = asSample
  fileName.value = file.name
  loadingBytes.value = file.size
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
  applyFocusPath(props.focusPath)
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
  remember()
  // Keep the toggled node where it is on screen when the person has zoomed or panned.
  keepView.value = { token: ++viewToken, id }
  if (isLinearControlId(id)) {
    viewState.value = toggleLinear(viewState.value, id)
    announce.value = node.more
      ? format(messages.moreNext, { n: numbers.format(Math.min(node.remainder, 14)) })
      : format(node.expanded ? messages.announceCollapsed : messages.announceExpanded, { name: node.label, n: numbers.format(node.clusterSize) })
    return
  }
  if (node.more) {
    if (atCap.value) return
    viewState.value = expandView(viewState.value, id)
    announce.value = format(messages.moreNext, { n: numbers.format(Math.min(node.remainder, 50)) })
    return
  }
  if (!node.cluster && !node.more) {
    viewState.value = expandRadialRing(viewState.value)
    announce.value = format(messages.announceExpanded, { name: node.label, n: numbers.format(viewState.value.maxRadialRing ?? 0) })
    return
  }
  if (node.expanded) {
    viewState.value = collapseView(index.value, viewState.value, id)
    announce.value = format(messages.announceCollapsed, { name: node.label, n: numbers.format(node.clusterSize) })
    return
  }
  if (atCap.value) return
  viewState.value = expandView(viewState.value, id)
  announce.value = format(messages.announceExpanded, { name: node.label, n: numbers.format(node.clusterSize) })
}

function selectNode(id: string, fromClick: boolean, record = fromClick) {
  if (record) remember()
  if (fromClick && !props.fileNeighborhood && props.overviewLayout !== 'folders') recenterOnNode(id, true)
  selection.value = { kind: 'node', id }
  activeId.value = id
  tab.value = 'details'
  if (fromClick) inspectorOpen.value = true
  const node = overview.value?.nodes.find((item) => item.id === id)
  announce.value = format(messages.announceSelected, { name: node?.label || id, path: node?.path || '' })
  if (fromClick && props.fileNeighborhood && node?.expandCaption) toggleNode(id)
}

function filePathForNode(id: string): string | null {
  const node = index.value?.nodesById.get(id)
  if (!node) return null
  if (node.kind === 'file' && 'path' in node) return node.path
  if (node.kind === 'symbol' && 'file' in node) {
    // Symbol nodes point at their file by node id ("file:<path>"); open the file's path, not the id.
    const fileNode = index.value?.nodesById.get(node.file)
    if (fileNode?.kind === 'file' && 'path' in fileNode) return fileNode.path
    return node.file.startsWith('file:') ? node.file.slice('file:'.length) : node.file
  }
  return null
}

/** User click on the canvas. Optional openFile is a no-op when nothing listens (web app). */
function onCanvasSelect(id: string) {
  // Linear group / "+N more" pills expand in place; they are not files.
  if (isLinearControlId(id)) {
    toggleNode(id)
    return
  }
  selectNode(id, true)
  const path = filePathForNode(id)
  if (path) emit('openFile', path)
}

/** File panel symbol row: open the symbol's file at its start line (editor hosts only). */
function onOpenSymbol(row: { id: string; line: number }) {
  const path = filePathForNode(row.id)
  if (path) emit('openFile', path, row.line)
}

function selectEdge(id: string) {
  selection.value = { kind: 'edge', id }
  tab.value = 'details'
  inspectorOpen.value = true
}

function enterFocus() {
  if (!selection.value || selection.value.kind !== 'node' || !index.value) return
  remember()
  focus.value = { nodeId: selection.value.id, direction: 'out', depth: 1, confirmedOnly: false }
  viewState.value = pinPath(index.value, viewState.value, selection.value.id)
}

function jumpTo(id: string) {
  if (!index.value) return
  remember()
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
    internal: model
      ? internalLinksText(model.internalEdges, node?.kind || model.kind || '', { none: messages.detailsInternalNone, one: messages.detailsInternalOne, many: messages.detailsInternalMany }, (n) => numbers.format(n))
      : '',
    weight: '',
    importKind: '',
    typeOnly: ''
  }
})

const hasScanReport = computed(() => Boolean(props.loadFileSummary))

const nodeDetailSections = computed(() => {
  if (!selection.value || selection.value.kind !== 'node' || !index.value || !overview.value) return null
  const model = overview.value.nodes.find((item) => item.id === selection.value?.id)
  if (!model) return null
  return buildNodeDetailSections({
    index: index.value,
    nodeId: selection.value.id,
    depth: model.depth,
    findings: props.scanFindings ?? [],
    pathSeverityCounts: props.pathSeverityCounts,
    apiSummary: fileSummaryStatus.value === 'ready' ? (fileSummary.value ?? null) : null
  })
})

const panelFindings = computed(() => nodeDetailSections.value?.findings ?? [])

async function loadSelectedFileSummary(nodeId: string, idx: NonNullable<typeof index.value>) {
  const loadSummary = props.loadFileSummary
  if (!loadSummary) {
    fileSummaryStatus.value = 'none'
    fileSummary.value = undefined
    return
  }
  const node = idx.nodesById.get(nodeId)
  if (node?.kind !== 'file' || !('path' in node)) {
    fileSummaryStatus.value = 'none'
    fileSummary.value = undefined
    return
  }
  const token = ++fileMetaRequestId
  fileSummaryStatus.value = 'loading'
  try {
    const summary = await loadSummary(node.path)
    if (token !== fileMetaRequestId) return
    fileSummaryStatus.value = 'ready'
    fileSummary.value = summary
  } catch {
    if (token !== fileMetaRequestId) return
    fileSummaryStatus.value = 'error'
    fileSummary.value = null
  }
}

function retryFileSummary() {
  if (!selection.value || selection.value.kind !== 'node' || !index.value) return
  void loadSelectedFileSummary(selection.value.id, index.value)
}

watch(
  () =>
    [
      selection.value?.kind === 'node' ? selection.value.id : null,
      props.loadFileSummary,
      index.value
    ] as const,
  ([nodeId, , idx]) => {
    if (!nodeId || !idx) {
      fileSummaryStatus.value = 'none'
      fileSummary.value = undefined
      return
    }
    void loadSelectedFileSummary(nodeId, idx)
  },
  { immediate: true }
)

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
    active: row.visual === 'mixed' || row.visual === 'inferred' ? filters.value.provenance.inferred : filters.value.provenance[row.visual],
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
  if (event.altKey && event.key === 'ArrowLeft') {
    if (canGoBack.value) {
      event.preventDefault()
      goBack()
    }
    return
  }
  if (!event.ctrlKey && !event.metaKey && !event.altKey && (event.key === '+' || event.key === '=' || event.key === '-')) {
    event.preventDefault()
    graphCanvas.value?.zoomBy(event.key === '-' ? 1 / 1.25 : 1.25)
    return
  }
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
const cameraDuration = computed(() => (focus.value ? fitDurationMs() : 0))
const cameraPadding = computed(() => (focus.value ? 0.25 : 0.12))
const meterTone = computed(() => budgetTone(overview.value?.nodes.length ?? 0, COMFORT_NODE_BUDGET, HARD_NODE_CAP))
const skippedCount = computed(() => {
  const files = graph.value?.coverage.files
  if (!files) return 0
  return files.skipped + files.failed + files.partial
})
const crossLinkCount = computed(() => overview.value?.edges.filter((e) => e.role === 'cross').length ?? 0)
const showAllCrossLabel = computed(() =>
  format(showAllCross.value ? messages.hideExtraConnections : messages.showAllConnections, {
    n: numbers.format(crossLinkCount.value)
  })
)

const coachSteps = computed(() => [
  messages.graphGuideStep1,
  messages.graphGuideStep2,
  messages.graphGuideStep3
])
const snippet = 'layers: []\nrules: []\n'
</script>

<template>
  <div ref="viewerEl" class="viewer viewer-radial" :class="{ 'viewer-embedded': embedded, 'is-inspector-open': inspectorOpen, 'is-panel-collapsed': inspectorOpen && panelCollapsed, 'is-focusing': Boolean(focus && focusSummary) }" :dir="direction">
    <a v-if="!embedded" class="skip" href="#graph-canvas">{{ messages.skip }}</a>
    <header v-if="!embedded" class="topbar" role="banner">
      <BrandMark :size="24" />
      <span class="wordmark">{{ BRAND.wordmark }}</span>
      <span v-if="sample" class="pill">{{ messages.samplePill }}</span>
      <span v-if="fileName" class="file" dir="ltr" :title="fileName">{{ fileName }}</span>
      <input id="graph-file" ref="fileInput" data-testid="file-input" class="file-input" type="file" accept=".json,application/json" @change="onInput" />
      <button type="button" @click="openPicker">{{ messages.choose }}</button>
      <button type="button" class="search" aria-keyshortcuts="Control+K Meta+K /" @click="palette = true">{{ messages.search }}</button>
      <button type="button" :aria-label="theme === 'dark' ? messages.themeToLight : messages.themeToDark" @click="standaloneTheme = theme === 'dark' ? 'light' : 'dark'">
        {{ theme === 'dark' ? messages.themeToLight : messages.themeToDark }}
      </button>
      <button type="button" class="drawer-toggle" :aria-label="messages.railToggle" @click="railOpen = !railOpen">{{ messages.filters }}</button>
      <button type="button" class="drawer-toggle" :aria-label="messages.inspectorToggle" @click="inspectorOpen = !inspectorOpen">{{ messages.inspector }}</button>
    </header>

    <aside class="rail" :class="{ 'is-open': railOpen }" :aria-label="messages.filters" :aria-hidden="!railOpen && embedded ? true : undefined">
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
      <button type="button" :disabled="!index || index.document.nodes.length > HARD_NODE_CAP" @click="expandEverything">
        {{ index && index.document.nodes.length > HARD_NODE_CAP
          ? format(messages.expandAllDisabled, { n: numbers.format(index.document.nodes.length), budget: numbers.format(HARD_NODE_CAP) })
          : messages.expandAll }}
      </button>
    </aside>

    <main class="stage graph-surface">
      <LoadingSkeleton
        v-if="loading"
        :label="format(messages.readingFile, { graphFile: BRAND.graphFile, size: formatByteSize(loadingBytes, locale) })"
        :cancel-label="messages.loadingCancel"
        @cancel="closeGraph"
      />
      <div v-if="dragging" class="drop-overlay">{{ messages.dropOverlay }}</div>
      <GraphSourcePicker
        v-if="!embedded && !graph && !error && !loading"
        :title="messages.emptyTitle"
        :body="format(messages.emptyBody, { graphFile: BRAND.graphFile })"
        :drop-hint="messages.emptyDrop"
        :choose-label="messages.choose"
        :sample-label="messages.sample"
        :private-line="messages.emptyPrivate"
        :no-file="messages.emptyNoFile"
        :command="command"
        :copy-label="messages.copyCommand"
        :copied-label="messages.toastCopied"
        :dragging="dragging"
        :drop-overlay="messages.dropOverlay"
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
      <GraphFloatingBar
        v-if="overview && graph && graph.nodes.length > 0"
        :filters-label="messages.railToggle"
        :filters-tooltip="messages.filtersTooltip"
        :search-label="messages.searchPlaceholder"
        :search-short-label="embedded ? messages.searchShort : undefined"
        :search-tooltip="messages.searchTooltip"
        :fit-label="messages.zoomFit"
        :fit-tooltip="messages.fitTooltip"
        :entry-label="messages.entryLabel"
        :entry-tooltip="messages.entryTooltip"
        :entry-options="overviewLayout === 'folders' ? [] : entryOptions"
        :entry-id="nucleusId"
        search-shortcut="Control+K Meta+K /"
        :show-all-cross-label="crossLinkCount > 0 ? showAllCrossLabel : undefined"
        :show-all-cross="showAllCross"
        :cross-link-count="crossLinkCount"
        @toggle-filters="railOpen = !railOpen"
        @open-search="palette = true"
        @fit="triggerFit"
        @update:entry-id="onEntryChange"
        @toggle-show-all-cross="showAllCross = !showAllCross"
        :layout="layout"
        :density="barDensity"
        :layout-label="messages.layoutLabel"
        :radial-label="messages.layoutRadial"
        :linear-label="messages.layoutLinear"
        @update:layout="setLayout"
      >
        <template v-if="focus && focusSummary" #below>
          <FocusBar
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
            :chip="format(messages.focusChip, { path: detail?.path || focus.nodeId, n: focus.depth })"
            :esc-hint="messages.focusEsc"
            :options-label="messages.focusOptions"
            :direction-label="messages.focusDirection"
            :direction="focus.direction"
            :depth="focus.depth"
            :confirmed-only-on="focus.confirmedOnly"
            @direction="focus = focus ? { ...focus, direction: $event } : focus"
            @depth="focus = focus ? { ...focus, depth: $event } : focus"
            @confirmed="focus = focus ? { ...focus, confirmedOnly: !focus.confirmedOnly } : focus"
            @exit="focus = null"
          />
        </template>
      </GraphFloatingBar>
      <p v-if="overview && graph && graph.nodes.length > 0" class="graph-hint" role="note">
        {{ messages.graphOverviewHint }}
      </p>
      <GraphCanvas
        v-if="overview && graph && graph.nodes.length > 0"
        ref="graphCanvas"
        :restore-view="restoreView"
        :keep-view="keepView"
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
        :focus-ids="focusMembers ? [...focusMembers] : []"
        :fit-duration="cameraDuration"
        :fit-padding="cameraPadding"
        :path-severity-counts="pathSeverityCounts"
        :nucleus-id="nucleusId"
        :ring-count="ringCount"
        :ring-radii="overview.ringRadii"
        :half-captions="overview.halfCaptions"
        :label-placements="overview.labelPlacements"
        :fit-bump="fitSignature"
        :show-all-cross="showAllCross"
        :entry-tag="nucleusTag"
        :plain-marks="embedded"
        :reserve-zoom-pad="embedded"
        :hide-overlapping-ring1="embedded"
        :panel-inset="panelInset"
        :inside-open-caption="embedded && overviewLayout === 'folders' ? messages.insideOpenCaption : undefined"
        :inside-close-caption="embedded && overviewLayout === 'folders' ? messages.insideCloseCaption : undefined"
        :layout="layout"
        :group-label="(count) => format(messages.linearGroupFiles, { n: numbers.format(count) })"
        @select="onCanvasSelect"
        @toggle="toggleNode"
        @select-edge="selectEdge"
        @ready="ready = true"
      />
      <p v-else-if="graph && graph.nodes.length === 0" class="empty-graph">{{ messages.detailsEmpty }}</p>
      <p v-if="overview && overview.nodes.length === 0 && graph" class="empty-graph">{{ messages.filterEmpty }}</p>
      <GraphLegend class="stage-legend" :title="messages.legendTitle" :rows="legendRows" @toggle="legendToggle" />
      <CoachMark
        v-if="overview && graph && graph.nodes.length > 0 && !coachDismissed"
        :steps="coachSteps"
        :skip-label="messages.coachSkip"
        :next-label="messages.coachNext"
        :open-label="messages.coachOpenLabel"
        @dismiss="coachDismissed = true"
      />
    </main>

    <aside ref="inspectorEl" class="inspector" :class="{ 'is-open': inspectorOpen, 'is-collapsed': panelCollapsed }" :aria-label="messages.inspector">
      <div v-if="panelCollapsed" class="inspector-rail" data-testid="panel-rail">
        <button
          ref="panelToggleEl"
          type="button"
          class="panel-toggle"
          data-testid="panel-toggle"
          aria-expanded="false"
          aria-controls="viewer-panel-body"
          :aria-label="messages.panelExpand"
          :title="messages.panelExpand"
          @click="setPanelCollapsed(false)"
        >
          <PanelRightOpen :size="16" aria-hidden="true" />
        </button>
        <span v-if="detail" class="rail-title" dir="ltr">{{ detail.title }}</span>
        <button type="button" class="rail-tab" :aria-label="messages.tabDetails" :title="messages.tabDetails" @click="setPanelCollapsed(false, 'details')"><Info :size="16" aria-hidden="true" /></button>
        <button type="button" class="rail-tab" :aria-label="messages.tabCoverage" :title="messages.tabCoverage" @click="setPanelCollapsed(false, 'coverage')"><ChartPie :size="16" aria-hidden="true" /></button>
        <button type="button" class="rail-tab" :aria-label="messages.tabDrift" :title="messages.tabDrift" @click="setPanelCollapsed(false, 'drift')"><GitCompareArrows :size="16" aria-hidden="true" /></button>
      </div>
      <div v-show="!panelCollapsed" id="viewer-panel-body" class="inspector-body">
      <div class="inspector-head">
        <button
          v-if="canGoBack"
          type="button"
          class="panel-toggle head-back"
          data-testid="detail-back"
          :aria-label="messages.backTooltip"
          :title="messages.backTooltip"
          @click="goBack"
        >
          <ArrowLeft :size="16" aria-hidden="true" />
        </button>
      <div role="tablist" class="inspector-tabs">
        <button type="button" role="tab" :aria-selected="tab === 'details'" @click="tab = 'details'" :title="messages.tabDetails"><Info :size="14" aria-hidden="true" /><span class="tab-label">{{ messages.tabDetails }}</span></button>
        <button type="button" role="tab" :aria-selected="tab === 'coverage'" @click="tab = 'coverage'" :title="messages.tabCoverage">
          <ChartPie :size="14" aria-hidden="true" /><span class="tab-label">{{ messages.tabCoverage }}</span>
          <span v-if="skippedCount" class="tab-count">▲ {{ numbers.format(skippedCount) }}</span>
        </button>
        <button type="button" role="tab" :aria-selected="tab === 'drift'" @click="tab = 'drift'" :title="messages.tabDrift"><GitCompareArrows :size="14" aria-hidden="true" /><span class="tab-label">{{ messages.tabDrift }}</span></button>
      </div>
        <button
          v-if="!panelCollapsed"
          ref="panelToggleEl"
          type="button"
          class="panel-toggle"
          data-testid="panel-toggle"
          aria-expanded="true"
          aria-controls="viewer-panel-body"
          :aria-label="messages.panelCollapse"
          :title="messages.panelCollapse"
          @click="setPanelCollapsed(true)"
        >
          <PanelRightClose :size="16" aria-hidden="true" />
        </button>
      </div>
      <NodeDetail
        v-if="tab === 'details'"
        :empty="messages.detailsEmpty"
        :panel-hint="messages.panelSelectedHint"
        :kind-label="messages.detailsKind"
        :path-label="messages.detailsPath"
        :span-label="messages.detailsSpan"
        :provenance-label="messages.nodeProvenanceLabel"
        :confidence-label="messages.detailsConfidence"
        :reason-label="messages.detailsReason"
        :internal-label="messages.detailsInternal"
        :weight-label="messages.detailsWeight"
        :import-kind-label="messages.detailsImportKind"
        :type-only-label="messages.detailsTypeOnly"
        :focus-label="messages.focusEnter"
        :recentre-label="messages.recentreLabel"
        :focus-tooltip="messages.focusTooltip"
        :recentre-tooltip="messages.recentreTooltip"
        :depth-label="messages.depthLabel"
        :depth-tooltip="messages.depthTooltip"
        :deps-out-label="messages.depsOutLabel"
        :deps-in-label="messages.depsInLabel"
        :findings-label="messages.findingsLabel"
        :findings-section-label="messages.findingsSectionLabel"
        :purpose-label="messages.purposeLabel"
        :symbols-label="messages.symbolsLabel"
        :imports-label="messages.importsLabel"
        :importers-label="messages.importersLabel"
        :contents-label="messages.contentsLabel"
        :expand-contents-label="messages.expandContentsLabel"
        :expand-tooltip="messages.expandTooltip"
        :no-findings-label="messages.noFindingsLabel"
        :no-findings-need-scan="messages.noFindingsNeedScan"
        :has-scan-report="hasScanReport"
        :no-issues-stat="messages.noIssuesStat"
        :summary-loading="messages.summaryLoading"
        :summary-error="messages.summaryError"
        :summary-retry="messages.summaryRetry"
        :summary-empty="messages.summaryEmpty"
        :empty-imports="messages.emptyImports"
        :empty-importers="messages.emptyImporters"
        :empty-symbols="messages.emptySymbols"
        :empty-contents="messages.emptyContents"
        :open-details-label="messages.openDetailsLabel"
        :kind-tag-folder="messages.kindTagFolder"
        :kind-tag-file="messages.kindTagFile"
        :symbol-export-tag="messages.symbolExportTag"
        :symbol-export-tooltip="messages.symbolExportTooltip"
        :symbols-hint="canOpenFiles ? messages.symbolsHintOpen : messages.symbolsHint"
        :symbol-line="messages.symbolLine"
        :symbol-open-tooltip="messages.symbolOpenTooltip"
        :symbol-kind-labels="messages.symbolKindLabels"
        :symbol-kind-count-labels="messages.symbolKindCountLabels"
        :show-all-symbols-label="messages.showAllSymbols"
        :can-open-symbols="canOpenFiles"
        @open-symbol="onOpenSymbol"
        :summary-state="fileSummaryStatus"
        :severity-label="reportMessages.severityLabel"
        :detail="detail"
        :sections="nodeDetailSections"
        :findings="panelFindings"
        @focus="enterFocus"
        @recentre="onRecentreDetail"
        @navigate="onNavigateDetail"
        @expand-child="onExpandChildDetail"
        @retry-summary="retryFileSummary"
      />
      <CoveragePanel
        v-else-if="tab === 'coverage'"
        :coverage="graph?.coverage ?? null"
        :none="format(messages.coverageNone, { cli: BRAND.cliName })"
        :bar="graph ? format(messages.coverageBar, { parsed: numbers.format(graph.coverage.files.parsed), partial: numbers.format(graph.coverage.files.partial), skipped: numbers.format(graph.coverage.files.skipped), total: numbers.format(graph.coverage.files.discovered) }) : ''"
        :banner="coverageBanner"
        :full="graph && !coverageBanner ? format(messages.coverageFull, { n: numbers.format(graph.coverage.files.discovered) }) : ''"
        :honesty="messages.coverageHonesty"
        :skipped-note="messages.coverageSkippedNote"
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
      </div>
    </aside>

    <footer class="status" role="contentinfo">
      <span class="status-radial">{{ radialStatus }}</span>
      <span class="status-edges" data-testid="edge-style-legend">
        <span class="edge-key"><i class="edge-key__line edge-key__line--extracted" aria-hidden="true"></i>{{ messages.provExtracted }}</span>
        <span class="edge-key"><i class="edge-key__line edge-key__line--inferred" aria-hidden="true"></i>{{ messages.provInferred }}</span>
        <span class="edge-key"><i class="edge-key__line edge-key__line--unresolved" aria-hidden="true"></i>{{ messages.provUnresolved }}</span>
      </span>
      <!-- G4d: the footer key uses the same icons as the node discs, so severity never reads by colour alone. -->
      <span v-if="severityLegend.length > 0" class="status-severity" data-testid="severity-colour-legend">
        <span v-for="sev in severityLegend" :key="sev" class="sev-key"><OctagonAlert v-if="sev === 'critical'" class="sev-key__icon" :size="12" :stroke-width="2.5" :style="{ color: `var(--sev-${sev}-fg)` }" aria-hidden="true" /><TriangleAlert v-else-if="sev === 'high'" class="sev-key__icon" :size="12" :stroke-width="2.5" :style="{ color: `var(--sev-${sev}-fg)` }" aria-hidden="true" /><CircleAlert v-else-if="sev === 'medium'" class="sev-key__icon" :size="12" :stroke-width="2.5" :style="{ color: `var(--sev-${sev}-fg)` }" aria-hidden="true" /><Info v-else class="sev-key__icon" :size="12" :stroke-width="2.5" :style="{ color: `var(--sev-${sev}-fg)` }" aria-hidden="true" />{{ SEVERITY_LABELS[sev] }}</span>
      </span>
      <span v-if="sample" class="pill">{{ messages.samplePill }}</span>
      <span class="status-pan">{{ panStatus }}</span>
      <BudgetMeter
        class="status-budget"
        :text="format(meterTone === 'limit' ? messages.budgetCapped : messages.budgetMeter, { nodes: numbers.format(overview?.nodes.length ?? 0), nodeBudget: numbers.format(HARD_NODE_CAP), edges: numbers.format(overview?.edges.length ?? 0), edgeBudget: numbers.format(HARD_EDGE_CAP) })"
        :ratio="ratio"
        :warn="meterTone === 'detail'"
        :full="meterTone === 'limit'"
        :tone="meterTone"
        :near-label="messages.budgetNear"
        :detail-label="messages.budgetDetail"
        :full-label="messages.budgetFull"
        :limit-label="messages.budgetLimit"
        :hidden-label="overview && overview.hiddenNodes > 0 ? format(messages.budgetHidden, { n: numbers.format(overview.hiddenNodes) }) : ''"
      />
      <button v-if="!embedded" type="button" @click="tab = 'coverage'; inspectorOpen = true">{{ format(messages.statusCoverage, { pct: numbers.format(parsedPct) }) }}</button>
      <button v-if="!embedded" type="button" @click="tab = 'drift'; inspectorOpen = true">{{ messages.driftNotConfigured }}</button>
    </footer>

    <SearchPalette
      v-if="palette"
      :label="messages.search"
      :placeholder="messages.searchPlaceholder"
      :none="format(messages.searchNone, { q: query })"
      :hint="messages.searchHint"
      :more="format(messages.searchMore, { n: numbers.format(Math.max(search.total - search.hits.length, 0)) })"
      :footer="messages.searchFooter"
      :clusters-label="messages.searchClusters"
      :files-label="messages.searchFiles"
      :symbols-label="messages.searchSymbols"
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
    <ToastStack />
  </div>
</template>

<style scoped>
.viewer.viewer-radial {
  display: block;
  position: relative;
  overflow: hidden;
  /* clip, not just hide: focus / scrollIntoView must never scroll the app shell and shift the graph. */
  overflow: clip;
  isolation: isolate;
  block-size: 100vh;
  background:
    radial-gradient(60% 70% at 50% 48%, color-mix(in srgb, var(--color-brand-navy) 42%, transparent) 0%, transparent 72%),
    var(--color-canvas-vignette),
    var(--color-canvas);
  color: var(--color-text-primary);
  font-feature-settings: var(--font-feature-ui);
}
.viewer.viewer-radial.viewer-embedded {
  block-size: 100%;
  min-block-size: 0;
}
.viewer.viewer-radial:not(.viewer-embedded) {
  display: grid;
  grid-template-rows: var(--viewer-topbar-height) minmax(0, 1fr) var(--viewer-statusbar-height);
}
.viewer.viewer-radial .stage {
  position: relative;
  display: flex;
  flex-direction: column;
  min-inline-size: 0;
  min-block-size: 0;
  block-size: 100%;
}
.viewer.viewer-radial:not(.viewer-embedded) .stage {
  grid-row: 2;
}
.viewer.viewer-radial.viewer-embedded .stage {
  position: absolute;
  inset: 0;
  padding-block-end: var(--viewer-statusbar-height);
}
.viewer.viewer-radial .rail,
.viewer.viewer-radial .inspector {
  position: absolute;
  z-index: var(--z-viewer-drawer);
  inset-block: 0;
  overflow: auto;
  padding: var(--space-3);
  /* Navy-tinted drawer in dark; light theme overrides --viewer-drawer-bg (graph-surface.css). */
  background: var(--viewer-drawer-bg, color-mix(in srgb, var(--color-brand-navy) 18%, var(--color-surface) 82%));
  backdrop-filter: blur(10px);
  transition: transform var(--dur-2) var(--easing-standard);
}
.viewer.viewer-radial .rail {
  inset-inline-start: 0;
  inline-size: min(var(--viewer-rail-width), 88vw);
  border-inline-end: 1px solid var(--color-border);
  transform: translateX(-110%);
}
.viewer.viewer-radial {
  --viewer-panel-w: min(var(--viewer-inspector-width), 92vw);
}
.viewer.viewer-radial.is-panel-collapsed {
  --viewer-panel-w: 3rem;
}
.viewer.viewer-radial .inspector {
  inset-inline-end: 0;
  inline-size: var(--viewer-panel-w);
  border-inline-start: 1px solid var(--color-border);
  transform: translateX(110%);
}
.viewer.viewer-radial .rail.is-open,
.viewer.viewer-radial .inspector.is-open {
  transform: none;
}
/* The open drawer overlays the stage: move the zoom controls beside it so they stay usable,
   and tell the floating toolbar how much of the right edge is covered so it centres left of it. */
.viewer.viewer-radial.is-inspector-open {
  --graph-controls-inset-end: calc(var(--viewer-panel-w) + var(--space-3));
}
.viewer.viewer-radial.is-inspector-open :deep(.vue-flow__panel.zoom) {
  margin-inline-end: calc(var(--viewer-panel-w) + var(--space-3));
  transition: margin var(--dur-2) var(--easing-standard);
}
@media (prefers-reduced-motion: reduce) {
  .viewer.viewer-radial.is-inspector-open :deep(.vue-flow__panel.zoom) { transition: none; }
}
.viewer.viewer-radial .status {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-3);
  padding-inline: var(--space-3);
  background: var(--color-surface);
  border-block-start: 1px solid var(--viewer-control-border, var(--color-border));
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
}
.viewer.viewer-radial.viewer-embedded .status {
  position: absolute;
  inset-inline: 0;
  inset-block-end: 0;
  block-size: var(--viewer-statusbar-height);
}
.viewer.viewer-radial:not(.viewer-embedded) .status {
  grid-row: 3;
}
.status-radial,
.status-edges, .status-severity { display: inline-flex; gap: var(--space-3); }
.sev-key { display: inline-flex; align-items: center; gap: var(--space-1); color: var(--color-text-secondary); white-space: nowrap; }
.sev-key__icon { flex-shrink: 0; }
/* Guide card sits above the footer (embedded stage pads for it) and is measured by the fit. */
.viewer.viewer-radial.viewer-embedded .coach { inset-block-end: calc(var(--viewer-statusbar-height) + var(--space-3)); }
.edge-key { display: inline-flex; align-items: center; gap: var(--space-1); }
.edge-key__line { display: inline-block; inline-size: 1.25rem; block-size: 0; border-block-start: 2px solid currentColor; }
.edge-key__line--inferred { border-block-start-style: dashed; }
.edge-key__line--unresolved { border-block-start-style: dotted; }
@media (max-width: 640px) {
  /* Phone footer wraps onto rows inside a real reserved height (stage pads for it; coach sits above it):
   * line legend, severity legend, then the node/edge meter. Ring summary and pan hint stay for screen readers. */
  .viewer.viewer-radial { --viewer-statusbar-height: 7.25rem; }
  .viewer.viewer-radial .status { flex-wrap: wrap; align-content: center; gap: var(--space-1) var(--space-3); padding-block: var(--space-1); overflow: hidden; }
  .status-edges, .status-severity { order: -1; flex-wrap: wrap; gap: var(--space-1) var(--space-3); }
  .viewer.viewer-radial .status-radial,
  .viewer.viewer-radial .status-pan { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
}
.status-edges,
.status-pan {
  color: var(--color-text-secondary);
  white-space: nowrap;
}
.status-budget {
  margin-inline-start: auto;
}
.viewer.viewer-radial .stage-legend {
  display: none;
}
/* The overview hint repeats the guide card; kept for assistive tech only so it never covers nodes. */
.graph-hint {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  margin: 0;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
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
.sr-only { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip: rect(0 0 0 0); }
button {
  min-block-size: var(--viewer-hit-target);
  padding-inline: var(--space-3);
  border: 1px solid var(--viewer-control-border, var(--color-border));
  border-radius: var(--radius-sm);
  background: var(--color-surface-raised);
  color: var(--color-text-primary);
}
button:hover:not(:disabled) { border-color: var(--graph-hover-border); }
button:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
button:active:not(:disabled) { transform: scale(0.98); }
button:disabled { opacity: var(--alpha-40); }
.inspector { font-size: var(--font-size-sm); line-height: var(--line-height-normal); }
.tab-count { font-variant-numeric: tabular-nums; }
.inspector-body { display: flex; flex-direction: column; gap: var(--space-3); }
.inspector-head { display: flex; align-items: center; gap: var(--space-1); }
.inspector-head .inspector-tabs { flex: 1 1 auto; min-inline-size: 0; }
.inspector-head [role='tab'] { flex: 1 1 auto; gap: 4px; padding: 0 6px; white-space: nowrap; overflow: hidden; }
.inspector-head [role='tab'] svg { flex-shrink: 0; }
.inspector-head [role='tab'][aria-selected='false'] { flex: 0 0 auto; }
/* Narrow panel: unselected tabs show icon (+ count); the label stays for screen readers and the tooltip. */
.inspector-head [role='tab'][aria-selected='false'] .tab-label {
  position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap;
}
.viewer.viewer-radial .inspector.is-collapsed { padding: var(--space-2) var(--space-1); overflow: visible; }
.rail-title { display: none; }
.inspector-rail { display: flex; flex-direction: column; align-items: center; gap: var(--space-1); }
.panel-toggle, .rail-tab {
  display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
  inline-size: 2rem; block-size: 2rem; padding: 0;
  border: 1px solid var(--color-border); border-radius: var(--r-sm);
  background: transparent; color: var(--color-text-secondary); cursor: pointer;
}
.rail-tab { border-color: transparent; }
.panel-toggle:hover, .rail-tab:hover { color: var(--color-text-primary); border-color: var(--color-brand-amber-ui); }
.panel-toggle:focus-visible, .rail-tab:focus-visible { outline: none; box-shadow: var(--focus-ring); }
/* Details / Coverage / Drift: one segmented control, icon + label. */
.inspector-tabs {
  display: flex;
  gap: 0;
  padding: 2px;
  border: 1px solid var(--color-border);
  border-radius: var(--r-sm);
  background: color-mix(in srgb, var(--color-brand-navy) 12%, transparent);
}
.inspector-tabs [role='tab'] {
  flex: 1 1 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-inline-size: 0;
  min-block-size: 2rem;
  padding: 0 var(--space-2);
  border: 1px solid transparent;
  border-radius: calc(var(--r-sm) - 2px);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--text-12);
  white-space: nowrap;
  cursor: pointer;
}
.inspector-tabs [role='tab'][aria-selected='true'] {
  border-color: color-mix(in srgb, var(--color-brand-amber-ui) 45%, var(--color-border));
  background: var(--color-surface-raised);
  color: var(--color-text-primary);
  font-weight: 600;
}
.inspector-tabs [role='tab']:focus-visible { outline: none; box-shadow: var(--focus-ring); }
.stage-legend {
  position: absolute;
  inset-inline-start: var(--space-3);
  inset-block-end: var(--space-3);
  z-index: var(--z-graph-controls);
  max-inline-size: 18rem;
  padding: var(--space-2);
  background: var(--color-surface-raised);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
}
.viewer { font-feature-settings: var(--font-feature-ui); }
@media (prefers-reduced-motion: reduce) {
  button:active:not(:disabled) { transform: none; }
}
.empty-graph, .loading { padding: var(--space-4); }
@media (max-width: 1000px) {
  .viewer { grid-template-columns: minmax(0, 1fr); }
  /* Standalone viewer only: drawers may pin to the viewport. Embedded graph stays absolute
     inside `.viewer` so the shell sidebar is never covered or clipped at the window edge. */
  .viewer.viewer-radial:not(.viewer-embedded) .rail,
  .viewer.viewer-radial:not(.viewer-embedded) .inspector {
    position: fixed;
    z-index: var(--z-viewer-drawer);
    inset-block: var(--viewer-topbar-height) var(--viewer-statusbar-height);
    inline-size: min(var(--viewer-rail-width), 88vw);
    transform: translateX(-110%);
  }
  .viewer.viewer-radial:not(.viewer-embedded) .inspector {
    inset-inline-start: auto;
    inset-inline-end: 0;
    inline-size: min(var(--viewer-inspector-width), 88vw);
    transform: translateX(110%);
  }
  .viewer.viewer-radial:not(.viewer-embedded) .inspector.is-collapsed { inline-size: 3rem; }
  .viewer.viewer-radial:not(.viewer-embedded) .rail.is-open,
  .viewer.viewer-radial:not(.viewer-embedded) .inspector.is-open {
    transform: none;
  }
}
@media (max-width: 640px) {
  .file, .search { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  /* Phone: the panel is a bottom sheet over a full-height graph. Collapsed = peek (handle, tab icons,
   * file name); expanded = half the pane. The toolbar and chip stay above it, uncovered. */
  .viewer.viewer-radial.is-inspector-open { --graph-controls-inset-end: 0px; }
  .viewer.viewer-radial.is-focusing { --viewer-toolbar-extra: 2.75rem; }
  .viewer.viewer-radial .inspector,
  .viewer.viewer-radial:not(.viewer-embedded) .inspector,
  .viewer.viewer-radial.viewer-embedded .inspector {
    inset-inline: 0;
    inset-block: auto 0;
    inline-size: 100%;
    block-size: min(52%, 30rem);
    padding-block-start: calc(var(--space-3) + 6px);
    border: 1px solid var(--color-border);
    border-block-end: 0;
    border-radius: 14px 14px 0 0;
    box-shadow: 0 -8px 24px color-mix(in srgb, #000 28%, transparent);
    transform: translateY(110%);
  }
  .viewer.viewer-radial .inspector.is-open { transform: none; }
  .viewer.viewer-radial .inspector::before {
    content: '';
    position: absolute;
    inset-block-start: 6px;
    inset-inline-start: 50%;
    inline-size: 2.25rem;
    block-size: 4px;
    border-radius: 999px;
    background: var(--color-border-strong, var(--color-border));
    transform: translateX(-50%);
  }
  .viewer.viewer-radial .inspector.is-collapsed { block-size: auto; overflow: hidden; padding: calc(var(--space-2) + 8px) var(--space-3) var(--space-2); }
  .inspector-rail { flex-direction: row; justify-content: flex-start; }
  .inspector-rail .rail-title {
    display: block; order: -1; flex: 1 1 auto; min-inline-size: 0;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    font-weight: 600; font-size: var(--text-14, 14px); color: var(--color-text-primary);
  }
  /* Panel-right icons read as "sheet up / down" once turned a quarter. */
  [data-testid='panel-toggle'] svg { transform: rotate(90deg); }
  .viewer.viewer-radial:not(.viewer-embedded) .inspector.is-collapsed { inline-size: 100%; }
  .viewer.viewer-radial.is-inspector-open :deep(.file-list) { visibility: hidden; }
  /* The sheet takes the footer's place; its legend returns when the panel closes. */
  .viewer.viewer-radial.is-inspector-open .status { visibility: hidden; }
  /* Expanded sheet: zoom pad and tips would sit under it; pinch zoom still works. Peek keeps them above. */
  .viewer.viewer-radial.is-inspector-open:not(.is-panel-collapsed) :deep(.vue-flow__panel.zoom),
  .viewer.viewer-radial.is-inspector-open:not(.is-panel-collapsed) .coach { visibility: hidden; }
  .viewer.viewer-radial.is-inspector-open.is-panel-collapsed :deep(.vue-flow__panel.zoom) { margin-inline-end: var(--space-3); margin-block-end: 4.5rem; }
}
</style>



















