<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import { computed } from 'vue'
import RadialNodeGlyph from '../../components/graph/RadialNodeGlyph.vue'
import { nodeFrameSize } from '../../components/graph/radial-geometry'
import type { SeverityCounts } from '../../services/scan-report-tree'

type RadialSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info'

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
  severity?: RadialSeverity
  hot?: boolean
  deg?: number
}>()

const emit = defineEmits<{ select: []; toggle: []; hover: []; unhover: []; focus: []; blur: [] }>()

const accessible = computed(() => (props.more ? props.moreLabel : props.label))
const frame = computed(() => nodeFrameSize(props.depth ?? 1, Boolean(props.nucleus)))
const shownSeverity = computed<RadialSeverity>(() => props.severity ?? 'info')

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
    class="overview-node radial__node"
    :class="{
      'radial__node--entry': nucleus,
      [`radial__node--ring-${depth ?? 0}`]: true,
      'is-selected': selected,
      'is-hot': hot,
      'is-nucleus': nucleus,
      'is-dimmed': dimmed,
      'is-more': more,
      'is-cluster': cluster,
      'is-file': kind === 'file',
      'is-external': kind === 'external',
      'is-unresolved': kind === 'unresolved',
      'radial__node--unresolved': kind === 'unresolved',
      'is-expanded': expanded,
      'is-entering': entering
    }"
    :style="{ width: `${frame}px`, height: `${frame}px`, animationDelay: `${enterDelay ?? 0}ms` }"
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
    @mouseenter="emit('hover')"
    @mouseleave="emit('unhover')"
    @focus="emit('focus')"
    @blur="emit('blur')"
  >
    <Handle type="target" :position="Position.Top" class="radial-handle" />
    <svg class="radial-node-svg" :viewBox="`0 0 ${frame} ${frame}`" :width="frame" :height="frame" aria-hidden="true">
      <g :transform="`translate(${frame / 2} ${frame / 2})`">
        <RadialNodeGlyph
          :label="more ? moreLabel : label"
          :ring="depth ?? 1"
          :severity="shownSeverity"
          :deg="deg ?? 0"
          :entry="nucleus"
        />
      </g>
    </svg>
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
    <Handle type="source" :position="Position.Bottom" class="radial-handle" />
  </div>
</template>

<style scoped>
.overview-node {
  position: relative;
  display: block;
  padding: 0;
  border: 0;
  background: transparent;
  overflow: visible;
  box-sizing: border-box;
}
.radial-node-svg {
  display: block;
  overflow: visible;
  inline-size: 100%;
  block-size: 100%;
}
.radial-handle {
  left: 50%;
  top: 50%;
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, -50%);
}
.node-toggle {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  border: 0;
  padding: 0;
}
.is-selected {
  --radial-select: var(--graph-selected-ring, var(--color-brand-amber-ui));
}
.is-selected .radial__halo {
  stroke: var(--radial-select, var(--color-brand-amber-ui));
}
.overview-node:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
.is-dimmed {
  opacity: 0.45;
}
</style>





