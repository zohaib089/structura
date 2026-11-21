<script setup lang="ts">
import { ChartNoAxesGantt, ListFilter, Maximize, Orbit, RefreshCw, Search } from '@lucide/vue'
import { computed } from 'vue'
import { middleEllipsis } from '../pill-label'
import Tip from './Tip.vue'
const props = defineProps<{
  filtersLabel: string
  filtersTooltip: string
  searchLabel: string
  searchShortLabel?: string
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
  /**
   * How much room the bar has (host measures pane minus side panel), so it stays on one row:
   * full = everything; tight = search becomes an icon, the file picker loses its prefix;
   * narrow = Fit to view goes icon-only too; xnarrow = Radial / Linear go icon-only as well.
   * Hidden labels stay as accessible names and tooltips.
   */
  density?: 'full' | 'tight' | 'narrow' | 'xnarrow'
  /** Editor hosts: "Scan again" icon button (hidden when no label is passed). */
  rescanLabel?: string
  rescanTooltip?: string
  /** A scan is running: the icon spins and the button waits. */
  rescanBusy?: boolean
  rescanBusyLabel?: string
}>()

const emit = defineEmits<{
  toggleFilters: []
  openSearch: []
  fit: []
  'update:entryId': [id: string]
  toggleShowAllCross: []
  'update:layout': [layout: 'radial' | 'linear']
  rescan: []
}>()
/** Compact bars: the closed picker shows a middle-ellipsis name (start + tail + extension) that fits its
 * box; the list keeps full names, and the tooltip names the current file's full path. */
function entryText(label: string) {
  const d = props.density ?? 'full'
  return d === 'full' ? label : middleEllipsis(label, 12)
}
const entryTitle = computed(() => {
  const current = props.entryOptions.find((option) => option.id === props.entryId)
  return current ? `${props.entryTooltip}: ${current.path || current.label}` : props.entryTooltip
})
</script>

<template>
  <div class="floating-bar" :class="[{ 'is-compact': Boolean(searchShortLabel) }, `density-${density ?? 'full'}`]" :data-density="density ?? 'full'" role="toolbar" aria-label="Graph controls">
    <Tip :text="filtersTooltip">
      <button
        type="button"
        class="icon-button"
        :aria-label="filtersLabel"
        data-testid="graph-filter-toggle"
        @click="emit('toggleFilters')"
      >
        <ListFilter :size="18" aria-hidden="true" />
      </button>
    </Tip>
    <div v-if="layoutLabel" class="layout-switch" role="group" :aria-label="layoutLabel" data-testid="layout-switch">
      <button
        v-for="option in (['radial', 'linear'] as const)"
        :key="option"
        type="button"
        :aria-pressed="(layout ?? 'radial') === option"
        :data-testid="`layout-${option}`"
        :title="option === 'radial' ? radialLabel : linearLabel"
        @click="emit('update:layout', option)"
      >
        <Orbit v-if="option === 'radial'" class="btn-icon" :size="14" aria-hidden="true" />
        <ChartNoAxesGantt v-else class="btn-icon" :size="14" aria-hidden="true" />
        <span class="btn-label">{{ option === 'radial' ? radialLabel : linearLabel }}</span>
      </button>
    </div>
    <label v-if="entryOptions.length > 0" class="entry-switcher" :title="entryTooltip">
      <span class="entry-prefix">{{ entryLabel }}</span>
      <select
        :value="entryId"
        :aria-label="entryTooltip"
        :title="entryTitle"
        data-testid="graph-entry-switcher"
        @change="emit('update:entryId', ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="option in entryOptions" :key="option.id" :value="option.id" :title="option.path || option.label">
          {{ option.id === entryId ? entryText(option.label) : option.label }}
        </option>
      </select>
    </label>

    <Tip :text="fitTooltip">
      <button
        type="button"
        class="fit-button"
        :aria-label="fitTooltip"
        data-testid="graph-fit"
        @click="emit('fit')"
      >
        <Maximize class="btn-icon" :size="14" aria-hidden="true" />
        <span class="btn-label">{{ fitLabel }}</span>
      </button>
    </Tip>
    <button
      type="button"
      class="search-button"
      :class="{ 'has-short': Boolean(searchShortLabel) }"
      :aria-label="searchTooltip"
      :title="searchTooltip"
      :aria-keyshortcuts="searchShortcut"
      data-testid="graph-search-open"
      @click="emit('openSearch')"
    >
      <Search class="search-icon" :size="16" aria-hidden="true" />
      <span class="search-label-full">{{ searchLabel }}</span>
      <span v-if="searchShortLabel" class="search-label-short">{{ searchShortLabel }}</span>
    </button>    <button
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
    <Tip v-if="rescanLabel" :text="rescanBusy ? (rescanBusyLabel ?? rescanTooltip ?? rescanLabel) : (rescanTooltip ?? rescanLabel)">
      <button
        type="button"
        class="icon-button rescan-button"
        :class="{ 'is-busy': rescanBusy }"
        :aria-label="rescanBusy ? (rescanBusyLabel ?? rescanLabel) : rescanLabel"
        :aria-busy="rescanBusy ? 'true' : 'false'"
        :disabled="rescanBusy"
        data-testid="graph-rescan"
        @click="emit('rescan')"
      >
        <RefreshCw :size="16" aria-hidden="true" />
      </button>
    </Tip>
    <div v-if="$slots.below" class="below"><slot name="below" /></div>
  </div>
