<script setup lang="ts">
import { Background } from '@vue-flow/background'
import { VueFlow, type Edge, type Node } from '@vue-flow/core'
import { computed, nextTick, ref, watch } from 'vue'
import { FLOW_EDGE_TYPE, FLOW_NODE_TYPE } from '../caps'
import { motionMs, prefersReducedMotion } from '../motion'
import { discCentre, type OverviewEdgeModel, type OverviewNodeModel } from '../overview'
import type { SeverityCounts } from '../../services/scan-report-tree'
import { lookupPathSeverityCounts } from '../../services/scan-report-tree-display'
import FitFrame from './FitFrame.vue'
import OverviewEdge from './OverviewEdge.vue'
import LinearPill from './LinearPill.vue'
import OverviewNode from './OverviewNode.vue'
import RadialRingGuides from './RadialRingGuides.vue'
import ZoomPad from './ZoomPad.vue'
import '../graph-surface.css'

const props = defineProps<{
  nodes: OverviewNodeModel[]
  edges: OverviewEdgeModel[]
  positions: Map<string, { x: number; y: number }>
  totalNodes: number
  totalEdges: number
  clusterCount: number
  ready: boolean
  label: string
  selectedId: string | null
  activeId: string | null
  moreLabel: (count: number) => string
  expandLabel: string
  collapseLabel: string
  zoomIn: string
  zoomOut: string
  zoomFit: string
  focusIds?: string[]
  fitDuration?: number
  fitPadding?: number
  fitBump?: number
  pathSeverityCounts?: Map<string, SeverityCounts>
  nucleusId?: string | null
  ringCount?: number
  /** Exact layout radii (disc-centre); preferred over hypot of positions. */
  ringRadii?: number[]
  labelPlacements?: Map<string, import('../label-collision').LabelPlacement>
  showAllCross?: boolean
  entryTag?: string
  /** Back: viewport to put back instead of fitting. */
  restoreView?: { token: number; viewport: { x: number; y: number; zoom: number } | null } | null
  /** Expand / collapse: node to keep in place when the person had zoomed or panned. */
  keepView?: { token: number; id: string } | null
  /** Linear = two-sided columns; radial (default) = rings. */
  layout?: 'radial' | 'linear'
  /** Linear group pill caption, e.g. "{n} files". */
  groupLabel?: (count: number) => string
  plainMarks?: boolean
  reserveZoomPad?: boolean
  hideOverlappingRing1?: boolean
  insideOpenCaption?: string
  insideCloseCaption?: string
}>()

const hoverId = ref<string | null>(null)

const emit = defineEmits<{
  select: [id: string]
  toggle: [id: string]
  selectEdge: [id: string]
  ready: []
  zoom: [action: 'in' | 'out' | 'fit']
}>()

const root = ref<HTMLElement | null>(null)
const fitFrame = ref<InstanceType<typeof FitFrame> | null>(null)
const zoomPad = ref<InstanceType<typeof ZoomPad> | null>(null)

function getViewport() {
  return fitFrame.value?.getViewport() ?? null
}
function zoomBy(factor: number) {
  zoomPad.value?.zoomBy(factor)
}
function fitNow() {
  void fitFrame.value?.fit()
}
const entering = ref<Set<string>>(new Set())
const delays = ref<Map<string, number>>(new Map())
const canvasReady = ref(false)

function markCanvasReady() {
  if (canvasReady.value) return
  canvasReady.value = true
  emit('ready')
}

const displayReady = computed(
  () => canvasReady.value || props.ready || props.nodes.length > 0
)

/** Matches Vue Flow DOM node count (overview nodes + optional ring guide). */
const visibleFlowNodeCount = computed(() => {
  const guide = props.ringCount && props.ringCount > 0 ? 1 : 0
  return props.nodes.length + guide
})

watch(
  () => props.ready,
  ready => {
    if (ready) markCanvasReady()
  }
)

