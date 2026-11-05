<script setup lang="ts">
/**
 * SkeletonTableRows - flat placeholder rows for list/table regions (projects, past scans).
 * Columns match the projects table: name (40% bar) · last scan (date bar) · status (pill) ·
 * findings (short bar) · actions (icon square). The header row is real: render it yourself
 * above this component; do not skeletonise it.
 */
import SkeletonBlock from './SkeletonBlock.vue'

withDefaults(defineProps<{ rows?: number; label?: string }>(), { rows: 8, label: 'Loading' })
</script>

<template>
  <div class="sk-table" role="status" aria-busy="true" :aria-label="label">
    <div v-for="row in rows" :key="row" class="sk-table__row" aria-hidden="true">
      <SkeletonBlock width="40%" height="0.875rem" />
      <SkeletonBlock width="6rem" />
      <SkeletonBlock width="4.5rem" height="1.25rem" shape="pill" />
      <SkeletonBlock width="2.5rem" />
      <SkeletonBlock width="1.5rem" height="1.5rem" shape="square" />
    </div>
  </div>
</template>

<style scoped>
.sk-table {
  inline-size: 100%;
}
.sk-table__row {
  display: grid;
  grid-template-columns: minmax(0, 4fr) minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 1fr) 1.5rem;
  align-items: center;
  gap: var(--space-4);
  min-block-size: 3rem;
  padding-inline: var(--space-4);
  border-block-end: 1px solid var(--color-border);
}
</style>
