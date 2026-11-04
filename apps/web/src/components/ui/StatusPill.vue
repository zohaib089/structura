<script setup lang="ts">
import type { ScanStatus } from '../../api/scans'

defineProps<{
  status: ScanStatus
  label: string
}>()
</script>

<template>
  <span class="status-pill" :data-status="status">
    <span class="status-pill__dot" aria-hidden="true" />
    <span class="status-pill__label">{{ label }}</span>
  </span>
</template>

<style scoped>
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding-inline: var(--space-2);
  min-block-size: 1.25rem;
  border-radius: var(--r-xs);
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
  font-weight: var(--font-weight-medium);
  border: 1px solid var(--color-border);
  background: var(--gray-3);
  color: var(--color-text-secondary);
}

.status-pill__dot {
  inline-size: 0.5rem;
  block-size: 0.5rem;
  border-radius: var(--r-full);
  background: currentColor;
}

.status-pill[data-status='queued'] {
  color: var(--status-queued, var(--gray-8));
}

.status-pill[data-status='running'] {
  color: var(--status-running, var(--accent));
  border-color: color-mix(in srgb, var(--accent) var(--alpha-32), var(--color-border));
  background: color-mix(in srgb, var(--accent) var(--alpha-08), var(--gray-3));
}

.status-pill[data-status='running'] .status-pill__dot {
  animation: status-pill-pulse var(--duration-slow) ease-in-out infinite;
}

.status-pill[data-status='succeeded'] {
  color: var(--status-success);
  border-color: color-mix(in srgb, var(--status-success) var(--alpha-32), var(--color-border));
  background: color-mix(in srgb, var(--status-success) var(--alpha-10), var(--gray-3));
}

.status-pill[data-status='failed'] {
  color: var(--sev-critical-fg);
  border-color: var(--sev-critical-border);
  background: color-mix(in srgb, var(--sev-critical-bg) 70%, var(--gray-3));
}

.status-pill[data-status='cancelled'] {
  color: var(--color-text-secondary);
  border-color: var(--color-border-strong);
}

@media (prefers-reduced-motion: reduce) {
  .status-pill[data-status='running'] .status-pill__dot {
    animation: none;
  }
}

@keyframes status-pill-pulse {
  50% {
    opacity: 0.35;
  }
}
</style>