watch(() => props.nodes.map((node) => node.id).join('\n'), (next, prev) => {
  if (prev && next !== prev) canvasReady.value = false
  if (!prev || prefersReducedMotion()) {
    entering.value = new Set()
    return
  }
  const before = new Set(prev.split('\n'))
  const fresh = next.split('\n').filter((id) => id && !before.has(id))
  const stagger = motionMs('--graph-expand-stagger', 12, false)
  const cap = motionMs('--graph-expand-stagger-cap', 300, false)
  delays.value = new Map(fresh.map((id, index) => [id, Math.min(index * stagger, cap)]))
  entering.value = new Set(fresh)
  window.setTimeout(() => { entering.value = new Set() }, motionMs('--duration-slow', 400, false) + cap)
})

function severityCountsForPath(path: string): SeverityCounts | null {
  return lookupPathSeverityCounts(props.pathSeverityCounts, path)
}

function flowing(edge: OverviewEdgeModel): boolean {
  if (!props.focusIds || edge.visual === 'unresolved') return false
  const ids = new Set(props.focusIds)
  return ids.has(edge.source) && ids.has(edge.target)
}

/** Ring radii: prefer the layout's shared radii so guides sit under disc centres. */
const ringRadii = computed(() => {
  if (props.ringRadii && props.ringRadii.length > 0) return props.ringRadii
  const byDepth = new Map<number, number>()
  for (const node of props.nodes) {
    const depth = node.depth ?? 0
    if (depth <= 0) continue
    const at = props.positions.get(node.id)
    if (!at) continue
    // Top-left lies on the circle of radius R about the flow origin; guides use that R.
    byDepth.set(depth, Math.max(byDepth.get(depth) ?? 0, Math.round(Math.hypot(at.x, at.y))))
  }
  return [...byDepth.entries()].sort((a, b) => a[0] - b[0]).map(([, radius]) => radius)
})

const flowNodes = () => {
  const guide =
    props.ringCount && props.ringCount > 0
      ? [{
          id: '__radial-guides__',
          type: 'radial-guides',
          position: { x: 0, y: 0 },
          draggable: false,
          selectable: false,
          connectable: false,
          focusable: false,
          deletable: false,
          data: { ringCount: props.ringCount, radii: ringRadii.value }
        } satisfies Node]
      : []
  return [
    ...guide,
    ...props.nodes.map((node): Node<OverviewNodeModel> => ({
  id: node.id,
  type: props.layout === 'linear' ? 'linear' : FLOW_NODE_TYPE,
  position: props.positions.get(node.id) ?? { x: 0, y: 0 },
  draggable: false,
  selectable: true,
  connectable: false,
  focusable: false,
  deletable: false,
  data: node,
      ariaLabel: node.more ? props.moreLabel(node.remainder) : node.label,
      domAttributes: {
        'data-node-id': node.id,
        'data-node-kind': node.kind,
        'data-depth': String(node.depth ?? 0),
        ...(node.cluster
          ? { 'data-cluster-size': String(node.clusterSize), 'data-expanded': node.expanded ? 'true' : 'false' }
          : {}),
        ...(node.more ? { 'data-testid': 'expand-more' } : {})
      } as Node['domAttributes']
    }))
  ]
}

const radialCentre = computed(() => discCentre(props.positions.get(props.nucleusId ?? '')))

const flowEdges = () => props.edges.map((edge): Edge<OverviewEdgeModel> => ({
  id: edge.id,
  type: FLOW_EDGE_TYPE,
  source: edge.source,
  target: edge.target,
  selectable: true,
  deletable: false,
  focusable: false,
  data: {
    ...edge,
    flowing: flowing(edge),
    sourceDisc: discCentre(props.positions.get(edge.source)),
    targetDisc: discCentre(props.positions.get(edge.target)),
    radialCentre: radialCentre.value,
    emphasized: Boolean(
      (props.selectedId && (edge.source === props.selectedId || edge.target === props.selectedId)) ||
      (hoverId.value && (edge.source === hoverId.value || edge.target === hoverId.value))
    ),
    showAllCross: Boolean(props.showAllCross)
  },
  label: edge.label,
      domAttributes: {
        'data-provenance': edge.provenance,
        'data-resolved': edge.resolved ? 'true' : 'false',
        'data-weight': String(edge.weight)
      } as Edge['domAttributes']
    }))

