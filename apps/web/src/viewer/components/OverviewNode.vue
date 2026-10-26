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
    :class="{ 'is-selected': selected, 'is-dimmed': dimmed, 'is-more': more, 'is-cluster': cluster }"
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
    :title="label || moreLabel"
    @click.stop="emit('select')"
    @dblclick.stop.prevent="emit('toggle')"
    @keydown.enter.prevent="onEnter"
    @keydown.space.prevent="onSpace"
  >
    <Handle type="target" :position="Position.Left" />
    <span v-if="cluster" class="kind-mark" aria-hidden="true">{{ expanded ? '▾' : '▸' }}</span>
    <span v-else-if="more" class="kind-mark" aria-hidden="true">+</span>
    <span v-else class="kind-mark" aria-hidden="true">•</span>
    <span class="label" dir="ltr">{{ more ? moreLabel : label }}</span>
    <span v-if="cluster" class="count">{{ clusterSize }}</span>
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
.is-cluster { background: var(--graph-cluster-fill, var(--color-surface)); }
.is-more {
  border-style: dashed;
  border-color: var(--graph-ghost-border, var(--color-border-strong));
}
.is-selected {
  outline: var(--graph-selected-width, 2px) solid var(--graph-selected-ring, var(--color-accent-primary));
  box-shadow: var(--graph-selected-halo, none);
}
.is-dimmed { opacity: var(--graph-dim-opacity, 0.45); }
.overview-node:focus-visible {
  outline: var(--graph-selected-width) solid var(--graph-selected-ring);
  outline-offset: var(--space-1);
}
.label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  unicode-bidi: isolate;
}
.count, .kind-mark { color: var(--color-text-secondary); }
.node-toggle {
  margin-inline-start: auto;
  min-inline-size: var(--viewer-hit-target, 2.75rem);
  min-block-size: var(--viewer-hit-target, 2.75rem);
  border: 0;
  background: transparent;
  color: inherit;
}
</style>
