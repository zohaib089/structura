<script setup lang="ts">
defineProps<{
  caption?: string
  stickyHeader?: boolean
}>()
</script>

<template>
  <div class="ui-table-wrap" :class="{ 'ui-table-wrap--sticky': stickyHeader }">
    <table class="ui-table">
      <caption v-if="caption" class="ui-table__caption">{{ caption }}</caption>
      <slot />
    </table>
  </div>
</template>

<style scoped>
.ui-table-wrap {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--r-md);
}

.ui-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-13);
  line-height: var(--text-13-lh);
}

.ui-table__caption {
  caption-side: top;
  padding: var(--space-3);
  text-align: start;
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
  color: var(--color-text-muted);
}

.ui-table-wrap :deep(thead th) {
  padding: var(--space-2) var(--space-3);
  min-block-size: 2rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-medium);
  text-align: start;
}

.ui-table-wrap--sticky :deep(thead th) {
  position: sticky;
  top: 0;
  z-index: 1;
}

.ui-table-wrap :deep(tbody td) {
  padding: var(--space-2) var(--space-3);
  min-block-size: 2rem;
  border-bottom: 1px solid var(--color-border);
  vertical-align: middle;
}

.ui-table-wrap :deep(tbody tr:last-child td) {
  border-bottom: 0;
}

.ui-table-wrap :deep(tbody tr:hover) {
  background: var(--gray-3);
}
</style>
