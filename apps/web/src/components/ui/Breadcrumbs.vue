<script setup lang="ts">
export interface BreadcrumbItem {
  label: string
  to?: string
}

withDefaults(
  defineProps<{
    items: BreadcrumbItem[]
    /** Accessible name for the breadcrumb nav. */
    label?: string
  }>(),
  { label: 'Breadcrumb' }
)
</script>

<template>
  <nav class="breadcrumbs" :aria-label="label">
    <ol>
      <li v-for="(item, index) in items" :key="`${item.label}-${index}`">
        <RouterLink v-if="item.to && index < items.length - 1" :to="item.to"><bdi>{{ item.label }}</bdi></RouterLink>
        <span v-else aria-current="page"><bdi>{{ item.label }}</bdi></span>
        <span v-if="index < items.length - 1" class="sep" aria-hidden="true">›</span>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.breadcrumbs ol {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--text-13);
  line-height: var(--text-13-lh);
  color: var(--color-text-secondary);
}

.breadcrumbs li {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.breadcrumbs a {
  color: var(--color-text-secondary);
  text-decoration: none;
}

.breadcrumbs a:hover {
  color: var(--color-text-primary);
}

.breadcrumbs span[aria-current='page'] {
  color: var(--color-text-primary);
  font-weight: var(--font-weight-medium);
}

.sep {
  display: inline-block;
  color: var(--color-text-muted);
}
</style>