function onNodeClick(payload: { node: { id: string } }) {
  emit('select', payload.node.id)
}
function onNodeEnter(payload: { node: { id: string } }) {
  hoverId.value = payload.node.id
}
function onNodeLeave() {
  hoverId.value = null
}

function onEdgeClick(payload: { edge: { id: string } }) {
  emit('selectEdge', payload.edge.id)
}

async function onInit() {
  await nextTick()
  markCanvasReady()
}

watch(
  () => props.nodes.length,
  async count => {
    if (count > 0) {
      await nextTick()
      markCanvasReady()
    }
  },
  { immediate: true }
)

defineExpose({ root, getViewport, zoomBy, fitNow })
</script>

<template>
  <div
    id="graph-canvas"
    ref="root"
    class="canvas graph-surface"
    data-testid="graph-canvas"
    role="application"
    :aria-label="label"
    tabindex="-1"
    dir="ltr"
    :data-ready="displayReady ? 'true' : 'false'"
    :data-layout="layout ?? 'radial'"
    :data-total-nodes="totalNodes"
    :data-total-edges="totalEdges"
    :data-visible-nodes="visibleFlowNodeCount"
    :data-visible-edges="edges.length"
    :data-aggregated-clusters="clusterCount"
  >
    <VueFlow
      :nodes="flowNodes()"
      :edges="flowEdges()"
      :nodes-connectable="false"
      :nodes-draggable="false"
      :elements-selectable="true"
      :delete-key-code="null"
      :only-render-visible-elements="false"
      :fit-view-on-init="false"
      :min-zoom="reserveZoomPad ? 0.05 : 0.1"
      :max-zoom="2.5"
      @nodes-initialized="onInit"
      @node-click="onNodeClick"
      @edge-click="onEdgeClick"
      @node-mouse-enter="onNodeEnter"
      @node-mouse-leave="onNodeLeave"
    >
      <template #node-radial-guides="guideProps">
        <RadialRingGuides
          :key="(guideProps.data?.radii ?? []).map((r: number) => Math.round(r)).join('-')"
          :ring-count="guideProps.data?.ringCount ?? 0"
          :radii="guideProps.data?.radii ?? []"
        />
      </template>
      <template #node-overview="nodeProps">
        <OverviewNode
          :id="nodeProps.id"
          :label="nodeProps.data?.label ?? ''"
          :kind="nodeProps.data?.kind ?? ''"
          :cluster="Boolean(nodeProps.data?.cluster)"
          :cluster-size="nodeProps.data?.clusterSize ?? 0"
          :expanded="Boolean(nodeProps.data?.expanded)"
          :more="Boolean(nodeProps.data?.more)"
          :remainder="nodeProps.data?.remainder ?? 0"
          :selected="selectedId === nodeProps.id"
          :nucleus="nucleusId === nodeProps.id"
          :dimmed="Boolean(nodeProps.data?.dimmed)"
          :tab-index="activeId === nodeProps.id ? 0 : -1"
          :path="nodeProps.data?.path ?? ''"
          :depth="nodeProps.data?.depth ?? 0"
          :language="nodeProps.data?.language ?? ''"
          :entering="entering.has(nodeProps.id)"
          :enter-delay="delays.get(nodeProps.id) ?? 0"
          :more-label="moreLabel(nodeProps.data?.remainder ?? 0)"
          :expand-label="expandLabel"
          :collapse-label="collapseLabel"
          :severity-counts="severityCountsForPath(nodeProps.data?.path ?? '')"
          :label-side="labelPlacements?.get(nodeProps.id)?.side ?? ((positions.get(nodeProps.id)?.x ?? 0) < -1 ? 'start' : 'end')"
          :display-label="labelPlacements?.get(nodeProps.id)?.displayLabel"
          :entry-tag="entryTag"
          :plain-marks="plainMarks"
          :role-caption="nodeProps.data?.roleCaption"
          :child-count="nodeProps.data?.childCount"
          :inside-open-caption="insideOpenCaption"
          :inside-close-caption="insideCloseCaption"
          @select="emit('select', nodeProps.id)"
          @toggle="emit('toggle', nodeProps.id)"
        />
      </template>
      <template #node-linear="pillProps">
        <LinearPill
          :id="pillProps.id"
          :label="pillProps.data?.label ?? ''"
          :path="pillProps.data?.path ?? ''"
          :kind="pillProps.data?.kind ?? ''"
          :cluster="Boolean(pillProps.data?.cluster)"
          :cluster-size="pillProps.data?.clusterSize ?? 0"
          :expanded="Boolean(pillProps.data?.expanded)"
          :more="Boolean(pillProps.data?.more)"
          :remainder="pillProps.data?.remainder ?? 0"
          :selected="selectedId === pillProps.id"
          :nucleus="nucleusId === pillProps.id"
          :dimmed="Boolean(pillProps.data?.dimmed)"
          :tab-index="activeId === pillProps.id ? 0 : -1"
          :more-label="moreLabel(pillProps.data?.remainder ?? 0)"
          :group-label="groupLabel ? groupLabel(pillProps.data?.clusterSize ?? 0) : String(pillProps.data?.clusterSize ?? 0)"
          @select="emit('select', pillProps.id)"
          @toggle="emit('toggle', pillProps.id)"
        />
      </template>
      <template #edge-overview="edgeProps">
        <OverviewEdge v-bind="edgeProps" />
      </template>
      <Background variant="dots" :gap="24" :size="1" color="var(--graph-dot)" />
      <div class="vignette" aria-hidden="true"></div>
      <FitFrame
        ref="fitFrame"
        :restore="restoreView ?? null"
        :keep-view="keepView ?? null"
        :signature="`${layout ?? 'radial'}|${fitBump ?? 0}|${nodes.map((node) => node.id).join('\n')}|${(focusIds ?? []).join(',')}`"
        :duration="fitDuration ?? 0"
        :padding="fitPadding ?? 0.2"
        :ring-count="ringCount ?? 0"
        :focus-ids="focusIds ?? []"
        :reserve-zoom-pad="reserveZoomPad"
        :hide-overlapping-ring1="hideOverlappingRing1"
      />
      <ZoomPad ref="zoomPad" :zoom-in="zoomIn" :zoom-out="zoomOut" :zoom-fit="zoomFit" :fit="fitNow" />
    </VueFlow>
  </div>
