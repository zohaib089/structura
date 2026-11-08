<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import { computed } from 'vue'
import BrandMark from '../../components/brand/BrandMark.vue'
import SeverityChip from '../../components/ui/SeverityChip.vue'
import { SEVERITY_LABELS } from '../../services/severity-display'
import type { SeverityCounts } from '../../services/scan-report-tree'
import { fileSeverityChips, folderSeverityChip } from '../../services/scan-report-tree-display'

const props = defineProps<{
  id: string
  label: string
  kind: string
  cluster: boolean
  clusterSize: number
  expanded: boolean
  more: boolean
  remainder: number
  selected: boolean
  nucleus?: boolean
  dimmed: boolean
  tabIndex: number
  path: string
  moreLabel: string
  expandLabel: string
  collapseLabel: string
  depth?: number
  language?: string
  entering?: boolean
  enterDelay?: number
  severityCounts?: SeverityCounts | null
}>()

const emit = defineEmits<{ select: []; toggle: [] }>()

/** Compact landing-style mark: a disc with a glyph, label beside it (files, externals, unresolved). */
const disc = computed(() => !props.more && (!props.cluster || Boolean(props.nucleus)))

const accessible = computed(() => (props.more ? props.moreLabel : props.label))

const folderChip = computed(() =>
  props.severityCounts && props.kind !== 'file' ? folderSeverityChip(props.severityCounts) : null
)
const fileChips = computed(() =>
  props.severityCounts && props.kind === 'file' ? fileSeverityChips(props.severityCounts) : null
)

function onEnter(event: KeyboardEvent) {
  if (event.target !== event.currentTarget) return
  event.stopPropagation()
  emit('toggle')
}

function onSpace(event: KeyboardEvent) {
  if (event.target !== event.currentTarget) return
  emit('select')
}
</script>

<template>
  <div
    class="overview-node"
    :class="{
      'is-selected': selected,
      'is-nucleus': nucleus,
      'is-dimmed': dimmed,
      'is-more': more,
      'is-cluster': cluster,
      'is-file': kind === 'file',
      'is-external': kind === 'external',
      'is-unresolved': kind === 'unresolved',
      'is-expanded': expanded,
      'is-entering': entering
    }"
    :style="{ '--node-layer': `var(--graph-layer-${((depth ?? 0) % 6) + 1})`, animationDelay: `${enterDelay ?? 0}ms` }"
    :data-node-id="id"
    :data-node-kind="kind"
    :data-cluster-size="cluster ? clusterSize : undefined"
    :data-expanded="cluster ? (expanded ? 'true' : 'false') : undefined"
    :data-testid="more ? 'expand-more' : undefined"
    :tabindex="tabIndex"
    role="treeitem"
    :aria-selected="selected"
    :aria-expanded="cluster ? expanded : undefined"
    :aria-label="accessible"
    :title="path || label || moreLabel"
    @click.stop="emit('select')"
    @dblclick.stop.prevent="emit('toggle')"
    @keydown.enter.prevent="onEnter"
    @keydown.space.prevent="onSpace"
  >
    <span class="kind-mark" :class="{ 'kind-mark--disc': disc }" aria-hidden="true">
      <Handle type="target" :position="Position.Left" />
      <BrandMark v-if="nucleus" class="nucleus-mark" size="calc(30px * var(--graph-mark-scale, 1))" />
      <template v-else-if="cluster">{{ expanded ? '▾' : '▸' }}</template>
      <template v-else-if="more">+</template>
      <template v-else-if="kind === 'unresolved'">?</template>
      <template v-else-if="kind === 'external'">◇</template>
      <template v-else-if="kind === 'file'">{{ (language || '•').slice(0, 1) }}</template>
      <template v-else>•</template>
      <Handle type="source" :position="Position.Right" />
    </span>
    <span class="label" dir="ltr">{{ more ? moreLabel : label }}</span>
    <span v-if="folderChip" class="severity-chips">
      <SeverityChip
        compact
        :severity="folderChip.severity"
        :label="SEVERITY_LABELS[folderChip.severity]"
        :count="folderChip.count"
      />
    </span>
    <span v-else-if="fileChips && fileChips.chips.length > 0" class="severity-chips">
      <SeverityChip
        v-for="chip in fileChips.chips"
        :key="`${id}-${chip.severity}`"
        compact
        :severity="chip.severity"
        :label="SEVERITY_LABELS[chip.severity]"
        :count="chip.count"
      />
      <span v-if="fileChips.overflow > 0" class="severity-overflow">+{{ fileChips.overflow }}</span>
    </span>
    <span v-if="cluster" class="count tnum">{{ clusterSize }}</span>
    <button
      v-if="cluster || more"
      type="button"
      class="nodrag nopan node-toggle"
      tabindex="-1"
      :aria-label="expanded ? collapseLabel : expandLabel"
      @click.stop="emit('toggle')"
      @dblclick.stop.prevent
    >
      {{ expanded ? '–' : '+' }}
    </button>
  </div>
</template>

