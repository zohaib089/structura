<script setup lang="ts">
/** ReportTabs - underline tabs with counts wherever the report has data, plus a tooltip that explains each name. */
import { computed } from 'vue'
import type { ScanReportMessages, ReportTabId } from '../../../services/scan-report-messages'
import { REPORT_TAB_IDS } from '../../../services/scan-report-url-state'
import Tabs, { type TabItem } from '../../ui/Tabs.vue'

const props = defineProps<{
  modelValue: ReportTabId
  messages: ScanReportMessages
  /** Only tabs with a number here show a count. */
  counts: Partial<Record<ReportTabId, number>>
}>()

const emit = defineEmits<{ 'update:modelValue': [tab: ReportTabId] }>()

function labelFor(tab: ReportTabId): string {
  const m = props.messages
  return {
    summary: m.tabSummary,
    findings: m.tabFindings,
    violations: m.tabViolations,
    security: m.tabSecurity,
    badPractices: m.tabBadPractices,
    improvements: m.tabImprovements,
    removals: m.tabRemovals,
    architecture: m.tabArchitecture(0),
    graph: m.tabGraph,
    history: m.tabHistory
  }[tab]
}

const items = computed<TabItem[]>(() =>
  REPORT_TAB_IDS.map(tab => ({
    id: tab,
    label: labelFor(tab),
    count: props.counts[tab],
    title: props.messages.tabTooltip(tab),
    tabId: `report-tab-${tab}`,
    panelId: `report-panel-${tab}`
  }))
)
</script>

<template>
  <Tabs
    :model-value="modelValue"
    :items="items"
    :ariaLabel="messages.tabsAriaLabel"
    @update:model-value="id => emit('update:modelValue', id as ReportTabId)"
  />
</template>
