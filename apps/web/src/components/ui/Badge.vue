<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'neutral' | 'accent'
  }>(),
  { variant: 'neutral' }
)
</script>

<template>
  <span class="ui-badge" :class="`ui-badge--${variant}`">
    <slot />
  </span>
</template>

<style scoped>
.ui-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding-inline: var(--space-2);
  min-block-size: 1.25rem;
  border-radius: var(--r-xs);
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
  font-weight: var(--font-weight-medium);
  font-variant-numeric: tabular-nums;
}

.ui-badge--neutral {
  background: var(--gray-3);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}

.ui-badge--accent {
  background: color-mix(in srgb, var(--accent) var(--alpha-16), var(--color-surface-raised));
  color: var(--accent);
  border: 1px solid color-mix(in srgb, var(--accent) var(--alpha-32), var(--color-border));
}
</style>