</template>

<style scoped>
.floating-bar {
  position: absolute;
  inset-block-start: var(--space-3);
  /* Centre over the visible stage: the host sets --graph-controls-inset-end while a side panel
     overlays the right edge, so the bar re-centres (and wraps if it must) left of the panel. */
  inset-inline-start: calc((100% - var(--graph-controls-inset-end, 0px)) / 2);
  z-index: var(--z-graph-controls);
  display: flex;
  flex-wrap: wrap;
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
  /* Size to the controls (never wider than the pane), so the last button stays inside the border. */
  inline-size: max-content;
  max-inline-size: calc(100% - var(--graph-controls-inset-end, 0px) - var(--space-6));
  box-sizing: border-box;
  transition: inset-inline-start var(--dur-2) var(--easing-standard);
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
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
.search-button .search-label-full,
.search-button .search-label-short { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.search-button { white-space: nowrap; }
.search-button,
.fit-button {
  /* G09: labels centred on both axes inside the hit target. */
  align-items: center;
  line-height: 1;
  min-block-size: var(--viewer-hit-target);
  padding-inline: var(--space-3);
  border: 1px solid var(--viewer-control-border, var(--color-border));
  border-radius: var(--r-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
}
.fit-button { justify-content: center; }
.links-button {
  /* Same height as the other controls and centred, so it never pokes out of the bar. */
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
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
.search-label-short { display: none; }
.search-button {
  flex: 1 1 auto;
  min-inline-size: 6rem;
  max-inline-size: 18rem;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: start;
  color: var(--color-text-muted);
}
/* Wide panes have room for the whole placeholder on one line. */
@media (min-width: 960px) {
  .search-button { flex: 0 0 auto; min-inline-size: max-content; max-inline-size: none; }
}
/* G4c shared control style: the same hover tint as the ZoomPad and Tips. */
.icon-button:hover,
.search-button:hover,
.fit-button:hover,
.links-button:hover,
.layout-switch button:not([aria-pressed='true']):hover {
  background: color-mix(in srgb, var(--color-text-primary) 8%, var(--color-surface));
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
/* Focus chip row: always its own line under the controls, inside the same card, so it never overlaps them. */
.floating-bar:has(.below) { flex-wrap: wrap; }
/* An open focus-options popover sits above the file panel (it overlaps the sheet on phones). */
.floating-bar:has([data-testid='focus-options-panel']) { z-index: calc(var(--z-viewer-drawer) + 1); }
.below { flex-basis: 100%; display: flex; justify-content: center; min-inline-size: 0; pointer-events: none; }
@media (prefers-reduced-motion: reduce) {
  .floating-bar { transition: none; }
}
@media (max-width: 640px) {
  .floating-bar {
    flex-wrap: nowrap;
    gap: var(--space-1);
    padding: var(--space-1);
    inline-size: calc(100% - var(--space-4));
    max-inline-size: none;
    overflow: hidden;
  }
  /* Labelled Fit is too wide on a phone with the sheet open; Tip + aria-label keep the name. */
  .fit-button .btn-label {
    position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap;
  }
  .fit-button { padding-inline: var(--space-2); }
  .links-button { display: none; }

  .entry-prefix { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  select { max-inline-size: 5.5rem; }
  .search-button { min-inline-size: 0; flex: 1 1 0; max-inline-size: none; padding-inline: var(--space-2); }
  .search-button.has-short .search-label-full { display: none; }
  .search-button.has-short .search-label-short { display: inline; }
  .fit-button { padding-inline: var(--space-2); white-space: nowrap; flex-shrink: 1; min-inline-size: 0; overflow: hidden; text-overflow: ellipsis; }
  .links-button { padding-inline: var(--space-1); }
  .layout-switch button { padding-inline: var(--space-2); }
  .layout-switch { flex-shrink: 0; }
  .search-button { min-inline-size: 2.5rem; }
}
.search-icon { display: none; }
/* Icon + label on the layout switch and Fit to view (labels always stay). */
.layout-switch button, .fit-button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
.btn-icon { flex-shrink: 0; }
@media (max-width: 640px) {
  .layout-switch .btn-icon { display: none; }
  .fit-button .btn-icon { display: inline-block; }
}
/* Narrow panes (side bar): the search button becomes an icon so Radial / Linear keep their names. */
@media (max-width: 480px) {
  .search-icon { display: inline-block; vertical-align: middle; }
  .search-button .search-label-full,
  .search-button.has-short .search-label-short { display: none; }
  .search-button { flex: 0 0 auto; }
  .floating-bar.is-compact .entry-switcher { display: none; }
}

/* Hamburger → filter icon, centred in a square hit target (tooltip + accessible name from the host). */
.icon-button {
  align-items: center; justify-content: center;
  inline-size: var(--viewer-hit-target); min-block-size: var(--viewer-hit-target);
  padding: 0; background: var(--color-surface); color: var(--color-text-primary);
}
/* Density steps (desktop panes; phones keep their own rules above). Visually hidden ≠ removed. */
.floating-bar.density-tight .entry-prefix,
.floating-bar.density-narrow .entry-prefix,
.floating-bar.density-xnarrow .entry-prefix,
/* Keep "Fit to view" until the pane is truly cramped (xnarrow). */
.floating-bar.density-xnarrow .fit-button .btn-label,
.floating-bar.density-xnarrow .layout-switch .btn-label {
  position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap;
}
.floating-bar:not(.density-full) .search-icon { display: inline-block; flex-shrink: 0; }
.floating-bar:not(.density-full) .search-button {
  flex: 0 0 auto; min-inline-size: var(--viewer-hit-target); max-inline-size: none;
  justify-content: center; gap: 6px; padding-inline: var(--space-3);
}
.floating-bar:not(.density-full) .search-button .search-label-full,
.floating-bar:not(.density-full) .search-button .search-label-short { display: none; }
/* The search icon expands to show its name on hover / keyboard focus. */
.floating-bar:not(.density-full) .search-button:is(:hover, :focus-visible) .search-label-short { display: inline; }
.floating-bar:not(.density-full) .search-button:not(.has-short):is(:hover, :focus-visible) .search-label-full { display: inline; }
/* Icon-only Fit only in xnarrow. */
.floating-bar.density-xnarrow .fit-button { padding-inline: 0; inline-size: var(--viewer-hit-target); }
.floating-bar.density-narrow select,
.floating-bar.density-xnarrow select { max-inline-size: 8rem; }
.floating-bar.density-tight select { max-inline-size: 7.5rem; }
.floating-bar.density-xnarrow .layout-switch button { padding-inline: var(--space-3); }
/* Keep the control row from wrapping under the labelled Fit; the focus chip still uses .below flex-basis 100%. */
.floating-bar.density-tight,
.floating-bar.density-narrow { column-gap: var(--space-1); }

.rescan-button:disabled { cursor: progress; opacity: 0.85; }
.rescan-button.is-busy svg { color: var(--color-brand-amber, #d4a017); animation: rescan-spin 0.9s linear infinite; }
@keyframes rescan-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .rescan-button.is-busy svg { animation: none; } }
</style>
