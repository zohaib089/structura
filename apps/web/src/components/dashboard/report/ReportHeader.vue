<script setup lang="ts">
/** ReportHeader - title, scan meta, Graph shortcut and the Export menu. Flat; no card chrome. */
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import { ArrowLeft, Network } from '@lucide/vue'
import type { FilteredScanReportExport } from '../../../api/scan-report-types'
import type { ScanReportMessages } from '../../../services/scan-report-messages'
import ReportExportMenu from './ReportExportMenu.vue'

defineProps<{
  messages: ScanReportMessages
  scanId: string
  meta: string
  backTo: RouteLocationRaw
  graphTo: RouteLocationRaw
  graphAvailable: boolean
  buildExport: () => FilteredScanReportExport
  exportCount: number
}>()
</script>

<template>
  <header class="report-header">
    <div class="report-header__main">
      <RouterLink class="report-header__back" :to="backTo">
        <ArrowLeft :size="14" aria-hidden="true" />
        {{ messages.backToScans }}
      </RouterLink>
      <h2 class="report-header__title">{{ messages.reportTitle }}</h2>
      <p class="report-header__meta">{{ meta }}</p>
    </div>
    <div class="report-header__actions">
      <RouterLink
        v-if="graphAvailable"
        class="report-header__graph"
        :to="graphTo"
        :title="messages.openGraphTooltip"
      >
        <Network :size="14" aria-hidden="true" />
        {{ messages.openGraph }}
      </RouterLink>
      <ReportExportMenu
        :messages="messages"
        :scan-id="scanId"
        :build-payload="buildExport"
        :finding-count="exportCount"
      />
    </div>
  </header>
</template>

<style scoped>
.report-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-4);
}

.report-header__main {
  display: grid;
  gap: var(--space-1);
}

.report-header__back {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  inline-size: fit-content;
  font-size: var(--text-12);
  color: var(--color-text-secondary);
  text-decoration: none;
}

.report-header__back:hover {
  color: var(--color-text-primary);
}

.report-header__title {
  margin: 0;
  font-size: var(--text-20);
  line-height: var(--text-20-lh);
  font-weight: var(--font-weight-semibold);
}

.report-header__meta {
  margin: 0;
  font-size: var(--text-13);
  color: var(--color-text-secondary);
}

.report-header__actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.report-header__graph {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-block-size: 2rem;
  padding: 0 var(--space-3);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--r-sm);
  color: var(--color-text-primary);
  font-size: var(--text-13);
  text-decoration: none;
}

.report-header__graph:hover {
  background: var(--gray-3);
}

.report-header__back:focus-visible,
.report-header__graph:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
</style>
