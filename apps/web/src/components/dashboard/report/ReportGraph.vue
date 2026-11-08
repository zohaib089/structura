<script setup lang="ts">
/**
 * ReportGraph - the Graph tab. Embeds the dashboard graph (ScanGraphView) lazily, so the Summary
 * never pays for the graph code, and degrades to a clear error with Retry if the graph is not available.
 */
import { defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ReportFinding } from '../../../api/scan-report-types'
import type { ScanReportMessages } from '../../../services/scan-report-messages'
import type { SeverityCounts } from '../../../services/scan-report-tree'
import type { GraphDocument } from '../../../viewer/graph-types'
import ErrorState from '../../ui/ErrorState.vue'
import SkeletonGraph from '../../ui/skeleton/SkeletonGraph.vue'

const ScanGraphView = defineAsyncComponent({
  loader: () => import('../../../views/dashboard/ScanGraphView.vue'),
  loadingComponent: SkeletonGraph
})



const props = defineProps<{
  workspaceId: string
  projectId: string
  scanId: string
  graph: GraphDocument | null
  graphLoading: boolean
  pathSeverityCounts: Map<string, SeverityCounts>
  findings: ReportFinding[]
  messages: ScanReportMessages
}>()

const emit = defineEmits<{ retry: [] }>()

/**
 * Phones: the report header and tabs take most of the first screen, so the graph would get a sliver.
 * Measure the real scroll container after mount and give the graph its full visible height, then bring
 * it into view once. Desktop keeps the flex fill layout untouched.
 */
const root = ref<HTMLElement | null>(null)
const phoneHeight = ref<number | null>(null)
const NARROW = '(max-width: 640px)'

function scrollParent(el: HTMLElement): HTMLElement | null {
  let node = el.parentElement
  while (node) {
    const overflow = getComputedStyle(node).overflowY
    if ((overflow === 'auto' || overflow === 'scroll') && node.clientHeight > 0) return node
    node = node.parentElement
  }
  return null
}

function measure(): HTMLElement | null {
  const el = root.value
  if (!el || typeof window.matchMedia !== 'function' || !window.matchMedia(NARROW).matches) {
    phoneHeight.value = null
    return null
  }
  const scroller = scrollParent(el)
  const style = scroller ? getComputedStyle(scroller) : null
  const inset = style ? parseFloat(style.paddingBottom) || 0 : 0
  const visible = (scroller ? scroller.clientHeight : window.innerHeight) - inset
  phoneHeight.value = Math.max(320, Math.round(visible))
  return scroller
}

const tailSpace = ref(0)

async function fitToScreen() {
  const scroller = measure()
  if (phoneHeight.value === null || !root.value) return
  await nextTick()
  await new Promise<void>((done) => requestAnimationFrame(() => done()))
  const el = root.value
  if (!el) return
    const top = scroller
    ? el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop
    : el.getBoundingClientRect().top + window.scrollY
  const target = scroller ?? document.scrollingElement
  target?.scrollTo?.({ top, behavior: 'instant' as ScrollBehavior })
  // Short pages cannot scroll the graph flush to the top, leaving a half-cropped header above it.
  // Reserve exactly the missing distance below the graph and scroll again.
  await new Promise<void>((done) => requestAnimationFrame(() => done()))
  const gap = scroller ? el.getBoundingClientRect().top - scroller.getBoundingClientRect().top : el.getBoundingClientRect().top
  if (gap > 1) {
    tailSpace.value = Math.ceil(gap)
    await nextTick()
    target?.scrollTo?.({ top, behavior: 'instant' as ScrollBehavior })
  }
}

onMounted(() => {
  void fitToScreen()
  window.addEventListener('resize', measure)
})
onBeforeUnmount(() => window.removeEventListener('resize', measure))
watch(() => props.graph, (graph) => { if (graph) void fitToScreen() })
</script>

<template>
  <div ref="root" class="report-graph" data-testid="report-graph" :style="phoneHeight ? { boxSizing: 'border-box', blockSize: `${phoneHeight + tailSpace}px`, minBlockSize: `${phoneHeight + tailSpace}px`, flex: '0 0 auto', paddingBlockEnd: tailSpace ? `${tailSpace}px` : undefined } : undefined">
    <SkeletonGraph v-if="graphLoading" class="report-graph__skeleton" :label="messages.graphLoadingLabel" />
    <ErrorState
      v-else-if="!graph"
      :title="messages.graphUnavailableTitle"
      :message="messages.graphUnavailableBody"
      :retry-label="messages.graphRetry"
      @retry="emit('retry')"
    />
    <ScanGraphView
      v-else
      class="report-graph__embed"
      :workspace-id="workspaceId"
      :project-id="projectId"
      :scan-id="scanId"
      :prefetched-graph="graph"
      :path-severity-counts="pathSeverityCounts"
      :scan-findings="findings"
    />
  </div>
</template>

<style scoped>
.report-graph {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-block-size: 0;
  block-size: 100%;
}

.report-graph__embed,
.report-graph__skeleton {
  flex: 1 1 auto;
  min-block-size: 28rem;
  block-size: 100%;
}
</style>
