<script setup lang="ts">
import { computed, ref } from 'vue'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import GraphCanvas from '../../viewer/components/GraphCanvas.vue'
import { formatMessage, viewerMessages } from '../../viewer/messages'
import { buildOverview, collapseView, defaultFilters, emptyViewState, expandView, indexGraph, layoutNodes } from '../../viewer/overview'
import { sampleGraph } from '../../viewer/sample-graph'

defineProps<{ alt: string; samplePill: string }>()

const copy = viewerMessages('en')
const index = indexGraph(sampleGraph)
const state = ref(emptyViewState())
const selectedId = ref<string | null>(null)
const view = computed(() => buildOverview(index, state.value, defaultFilters()))
const positions = computed(() => layoutNodes(view.value.nodes))

function onToggle(id: string) {
  const node = view.value.nodes.find((item) => item.id === id)
  if (!node?.cluster && !node?.more) return
  state.value = node.expanded
    ? collapseView(index, state.value, id)
    : expandView(state.value, id)
}
</script>

<template>
  <figure class="sample">
    <figcaption>
      <span class="pill">{{ samplePill }}</span>
      <span class="alt">{{ alt }}</span>
    </figcaption>
    <GraphCanvas
      :nodes="view.nodes"
      :edges="view.edges"
      :positions="positions"
      :total-nodes="sampleGraph.summary.nodes"
      :total-edges="sampleGraph.summary.edges"
      :cluster-count="view.nodes.filter((node) => node.cluster).length"
      ready
      :label="copy.graphLabel"
      :selected-id="selectedId"
      :active-id="selectedId ?? view.nodes[0]?.id ?? null"
      :more-label="(count) => formatMessage(copy.moreNode, { n: count })"
      :expand-label="copy.expand"
      :collapse-label="copy.collapse"
      :zoom-in="copy.zoomIn"
      :zoom-out="copy.zoomOut"
      :zoom-fit="copy.zoomFit"
      @select="selectedId = $event"
      @toggle="onToggle"
    />
  </figure>
</template>

<style scoped>
.sample {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-inline-size: 0;
  margin: 0;
}

figcaption {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: baseline;
}

.pill {
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-raised);
  font-size: var(--font-size-sm);
}

.alt {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.sample :deep(.canvas) {
  block-size: 28rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}
</style>
