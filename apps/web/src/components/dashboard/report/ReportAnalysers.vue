<script setup lang="ts">
/**
 * ReportAnalysers - flat table of analyser (check) run records. Used for the secondary
 * "what we could not check" section of the summary: skipped checks and checks that did not finish.
 */
import {
  analyserStatusCssVar,
  type ReportAnalyserRow
} from '../../../services/scan-report-analysers'
import { formatDuration } from '../../../services/scan-report-format'
import type { ScanReportMessages } from '../../../services/scan-report-messages'

defineProps<{
  rows: ReportAnalyserRow[]
  caption: string
  messages: ScanReportMessages
}>()
</script>

<template>
  <div class="analysers-wrap">
    <table class="analyser-table">
      <caption class="sr-only">{{ caption }}</caption>
      <thead>
        <tr>
          <th scope="col">{{ messages.analyserColumnName }}</th>
          <th scope="col">{{ messages.analyserColumnStatus }}</th>
          <th scope="col">{{ messages.analyserColumnDuration }}</th>
          <th scope="col">{{ messages.analyserColumnDetails }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.name">
          <th scope="row"><code>{{ row.name }}</code></th>
          <td>
            <span class="status-word" :style="{ color: analyserStatusCssVar(row.status) }">
              {{ messages.analyserStatusLabel(row.status) }}
            </span>
          </td>
          <td>{{ row.status === 'skipped' ? '—' : formatDuration(row.durationMs) }}</td>
          <td>
            <span v-if="row.reason" class="reason">{{ row.reason }}</span>
            <span v-else class="muted">{{ messages.analyserSkippedNoReason }}</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.analysers-wrap {
  overflow-x: auto;
}

.analyser-table {
  inline-size: 100%;
  border-collapse: collapse;
  font-size: var(--text-13);
  line-height: var(--text-13-lh);
}

.analyser-table th,
.analyser-table td {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  text-align: start;
  vertical-align: top;
}

.analyser-table thead th {
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}

.analyser-table tbody th {
  font-weight: var(--font-weight-regular, 400);
}

code {
  font-family: var(--font-family-mono);
}

.status-word {
  font-weight: var(--font-weight-medium);
}

.muted {
  color: var(--color-text-muted);
}

.reason {
  white-space: pre-wrap;
}

.sr-only {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
