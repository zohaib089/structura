<script setup lang="ts">
withDefaults(
  defineProps<{
    rows?: number
    label?: string
  }>(),
  {
    rows: 3,
    label: 'Loading'
  }
)
</script>

<template>
  <div class="ui-skeleton" role="status" :aria-label="label">
    <span v-for="row in rows" :key="row" class="ui-skeleton__row" aria-hidden="true" />
  </div>
</template>

<style scoped>
.ui-skeleton {
  display: grid;
  gap: var(--space-2);
}

.ui-skeleton__row {
  block-size: 2.5rem;
  border-radius: var(--r-sm);
  background: var(--gray-3);
  border: 1px solid var(--color-border);
}

@media (prefers-reduced-motion: no-preference) {
  .ui-skeleton__row {
    background: linear-gradient(
      90deg,
      var(--gray-3),
      color-mix(in srgb, var(--gray-3) 70%, var(--gray-5)),
      var(--gray-3)
    );
    background-size: 200% 100%;
    animation: ui-skeleton-shimmer var(--duration-slow) linear infinite;
  }
}

@keyframes ui-skeleton-shimmer {
  to {
    background-position: -200% 0;
  }
}
</style>
