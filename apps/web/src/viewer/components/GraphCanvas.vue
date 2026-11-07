<script setup lang="ts">
import { VueFlow, type Edge, type Node } from '@vue-flow/core'
import { computed, nextTick, ref, watch } from 'vue'
import { nodeFrameSize, pathToNucleus } from '../../components/graph/radial-geometry'
import '../../components/graph/radial-graph.css'
import { FLOW_EDGE_TYPE, FLOW_NODE_TYPE } from '../caps'
import { motionMs, prefersReducedMotion } from '../motion'
import type { OverviewEdgeModel, OverviewNodeModel } from '../overview'
import type { SeverityCounts } from '../../services/scan-report-tree'
import { highestSeverity } from '../../services/scan-report-tree'

type RadialSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info'
import { lookupPathSeverityCounts } from '../../services/scan-report-tree-display'
import FitFrame from './FitFrame.vue'
import OverviewEdge from './OverviewEdge.vue'
import OverviewNode from './OverviewNode.vue'
import RadialRingGuides from './RadialRingGuides.vue'
import ZoomPad from './ZoomPad.vue'

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
}>()

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
const hoveredId = ref<string | null>(null)
const focusedId = ref<string | null>(null)

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

const focusDim = computed(() => props.nodes.some(node => node.dimmed))
const pointerId = computed(() => hoveredId.value ?? focusedId.value ?? props.selectedId)
const hot = computed(() => {
  if (focusDim.value) {
    return {
      nodeIds: new Set(props.nodes.filter(node => !node.dimmed).map(node => node.id)),
      edgeIds: new Set(props.edges.filter(edge => flowing(edge)).map(edge => edge.id)),
      dim: true
    }
  }
  if (!pointerId.value) return { nodeIds: new Set<string>(), edgeIds: new Set<string>(), dim: false }
  const path = pathToNucleus(pointerId.value, props.nodes, props.edges)
  return { nodeIds: path.nodeIds, edgeIds: path.edgeIds, dim: true }
})

function visualSeverity(node: OverviewNodeModel | undefined): RadialSeverity {
  if (!node || node.kind === 'unresolved' || node.more) return 'info'
  const counts = severityCountsForPath(node.path)
  return (counts && highestSeverity(counts)) || 'info'
}

function nodeDegrees(id: string): number {
  const point = props.positions.get(id)
  if (!point) return 0
  return (Math.atan2(point.y, point.x) * 180) / Math.PI
}

function flowing(edge: OverviewEdgeModel): boolean {
  if (!props.focusIds || edge.visual === 'unresolved') return false
  const ids = new Set(props.focusIds)
  return ids.has(edge.source) && ids.has(edge.target)
}

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
          data: { ringCount: props.ringCount },
          style: { width: '1px', height: '1px' }
        } satisfies Node]
      : []
  return [
    ...guide,
    ...props.nodes.map((node): Node<OverviewNodeModel> => {
      const center = props.positions.get(node.id) ?? { x: 0, y: 0 }
      const frame = nodeFrameSize(node.depth, props.nucleusId === node.id)
      return {
  id: node.id,
  type: FLOW_NODE_TYPE,
  position: { x: center.x - frame / 2, y: center.y - frame / 2 },
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
      } as Node['domAttributes'],
      style: { width: `${frame}px`, height: `${frame}px` }
    }
    })
  ]
}

const flowEdges = () => props.edges.map((edge): Edge<OverviewEdgeModel> => ({
  id: edge.id,
  type: FLOW_EDGE_TYPE,
  source: edge.source,
  target: edge.target,
  selectable: true,
  deletable: false,
  focusable: false,
  data: { ...edge, flowing: flowing(edge), hot: hot.value.edgeIds.has(edge.id) },
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
    class="canvas"
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
    :class="{ 'radial--dim': hot.dim }"
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
    >
      <template #node-radial-guides="guideProps">
        <RadialRingGuides :ring-count="guideProps.data?.ringCount ?? 0" />
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
          :severity="visualSeverity(nodeProps.data)"
          :hot="hot.nodeIds.has(nodeProps.id)"
          :deg="nodeDegrees(nodeProps.id)"
          @select="emit('select', nodeProps.id)"
          @toggle="emit('toggle', nodeProps.id)"
          @hover="hoveredId = nodeProps.id"
          @unhover="hoveredId = hoveredId === nodeProps.id ? null : hoveredId"
          @focus="focusedId = nodeProps.id"
          @blur="focusedId = focusedId === nodeProps.id ? null : focusedId"
        />
      </template>
      <template #edge-overview="edgeProps">
        <OverviewEdge v-bind="edgeProps" />
      </template>
      <FitFrame
        :signature="`${fitBump ?? 0}|${nodes.map((node) => node.id).join('\n')}|${(focusIds ?? []).join(',')}`"
        :duration="fitDuration ?? 0"
        :padding="fitPadding ?? 0.2"
      />
      <ZoomPad :zoom-in="zoomIn" :zoom-out="zoomOut" :zoom-fit="zoomFit" />
    </VueFlow>
  </div>
</template>

<style scoped>
.canvas { position: relative; flex: 1; block-size: 100%; min-block-size: 0; direction: ltr; }
.canvas :deep(.vue-flow) { block-size: 100%; background: transparent; }
.canvas :deep(.vue-flow__attribution) { display: none; }
.canvas :deep(.vue-flow__node-overview),
.canvas :deep(.vue-flow__node[data-id="__radial-guides__"]) {
  overflow: visible;
  background: transparent;
  border: 0;
  padding: 0;
}
.canvas :deep(.vue-flow__node[data-id="__radial-guides__"]) {
  pointer-events: none;
  z-index: 0 !important;
}
.canvas :deep(.vue-flow__handle) { opacity: 0; }
</style>