<style scoped>
.overview-node {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-block-size: var(--graph-node-height, 2.75rem);
  min-inline-size: var(--graph-node-min-width, 8rem);
  max-inline-size: var(--graph-node-max-width, 14rem);
  padding-inline: var(--space-2);
  border: var(--graph-node-border-width, 1.5px) solid var(--graph-node-border, var(--color-border-strong));
  border-radius: var(--graph-node-radius, var(--radius-sm));
  background: var(--graph-node-fill, var(--color-surface-raised));
  color: var(--color-text-primary);
}
.is-cluster {
  border-radius: var(--radius-lg);
  background: var(--graph-cluster-fill);
  border-inline-start: 3px solid var(--node-layer, var(--graph-layer-1));
}
.is-expanded.is-cluster {
  background: var(--graph-frame-fill);
  border-style: dashed;
}
.is-file { border-radius: var(--radius-full); }
.is-external {
  border-style: dashed;
  background: var(--graph-external-fill);
}
.is-unresolved {
  background: transparent;
  text-overflow: ellipsis;
  white-space: nowrap;
  unicode-bidi: isolate;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
}
.is-selected .label { font-size: var(--font-size-sm); }
.count, .kind-mark { color: var(--color-text-secondary); }
.tnum { font-feature-settings: var(--font-feature-ui); font-variant-numeric: tabular-nums; }
@media (prefers-reduced-motion: no-preference) {
  .overview-node { transition: box-shadow var(--duration-fast) var(--easing-standard), border-color var(--duration-fast) var(--easing-standard); }
  .is-entering { animation: node-in var(--duration-slow) var(--easing-emphasized) both; }
}
@keyframes node-in {
  from { opacity: 0; transform: scale(0.92); }
  to { opacity: 1; transform: scale(1); }
}
.node-toggle {
  margin-inline-start: auto;
  min-inline-size: var(--viewer-hit-target, 2.75rem);
  min-block-size: var(--viewer-hit-target, 2.75rem);
  border: 0;
  background: transparent;
  color: inherit;
}
.overview-node:hover {
  border-color: var(--graph-hover-border);
  box-shadow: var(--shadow-md);
}
.is-selected {
  outline: var(--graph-selected-width, 2px) solid var(--graph-selected-ring, var(--color-brand-amber-ui));
  outline-offset: 0;
  box-shadow: var(--graph-selected-halo, none);
}
.is-dimmed { opacity: var(--graph-dim-opacity, 0.2); }
.is-dimmed .label,
.is-dimmed .count { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip: rect(0 0 0 0); }
.overview-node:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
.is-selected:focus-visible {
  outline: var(--graph-selected-width, 2px) solid var(--graph-selected-ring, var(--color-brand-amber-ui));
  outline-offset: 0;
  box-shadow: var(--focus-ring), var(--graph-selected-halo, none);
}
.label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  unicode-bidi: isolate;
}

.severity-chips {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-1);
  flex-shrink: 0;
}

.severity-overflow {
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
  color: var(--color-text-muted);
}

.count, .kind-mark { color: var(--color-text-secondary); }

/* S3: Nucleus radial parity. Files, externals and unresolved imports render as compact marks on
 * the navy surface: a coloured disc with a non-colour glyph (language letter, ◇, ?), label beside. */
.overview-node:has(.kind-mark--disc),
.is-cluster.is-nucleus:has(.kind-mark--disc) {
  min-inline-size: 0;
  max-inline-size: calc(var(--graph-node-max-width, 14rem) * var(--graph-mark-scale, 1));
  min-block-size: var(--viewer-hit-target, 2.75rem);
  padding-inline: 0 var(--space-2);
  border: 0;
  border-radius: var(--radius-full);
  background: transparent;
  box-shadow: none;
}
.kind-mark { position: relative; }
.kind-mark :deep(.vue-flow__handle) {
  inset-inline-start: 50% !important;
  inset-block-start: 50% !important;
  transform: translate(-50%, -50%) !important;
}
.kind-mark--disc {
  display: inline-grid;
  place-items: center;
  flex-shrink: 0;
  inline-size: calc(1.75rem * var(--graph-mark-scale, 1));
  block-size: calc(1.75rem * var(--graph-mark-scale, 1));
  border: calc(2px * var(--graph-mark-scale, 1)) solid var(--node-layer, var(--graph-layer-1));
  border-radius: 50%;
  background: #0f1d36;
  color: var(--node-layer, var(--graph-layer-1));
  font: 600 calc(var(--font-size-xs) * var(--graph-mark-scale, 1)) / 1 var(--font-family-mono, ui-monospace, monospace);
  text-transform: lowercase;
}
.is-external .kind-mark--disc { border-style: dashed; color: var(--color-text-secondary); border-color: var(--color-text-secondary); }
.is-unresolved .kind-mark--disc { border-style: dotted; border-color: var(--gray-7); color: var(--gray-8); background: transparent; }
.overview-node:has(.kind-mark--disc) .label {
  font-family: var(--font-family-mono, ui-monospace, monospace);
  font-size: calc(var(--font-size-xs) * var(--graph-mark-scale, 1));
  color: var(--color-text-primary);
  text-shadow: 0 0 3px #0b1628, 0 0 6px #0b1628;
}
.is-nucleus .kind-mark--disc {
  inline-size: calc(3rem * var(--graph-mark-scale, 1));
  block-size: calc(3rem * var(--graph-mark-scale, 1));
  border: 0;
  background: var(--color-brand-amber-ui);
  box-shadow: 0 0 0 6px color-mix(in srgb, var(--color-brand-amber-ui) 22%, transparent), 0 0 28px color-mix(in srgb, var(--color-brand-amber-ui) 45%, transparent);
}
.is-nucleus .label { font-size: calc(var(--font-size-sm) * var(--graph-mark-scale, 1)); font-weight: var(--font-weight-semibold); }
.overview-node.is-selected:has(.kind-mark--disc) { outline: 0; box-shadow: none; }
.is-selected .kind-mark--disc { box-shadow: 0 0 0 3px #0b1628, 0 0 0 5px var(--graph-selected-ring, var(--color-brand-amber-ui)); }
.overview-node:has(.kind-mark--disc):hover { box-shadow: none; }
.overview-node:has(.kind-mark--disc):hover .kind-mark--disc { border-color: var(--graph-hover-border); }
.overview-node:has(.kind-mark--disc):focus-visible { box-shadow: var(--focus-ring); }
</style>





