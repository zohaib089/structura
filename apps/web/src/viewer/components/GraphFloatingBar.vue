<script setup lang="ts">
const props = defineProps<{
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
  showAllCrossLabel?: string
  showAllCross?: boolean
  crossLinkCount?: number
  /** Linear / Radial switch; hidden when the host does not pass labels. */
  layout?: 'radial' | 'linear'
  layoutLabel?: string
  radialLabel?: string
  linearLabel?: string
}>()

const emit = defineEmits<{
  toggleFilters: []
  openSearch: []
  fit: []
  'update:entryId': [id: string]
  toggleShowAllCross: []
  'update:layout': [layout: 'radial' | 'linear']
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
    <div v-if="layoutLabel" class="layout-switch" role="group" :aria-label="layoutLabel" data-testid="layout-switch">
      <button
        v-for="option in (['radial', 'linear'] as const)"
        :key="option"
        type="button"
        :aria-pressed="(layout ?? 'radial') === option"
        :data-testid="`layout-${option}`"
        @click="emit('update:layout', option)"
      >
        {{ option === 'radial' ? radialLabel : linearLabel }}
      </button>
    </div>
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
    <button
      v-if="showAllCrossLabel && (crossLinkCount ?? 0) > 0"
      type="button"
      class="links-button"
      :aria-pressed="showAllCross ? 'true' : 'false'"
      :aria-label="showAllCrossLabel"
      :title="showAllCrossLabel"
      data-testid="graph-show-all-links"
      @click="emit('toggleShowAllCross')"
    >
      <span aria-hidden="true">⇄ {{ crossLinkCount }}</span>
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
  flex-wrap: nowrap;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border: 1px solid color-mix(in srgb, var(--color-brand-amber-ui) 32%, var(--color-border));
  border-radius: var(--r-md);
  background: color-mix(in srgb, var(--color-brand-navy) 28%, var(--color-surface-raised) 72%);
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--color-brand-navy) 35%, transparent);
  transform: translateX(-50%);
  inline-size: min(48rem, calc(100% - var(--space-6)));
  max-inline-size: calc(100% - var(--space-6));
  pointer-events: none;
}
.icon-button,
.search-button,
.fit-button,
.links-button,
.layout-switch {
  display: inline-flex;
  flex-shrink: 0;
  pointer-events: auto;
  border: 1px solid var(--viewer-control-border, var(--color-border));
  border-radius: var(--r-sm);
  overflow: hidden;
}
.layout-switch button {
  min-block-size: var(--viewer-hit-target);
  padding-inline: var(--space-3);
  border: 0;
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: var(--text-13);
}
.layout-switch button + button { border-inline-start: 1px solid var(--viewer-control-border, var(--color-border)); }
.layout-switch button[aria-pressed='true'] {
  background: color-mix(in srgb, var(--color-brand-amber, #e9a53a) 22%, var(--color-surface));
  color: var(--color-text-primary);
  font-weight: 600;
}
.entry-switcher,
.entry-switcher select {
  pointer-events: auto;
  white-space: nowrap;
  flex-shrink: 0;
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
.links-button {
  min-block-size: var(--viewer-hit-target, 2.75rem);
  padding-inline: var(--space-2);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--text-12, 0.75rem);
  font-variant-numeric: tabular-nums;
}
.links-button[aria-pressed='true'] {
  border-color: color-mix(in srgb, var(--color-brand-amber-ui) 50%, var(--color-border));
  color: var(--color-text-primary);
  background: color-mix(in srgb, var(--color-brand-amber-ui) 18%, transparent);
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
  max-inline-size: 10rem;
}
.search-button {
  flex: 1 1 auto;
  min-inline-size: 6rem;
  max-inline-size: 18rem;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: start;
  color: var(--color-text-muted);
}
.icon-button:focus-visible,
.search-button:focus-visible,
.fit-button:focus-visible,
.links-button:focus-visible,
.entry-switcher select:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
  border-color: var(--color-brand-amber-ui);
}
@media (max-width: 640px) {
  .floating-bar {
    flex-wrap: nowrap;
    gap: var(--space-1);
    padding: var(--space-1);
    inline-size: calc(100% - var(--space-4));
    max-inline-size: none;
  }
  .entry-prefix { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  select { max-inline-size: 5.5rem; }
  .search-button { min-inline-size: 0; flex: 1 1 0; max-inline-size: none; padding-inline: var(--space-2); }
  .fit-button { padding-inline: var(--space-2); }
}
</style>
