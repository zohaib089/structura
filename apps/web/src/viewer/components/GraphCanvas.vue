<script setup lang="ts">
import { VueFlow, type Edge, type Node } from '@vue-flow/core'
import { nextTick, ref } from 'vue'
import { FLOW_EDGE_TYPE, FLOW_NODE_TYPE } from '../caps'
import type { OverviewEdgeModel, OverviewNodeModel } from '../overview'
import FitFrame from './FitFrame.vue'
import OverviewEdge from './OverviewEdge.vue'
import OverviewNode from './OverviewNode.vue'
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
}>()

const emit = defineEmits<{
  select: [id: string]
  toggle: [id: string]
  selectEdge: [id: string]
  ready: []
  zoom: [action: 'in' | 'out' | 'fit']
}>()

const root = ref<HTMLElement | null>(null)

const flowNodes = () => props.nodes.map((node): Node<OverviewNodeModel> => ({
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

const flowEdges = () => props.edges.map((edge): Edge<OverviewEdgeModel> => ({
  id: edge.id,
  type: FLOW_EDGE_TYPE,
  source: edge.source,
  target: edge.target,
  selectable: true,
  deletable: false,
  focusable: false,
  data: edge,
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
  emit('ready')
}

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
    :data-ready="ready ? 'true' : 'false'"
    :data-total-nodes="totalNodes"
    :data-total-edges="totalEdges"
    :data-visible-nodes="nodes.length"
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
    >
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
          :dimmed="Boolean(nodeProps.data?.dimmed)"
          :tab-index="activeId === nodeProps.id ? 0 : -1"
          :path="nodeProps.data?.path ?? ''"
          :more-label="moreLabel(nodeProps.data?.remainder ?? 0)"
          :expand-label="expandLabel"
          :collapse-label="collapseLabel"
          @select="emit('select', nodeProps.id)"
          @toggle="emit('toggle', nodeProps.id)"
        />
      </template>
      <template #edge-overview="edgeProps">
        <OverviewEdge v-bind="edgeProps" />
      </template>
      <FitFrame :signature="nodes.map((node) => node.id).join('\n')" />
      <ZoomPad :zoom-in="zoomIn" :zoom-out="zoomOut" :zoom-fit="zoomFit" />
    </VueFlow>
  </div>
</template>

<style scoped>
.canvas { position: relative; flex: 1; block-size: 100%; min-block-size: 0; direction: ltr; }
.canvas :deep(.vue-flow) { block-size: 100%; background: var(--color-canvas); }
.canvas :deep(.vue-flow__attribution) { display: none; }
.canvas :deep(.vue-flow__handle) { opacity: 0; }
</style>