</template>

<style scoped>
.canvas { position: relative; flex: 1; block-size: 100%; min-block-size: 0; direction: ltr; }
.canvas {
  /* Navy Nucleus surface painted by the canvas itself, so Vue Flow never covers it. */
  background:
    radial-gradient(62% 72% at 50% 48%, #16305a 0%, #10213f 38%, #0b1628 72%, #090f1b 100%);
}
.canvas :deep(.vue-flow),
.canvas :deep(.vue-flow__background) { block-size: 100%; background: transparent; }
.canvas :deep(.vue-flow__attribution) { display: none; }
.canvas :deep(.vue-flow__node[data-id="__radial-guides__"]) {
  pointer-events: none;
  z-index: 0 !important;
}
.canvas :deep(.vue-flow__handle) { opacity: 0; }
/* Linear: the hovered / focused pill (and its full-name tip) paints above its neighbours. */
.canvas[data-layout='linear'] :deep(.vue-flow__node:hover),
.canvas[data-layout='linear'] :deep(.vue-flow__node:focus-within) { z-index: 1000 !important; }
.canvas :deep(.vue-flow__edge-textbg) { fill: #0f1d36; }
.canvas :deep(.vue-flow__edge-text) { fill: var(--color-text-secondary); font-size: 11px; }
.vignette {
  position: absolute;
  inset: 0;
  z-index: var(--z-graph-controls);
  pointer-events: none;
  background: radial-gradient(ellipse at center, transparent 55%, rgba(5, 9, 16, 0.55) 100%);
}
</style>







