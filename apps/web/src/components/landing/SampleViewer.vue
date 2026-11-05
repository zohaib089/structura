<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import GraphCanvas from '../../viewer/components/GraphCanvas.vue'
import { formatMessage, viewerMessages } from '../../viewer/messages'
import { fitDurationMs, prefersReducedMotion } from '../../viewer/motion'
import {
  buildOverview,
  collapseView,
  defaultFilters,
  emptyViewState,
  expandRadialRing,
  expandView,
  focusHits,
  indexGraph,
  pinPath,
  setNucleus,
  type FocusQuery,
  type ViewState
} from '../../viewer/overview'
import { sampleGraph } from '../../viewer/sample-graph'

defineProps<{ alt: string; samplePill: string }>()

const copy = viewerMessages('en')
const index = indexGraph(sampleGraph)
const focusTarget = 'file:apps/web/main.ts'
const focusQuery: FocusQuery = { nodeId: focusTarget, direction: 'both', depth: 1, confirmedOnly: false }
const reduced = prefersReducedMotion()
const stopped = ref(false)
const selectedId = ref<string | null>(reduced ? focusTarget : null)
const focus = ref<FocusQuery | null>(reduced ? focusQuery : null)
const state = ref<ViewState>(
  reduced ? setNucleus(pinPath(index, emptyViewState(), focusTarget), focusTarget) : setNucleus(emptyViewState(), focusTarget)
)

const focusMembers = computed(() => {
  if (!focus.value) return null
  const hits = focusHits(index, focus.value)
  return new Set([focus.value.nodeId, ...hits.confirmed, ...hits.possible])
})

const view = computed(() => buildOverview(index, state.value, defaultFilters(), focusMembers.value))
const ringCount = computed(() => {
  let max = 0
  for (const node of view.value.nodes) max = Math.max(max, node.depth)
  return max
})
const focusIds = computed(() => (focusMembers.value ? [...focusMembers.value] : []))

let timers: number[] = []

function stop() {
  stopped.value = true
  for (const timer of timers) window.clearTimeout(timer)
  timers = []
}

function onToggle(id: string) {
  stop()
  const node = view.value.nodes.find((item) => item.id === id)
  if (node?.more) {
    state.value = expandView(state.value, id)
    return
  }
  if (node?.cluster) {
    state.value = node.expanded ? collapseView(index, state.value, id) : expandView(state.value, id)
    return
  }
  state.value = expandRadialRing(state.value)
}

onMounted(() => {
  if (reduced || stopped.value) return
  timers.push(window.setTimeout(() => {
    if (stopped.value) return
    state.value = expandRadialRing(state.value)
  }, 700))
  timers.push(window.setTimeout(() => {
    if (stopped.value) return
    state.value = pinPath(index, state.value, focusTarget)
    focus.value = focusQuery
    selectedId.value = focusTarget
  }, 1600))
})

onBeforeUnmount(() => {
  stop()
})
</script>

<template>
  <figure class="sample" @pointerdown="stop" @keydown="stop" @wheel="stop">
    <figcaption>
      <span class="pill">{{ samplePill }}</span>
      <span class="alt">{{ alt }}</span>
    </figcaption>
    <div class="frame">
      <GraphCanvas
        :nodes="view.nodes"
        :edges="view.edges"
        :positions="view.positions"
        :total-nodes="sampleGraph.summary.nodes"
        :total-edges="sampleGraph.summary.edges"
        :cluster-count="view.nodes.filter((node) => node.cluster).length"
        ready
        :label="copy.graphLabel"
        :selected-id="selectedId"
        :active-id="selectedId ?? view.nodes[0]?.id ?? null"
        :nucleus-id="focusTarget"
        :ring-count="ringCount"
        :more-label="(count) => formatMessage(copy.moreNode, { n: count })"
        :expand-label="copy.expand"
        :collapse-label="copy.collapse"
        :zoom-in="copy.zoomIn"
        :zoom-out="copy.zoomOut"
        :zoom-fit="copy.zoomFit"
        :focus-ids="focusIds"
        :fit-duration="focus ? fitDurationMs() : 0"
        :fit-padding="focus ? 0.25 : 0.2"
        @select="selectedId = $event; stop()"
        @toggle="onToggle"
      />
    </div>
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

.frame {
  block-size: 28rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-2xl);
  overflow: hidden;
  background: var(--color-canvas);
  box-shadow: var(--shadow-lg);
}

.frame :deep(.canvas),
.frame :deep(.vue-flow) {
  block-size: 100%;
  min-block-size: 100%;
}
</style>
