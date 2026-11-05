<script setup lang="ts">
import { computed } from 'vue'
import type { ReportSeverity } from '../../api/scan-report-types'
import { SEVERITY_ICONS } from '../../services/severity-display'

const props = withDefaults(
  defineProps<{
    severity: ReportSeverity
    label: string
    count?: number
    compact?: boolean
  }>(),
  { compact: false }
)

const Icon = computed(() => SEVERITY_ICONS[props.severity])
const styleVars = computed(() => ({
  '--chip-fg': `var(--sev-${props.severity}-fg)`,
  '--chip-bg': `var(--sev-${props.severity}-bg)`,
  '--chip-border': `var(--sev-${props.severity}-border)`
}))
</script>

<template>
  <span
    class="severity-chip"
    :class="{ 'severity-chip--compact': compact }"
    :style="styleVars"
    :title="compact ? label : undefined"
    :aria-label="compact && count != null ? `${label}: ${count}` : undefined"
  >
    <component :is="Icon" class="severity-chip__icon" aria-hidden="true" :size="14" />
    <span v-if="compact && count != null" class="severity-chip__text">{{ count }}</span>
    <span v-else class="severity-chip__text">{{ label }}</span>
  </span>
</template>

<style scoped>
.severity-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding-inline: var(--space-2);
  min-block-size: 1.25rem;
  border-radius: var(--r-xs);
  border: 1px solid var(--chip-border);
  background: var(--chip-bg);
  color: var(--chip-fg);
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
  font-weight: var(--font-weight-medium);
  font-variant-numeric: tabular-nums;
}

.severity-chip__icon {
  flex-shrink: 0;
}

.severity-chip__text {
  white-space: nowrap;
}
</style>
