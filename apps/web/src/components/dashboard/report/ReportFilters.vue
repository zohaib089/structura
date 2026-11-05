<script setup lang="ts">
/**
 * ReportFilters - severity pills (icon + word), optional category pills, path search and Clear.
 * Pure UI: the parent owns the filter state and mirrors it to the URL.
 */
import { computed } from 'vue'
import type { ReportSection, ReportSeverity } from '../../../api/scan-report-types'
import {
  ALL_FINDING_SECTIONS,
  ALL_REPORT_SEVERITIES,
  defaultReportFilters,
  type ReportViewFilters
} from '../../../services/scan-report-filters'
import type { ScanReportMessages } from '../../../services/scan-report-messages'
import { SEVERITY_DESCENDING } from '../../../services/scan-report-severity'
import SeverityChip from '../../ui/SeverityChip.vue'

const props = defineProps<{
  modelValue: ReportViewFilters
  messages: ScanReportMessages
  /** Show the category pills (only on the "All findings" tab; other tabs are already one category). */
  showSections?: boolean
  shown: number
  total: number
}>()

const emit = defineEmits<{ 'update:modelValue': [filters: ReportViewFilters] }>()

const isDefault = computed(() => {
  const defaults = defaultReportFilters()
  return (
    props.modelValue.severities.size === defaults.severities.size &&
    (!props.showSections || props.modelValue.sections.size === defaults.sections.size) &&
    props.modelValue.pathQuery.trim() === ''
  )
})

function toggleSeverity(severity: ReportSeverity) {
  const next = new Set(props.modelValue.severities)
  if (next.has(severity)) next.delete(severity)
  else next.add(severity)
  // An empty set would hide everything with no way to tell why; treat it as "show all".
  emit('update:modelValue', {
    ...props.modelValue,
    severities: next.size === 0 ? new Set(ALL_REPORT_SEVERITIES) : next
  })
}

function toggleSection(section: ReportSection) {
  const next = new Set(props.modelValue.sections)
  if (next.has(section)) next.delete(section)
  else next.add(section)
  emit('update:modelValue', {
    ...props.modelValue,
    sections: next.size === 0 ? new Set(ALL_FINDING_SECTIONS) : next
  })
}

function onPathInput(event: Event) {
  emit('update:modelValue', {
    ...props.modelValue,
    pathQuery: (event.target as HTMLInputElement).value
  })
}

function clear() {
  const defaults = defaultReportFilters()
  emit('update:modelValue', {
    severities: defaults.severities,
    sections: props.showSections ? defaults.sections : props.modelValue.sections,
    pathQuery: ''
  })
}
</script>

<template>
  <section class="report-filters" :aria-label="messages.filtersTitle">
    <fieldset class="group">
      <legend class="group__legend" :title="messages.filterSeverityHint">{{ messages.filterSeverity }}</legend>
      <div class="group__pills">
        <button
          v-for="severity in SEVERITY_DESCENDING"
          :key="severity"
          type="button"
          class="pill"
          :class="{ 'pill--off': !modelValue.severities.has(severity) }"
          :aria-pressed="modelValue.severities.has(severity)"
          :title="messages.filterToggleTooltip(messages.severityLabel(severity), messages.severityTooltip(severity), modelValue.severities.has(severity))"
          :data-testid="`filter-sev-${severity}`"
          @click="toggleSeverity(severity)"
        >
          <SeverityChip :severity="severity" :label="messages.severityLabel(severity)" />
        </button>
      </div>
    </fieldset>

    <fieldset v-if="showSections" class="group">
      <legend class="group__legend" :title="messages.filterCategoryHint">{{ messages.filterSection }}</legend>
      <div class="group__pills">
        <label v-for="section in ALL_FINDING_SECTIONS" :key="section" class="check">
          <input
            type="checkbox"
            :checked="modelValue.sections.has(section)"
            :data-testid="`filter-sec-${section}`"
            @change="toggleSection(section)"
          >
          {{ messages.sectionLabel(section) }}
        </label>
      </div>
    </fieldset>

    <label class="path">
      <span class="path__label" :title="messages.filterPathHint">{{ messages.filterPath }}</span>
      <input
        type="search"
        class="path__input"
        :value="modelValue.pathQuery"
        :placeholder="messages.filterPathPlaceholder"
        data-testid="filter-path"
        @input="onPathInput"
      >
    </label>

    <div class="status">
      <p class="status__count" role="status">{{ messages.filtersShowing(shown, total) }}</p>
      <button v-if="!isDefault" type="button" class="status__clear" data-testid="filter-clear" @click="clear">
        {{ messages.filterClear }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.report-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--space-4) var(--space-5);
  padding-block: var(--space-4);
  border-block-end: 1px solid var(--color-border);
}

.group {
  display: grid;
  gap: var(--space-2);
  min-inline-size: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.group__legend,
.path__label {
  padding: 0;
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}

.group__pills {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.pill {
  padding: 0;
  border: 0;
  border-radius: var(--r-xs);
  background: transparent;
  cursor: pointer;
  font: inherit;
}

.pill--off {
  opacity: 0.45;
}

.pill:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.check {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-13);
}

.path {
  display: grid;
  gap: var(--space-2);
}

.path__input {
  min-inline-size: 14rem;
  min-block-size: 2rem;
  padding: 0 var(--space-3);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--r-sm);
  background: var(--gray-2);
  color: var(--color-text-primary);
  font-family: var(--font-family-mono);
  font-size: var(--text-13);
}

.path__input:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.status {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-inline-start: auto;
}

.status__count {
  margin: 0;
  font-size: var(--text-13);
  color: var(--color-text-secondary);
}

.status__clear {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-brand-amber-ui);
  font: inherit;
  font-size: var(--text-13);
  cursor: pointer;
}

.status__clear:hover {
  text-decoration: underline;
}

.status__clear:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
  border-radius: var(--r-xs);
}
</style>
