<script setup lang="ts">
defineProps<{
  filtersLabel: string
  filtersTooltip: string
  searchLabel: string
  searchTooltip: string
  fitLabel: string
  fitTooltip: string
  entryLabel: string
  entryTooltip: string
  entryOptions: { id: string; label: string; path: string }[]
  entryId: string
  searchShortcut?: string
}>()

const emit = defineEmits<{
  toggleFilters: []
  openSearch: []
  fit: []
  'update:entryId': [id: string]
}>()
</script>

<template>
  <div class="floating-bar" role="toolbar" aria-label="Graph controls">
    <button
      type="button"
      class="icon-button"
      :aria-label="filtersLabel"
      :title="filtersTooltip"
      data-testid="graph-filter-toggle"
      @click="emit('toggleFilters')"
    >
      <span aria-hidden="true">☰</span>
    </button>
    <label class="entry-switcher" :title="entryTooltip">
      <span class="entry-prefix">{{ entryLabel }}</span>
      <select
        :value="entryId"
        :aria-label="entryTooltip"
        :title="entryTooltip"
        data-testid="graph-entry-switcher"
        @change="emit('update:entryId', ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="option in entryOptions" :key="option.id" :value="option.id">
          {{ option.label }}
        </option>
      </select>
    </label>
    <button
      type="button"
      class="search-button"
      :aria-label="searchTooltip"
      :title="searchTooltip"
      :aria-keyshortcuts="searchShortcut"
      data-testid="graph-search-open"
      @click="emit('openSearch')"
    >
      {{ searchLabel }}
    </button>
    <button
      type="button"
      class="fit-button"
      :aria-label="fitTooltip"
      :title="fitTooltip"
      data-testid="graph-fit"
      @click="emit('fit')"
    >
      {{ fitLabel }}
    </button>
  </div>
</template>

<style scoped>
.floating-bar {
  position: absolute;
  inset-block-start: var(--space-3);
  inset-inline-start: 50%;
  z-index: var(--z-graph-controls);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--r-md);
  background: color-mix(in srgb, var(--color-surface-raised) 92%, transparent);
  backdrop-filter: blur(8px);
  transform: translateX(-50%);
  max-inline-size: min(42rem, calc(100% - var(--space-6)));
  pointer-events: none;
}
.icon-button,
.search-button,
.fit-button,
.entry-switcher,
.entry-switcher select {
  pointer-events: auto;
}
.icon-button,
.search-button,
.fit-button {
  min-block-size: var(--viewer-hit-target);
  padding-inline: var(--space-3);
  border: 1px solid var(--viewer-control-border, var(--color-border));
  border-radius: var(--r-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
}
.entry-switcher {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-13);
}
.entry-prefix {
  color: var(--color-text-muted);
  white-space: nowrap;
}
select {
  min-block-size: var(--viewer-hit-target);
  padding-inline: var(--space-2);
  border: 1px solid var(--viewer-control-border, var(--color-border));
  border-radius: var(--r-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  max-inline-size: 12rem;
}
.search-button {
  flex: 1 1 auto;
  min-inline-size: 8rem;
  text-align: start;
  color: var(--color-text-muted);
}
</style>
