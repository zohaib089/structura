<script setup lang="ts">
import { Background } from '@vue-flow/background'
import { VueFlow, type Edge, type Node } from '@vue-flow/core'
import { computed, nextTick, ref, watch } from 'vue'
import { FLOW_EDGE_TYPE, FLOW_NODE_TYPE } from '../caps'
import { motionMs, prefersReducedMotion } from '../motion'
import type { OverviewEdgeModel, OverviewNodeModel } from '../overview'
import type { SeverityCounts } from '../../services/scan-report-tree'
import { lookupPathSeverityCounts } from '../../services/scan-report-tree-display'
import FitFrame from './FitFrame.vue'
import OverviewEdge from './OverviewEdge.vue'
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
  showAllCross?: boolean
  entryTag?: string
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

/** Ring radii as laid out: one radius per populated depth, measured from the ring centre (0,0). */
const ringRadii = computed(() => {
  const byDepth = new Map<number, number>()
  for (const node of props.nodes) {
    const depth = node.depth ?? 0
    if (depth <= 0) continue
    const at = props.positions.get(node.id)
    if (!at) continue
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
  type: FLOW_NODE_TYPE,
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
        ...(node.cluster
          ? { 'data-cluster-size': String(node.clusterSize), 'data-expanded': node.expanded ? 'true' : 'false' }
          : {}),
        ...(node.more ? { 'data-testid': 'expand-more' } : {})
      } as Node['domAttributes']
    }))
  ]
}

const radialCentre = computed(() => {
  // Match RadialRingGuides: rings are centred on the nucleus disc, not its top-left corner.
  const at = props.positions.get(props.nucleusId ?? '') ?? { x: 0, y: 0 }
  return { x: at.x + 12, y: at.y + 12 }
})

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

defineExpose({ root })
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
      :min-zoom="0.1"
      :max-zoom="2.5"
      @nodes-initialized="onInit"
      @node-click="onNodeClick"
      @edge-click="onEdgeClick"
      @node-mouse-enter="onNodeEnter"
      @node-mouse-leave="onNodeLeave"
    >
      <template #node-radial-guides="guideProps">
        <RadialRingGuides :ring-count="guideProps.data?.ringCount ?? 0" :radii="guideProps.data?.radii ?? []" />
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
          :label-side="(positions.get(nodeProps.id)?.x ?? 0) < -1 ? 'start' : 'end'"
          :entry-tag="entryTag"
          @select="emit('select', nodeProps.id)"
          @toggle="emit('toggle', nodeProps.id)"
        />
      </template>
      <template #edge-overview="edgeProps">
        <OverviewEdge v-bind="edgeProps" />
      </template>
      <Background variant="dots" :gap="24" :size="1" color="var(--graph-dot)" />
      <div class="vignette" aria-hidden="true"></div>
      <FitFrame
        :signature="`${fitBump ?? 0}|${nodes.map((node) => node.id).join('\n')}|${(focusIds ?? []).join(',')}`"
        :duration="fitDuration ?? 0"
        :padding="fitPadding ?? 0.2"
        :ring-count="ringCount ?? 0"
        :focus-ids="focusIds ?? []"
      />
      <ZoomPad :zoom-in="zoomIn" :zoom-out="zoomOut" :zoom-fit="zoomFit" />
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







