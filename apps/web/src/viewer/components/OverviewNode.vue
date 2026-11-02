<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import { computed } from 'vue'

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
}>()

const emit = defineEmits<{ select: []; toggle: [] }>()

const accessible = computed(() => (props.more ? props.moreLabel : props.label))

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
    <Handle type="target" :position="Position.Left" />
    <span v-if="cluster" class="kind-mark" aria-hidden="true">{{ expanded ? 'â¾' : 'â¸' }}</span>
    <span v-else-if="more" class="kind-mark" aria-hidden="true">+</span>
    <span v-else-if="kind === 'unresolved'" class="kind-mark" aria-hidden="true">?</span>
    <span v-else-if="kind === 'file'" class="kind-mark" aria-hidden="true">{{ (language || 'â¢').slice(0, 1) }}</span>
    <span v-else class="kind-mark" aria-hidden="true">â¢</span>
    <span class="label" dir="ltr">{{ more ? moreLabel : label }}</span>
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
    <Handle type="source" :position="Position.Right" />
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
  background: var(--surface-tint, var(--graph-cluster-fill));
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
.count, .kind-mark { color: var(--color-text-secondary); }
</style>





