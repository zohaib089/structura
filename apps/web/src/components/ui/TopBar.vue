<script setup lang="ts">
import Breadcrumbs, { type BreadcrumbItem } from './Breadcrumbs.vue'

defineProps<{
  breadcrumbs: BreadcrumbItem[]
  commandPaletteLabel: string
  commandPaletteHint: string
}>()
</script>

<template>
  <header class="topbar" role="banner">
    <Breadcrumbs :items="breadcrumbs" />
    <div class="topbar-actions">
      <button type="button" class="command-button" :aria-label="commandPaletteLabel" disabled>
        <span>{{ commandPaletteLabel }}</span>
        <kbd>{{ commandPaletteHint }}</kbd>
      </button>
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  flex-shrink: 0;
  min-height: var(--shell-topbar-height);
  padding: 0 var(--space-5);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.command-button {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--r-sm);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: var(--text-13);
  line-height: var(--text-13-lh);
  cursor: not-allowed;
  opacity: 0.72;
}

.command-button kbd {
  padding: 0 var(--space-1);
  border: 1px solid var(--color-border);
  border-radius: var(--r-xs);
  font-family: var(--font-family-mono);
  font-size: var(--text-12);
  color: var(--color-text-muted);
}
</style>
