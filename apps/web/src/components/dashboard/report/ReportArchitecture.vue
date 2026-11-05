<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import ErrorState from '../../ui/ErrorState.vue'
import SkeletonTableRows from '../../ui/skeleton/SkeletonTableRows.vue'
import type { GraphDocument } from '../../../viewer/graph-types'
import type { ScanReportMessages } from '../../../services/scan-report-messages'
import {
  architectureViolationCount,
  buildModuleRows,
  graphHasArchitectureConfig
} from '../../../services/scan-report-architecture'

const props = defineProps<{
  graph: GraphDocument | null
  messages: ScanReportMessages
  graphHref?: (path: string) => RouteLocationRaw
  graphLoading?: boolean
  graphError?: boolean
}>()

const emit = defineEmits<{ retryGraph: [] }>()

const configured = computed(() => graphHasArchitectureConfig(props.graph))
const architecture = computed(() => (configured.value ? props.graph!.architecture : undefined))
const violationCount = computed(() => architectureViolationCount(architecture.value))
const moduleRows = computed(() => {
  const arch = architecture.value
  if (!arch || !props.graph) return []
  return buildModuleRows(props.graph, arch)
})
const findings = computed(() => architecture.value?.findings ?? [])
</script>

<template>
  <SkeletonTableRows v-if="graphLoading" :label="messages.graphLoadingLabel" />
  <ErrorState
    v-else-if="!graph && graphError"
    :title="messages.architectureNeedsGraphTitle"
    :message="messages.architectureNeedsGraphBody"
    :retry-label="messages.graphRetry"
    @retry="emit('retryGraph')"
  />
  <div v-else-if="!configured" class="empty-state" role="status">
    <h4>{{ messages.architectureEmptyTitle }}</h4>
    <p>{{ messages.architectureEmptyBody }}</p>
  </div>
  <template v-else>
    <header class="architecture-header">
      <p role="status">
        {{ messages.architectureSummary(violationCount, architecture!.summary.unassignedFiles) }}
      </p>
      <p class="muted"><code>{{ architecture!.config }}</code></p>
    </header>

    <section :aria-label="messages.architectureModulesTitle">
      <h4>{{ messages.architectureModulesTitle }}</h4>
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">{{ messages.architectureModuleName }}</th>
            <th scope="col">{{ messages.architectureModuleFiles }}</th>
            <th scope="col">{{ messages.architectureModulePaths }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in moduleRows" :key="row.module.name">
            <th scope="row">{{ row.module.name }}</th>
            <td>{{ row.fileCount }}</td>
            <td><code>{{ row.module.paths.join(', ') }}</code></td>
          </tr>
        </tbody>
      </table>
    </section>

    <section :aria-label="messages.architectureFindingsTitle(violationCount)">
      <h4>{{ messages.architectureFindingsTitle(violationCount) }}</h4>
      <p v-if="findings.length === 0" class="muted">{{ messages.architectureNoFindings }}</p>
      <table v-else class="data-table">
        <thead>
          <tr>
            <th scope="col">{{ messages.architectureColumnFrom }}</th>
            <th scope="col">{{ messages.architectureColumnTo }}</th>
            <th scope="col">{{ messages.architectureColumnEdge }}</th>
            <th scope="col">{{ messages.architectureColumnLocation }}</th>
            <th scope="col">{{ messages.architectureColumnRule }}</th>
            <th scope="col">{{ messages.architectureColumnProvenance }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(finding, index) in findings" :key="`${finding.file}:${finding.line}:${index}`">
            <td>{{ finding.from }}</td>
            <td>{{ finding.to }}</td>
            <td>{{ finding.edgeKind }}</td>
            <td>
              <code>{{ finding.file }}:{{ finding.line }}</code>
              <RouterLink
                v-if="graphHref"
                class="finding-graph-link"
                :to="graphHref(finding.file)"
              >
                {{ messages.showInGraph }}
              </RouterLink>
            </td>
            <td>{{ finding.rule }}</td>
            <td>{{ finding.provenance }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </template>
</template>

<style scoped>
.empty-state {
  padding: var(--space-4) 0;
}

.empty-state h4 {
  margin-top: 0;
}

.muted {
  color: var(--color-text-secondary);
}

.architecture-header {
  display: grid;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.data-table th,
.data-table td {
  border-bottom: 1px solid var(--color-border);
  padding: var(--space-2) var(--space-3);
  text-align: left;
  vertical-align: top;
}

.finding-graph-link {
  display: inline-block;
  margin-inline-start: var(--space-2);
  font-size: var(--text-12);
}
</style>
