<script setup lang="ts">
/**
 * ReportGraph - the Graph tab. Embeds the dashboard graph (ScanGraphView) lazily, so the Summary
 * never pays for the graph code, and degrades to a clear error with Retry if the graph is not available.
 */
import { defineAsyncComponent } from 'vue'
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

defineProps<{
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
</script>

<template>
  <div class="report-graph">
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
.report-graph__embed,
.report-graph__skeleton {
  min-block-size: 32rem;
}
</style>
