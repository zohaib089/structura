<script setup lang="ts">
import { computed } from 'vue'
import type { ScanReportV1 } from '../../api/scan-report-types'
import {
  analyserStatusCssVar,
  buildAnalyserRows,
  partitionAnalyserRows
} from '../../services/scan-report-analysers'
import type { ScanReportMessages } from '../../services/scan-report-messages'

const props = defineProps<{
  report: ScanReportV1
  messages: ScanReportMessages
}>()

const rows = computed(() => buildAnalyserRows(props.report.analysers))
const partitioned = computed(() => partitionAnalyserRows(rows.value))

function formatDuration(durationMs: number): string {
  if (durationMs < 1000) return `${durationMs} ms`
  return `${(durationMs / 1000).toFixed(1)} s`
}
</script>

<template>
  <section class="analysers-panel" :aria-label="messages.analysersTitle">
    <h3>{{ messages.analysersTitle }}</h3>
    <p v-if="rows.length === 0" class="muted">{{ messages.analysersEmpty }}</p>
    <template v-else>
      <div v-if="partitioned.active.length > 0" class="table-wrap">
        <table class="analyser-table">
          <caption class="sr-only">{{ messages.analysersRanCaption }}</caption>
          <thead>
            <tr>
              <th scope="col">{{ messages.analyserColumnName }}</th>
              <th scope="col">{{ messages.analyserColumnStatus }}</th>
              <th scope="col">{{ messages.analyserColumnDuration }}</th>
              <th scope="col">{{ messages.analyserColumnDetails }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in partitioned.active"
              :key="row.name"
              :class="{ 'row-inactive': row.inactive }"
            >
              <th scope="row">{{ row.name }}</th>
              <td>
                <span
                  class="status-badge"
                  :style="{
                    color: analyserStatusCssVar(row.status),
                    borderColor: analyserStatusCssVar(row.status)
                  }"
                >
                  {{ messages.analyserStatusLabel(row.status) }}
                </span>
              </td>
              <td>{{ formatDuration(row.durationMs) }}</td>
              <td>
                <span v-if="row.reason" class="reason">{{ row.reason }}</span>
                <span v-else class="muted">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="partitioned.skipped.length > 0" class="skipped-block">
        <h4>{{ messages.analysersSkippedHeading }}</h4>
        <div class="table-wrap">
          <table class="analyser-table skipped-table">
            <caption class="sr-only">{{ messages.analysersSkippedCaption }}</caption>
            <thead>
              <tr>
                <th scope="col">{{ messages.analyserColumnName }}</th>
                <th scope="col">{{ messages.analyserColumnStatus }}</th>
                <th scope="col">{{ messages.analyserColumnDuration }}</th>
                <th scope="col">{{ messages.analyserColumnDetails }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in partitioned.skipped" :key="row.name" class="row-skipped">
                <th scope="row">{{ row.name }}</th>
                <td>
                  <span
                    class="status-badge"
                    :style="{
                      color: analyserStatusCssVar(row.status),
                      borderColor: analyserStatusCssVar(row.status)
                    }"
                  >
                    {{ messages.analyserStatusLabel(row.status) }}
                  </span>
                </td>
                <td>{{ formatDuration(row.durationMs) }}</td>
                <td>
                  <span v-if="row.reason" class="reason">{{ row.reason }}</span>
                  <span v-else class="muted">{{ messages.analyserSkippedNoReason }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.analysers-panel {
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--color-surface-raised) var(--alpha-80), transparent);
}

.analysers-panel h3 {
  margin: 0 0 var(--space-3);
}

.analysers-panel h4 {
  margin: var(--space-4) 0 var(--space-2);
  font-size: var(--font-size-sm);
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
  color: var(--color-text-secondary);
}

.muted {
  color: var(--color-text-secondary);
}

.table-wrap {
  overflow-x: auto;
}

.analyser-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.analyser-table th,
.analyser-table td {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  text-align: left;
  vertical-align: top;
}

.analyser-table thead th {
  font-weight: var(--font-weight-bold);
}

.status-badge {
  display: inline-block;
  padding: var(--space-1) var(--space-2);
  border: 1px solid;
  border-radius: var(--radius-full);
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-xs);
  line-height: 1.2;
}

.row-inactive {
  background: color-mix(in srgb, var(--color-warning) var(--alpha-04), transparent);
}

.skipped-block {
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px dashed var(--color-border);
}

.skipped-table tbody tr {
  background: color-mix(in srgb, var(--color-text-secondary) var(--alpha-04), transparent);
}

.reason {
  white-space: pre-wrap;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
