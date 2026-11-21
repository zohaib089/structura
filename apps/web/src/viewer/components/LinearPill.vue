<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import { computed, ref, useId } from 'vue'
import { middleEllipsis, pillCharBudget } from '../pill-label'
import { LINEAR_PILL_WIDTH, LINEAR_PILL_WIDTH_PHONE } from '../linear'
import BrandMark from '../../components/brand/BrandMark.vue'

const props = defineProps<{
  id: string
  label: string
  path: string
  kind: string
  cluster: boolean
  clusterSize: number
  expanded: boolean
  more: boolean
  remainder: number
  selected: boolean
  nucleus: boolean
  dimmed: boolean
  tabIndex: number
  moreLabel: string
  groupLabel: string
}>()

const emit = defineEmits<{ select: []; toggle: [] }>()

const control = computed(() => props.cluster || props.more)
/** Full name for hover / focus and screen readers; the pill itself ellipsizes. */
const full = computed(() => {
  if (props.more) return props.moreLabel
  if (props.cluster) return `${props.path || props.label} · ${props.groupLabel}`
  return props.path || props.label
})
const text = computed(() => (props.more ? props.moreLabel : props.label))
/** Middle-ellipsis names for the desktop and phone pill widths (CSS picks one); the extension and the
 * distinguishing tail stay visible instead of a plain end-cut. The tooltip carries the full name. */
const budget = (width: number) => pillCharBudget(width, { mark: props.nucleus || props.cluster || props.more, count: props.cluster, bold: props.nucleus })
const wide = computed(() => (props.more ? text.value : middleEllipsis(text.value, budget(LINEAR_PILL_WIDTH))))
const narrow = computed(() => (props.more ? text.value : middleEllipsis(text.value, budget(LINEAR_PILL_WIDTH_PHONE))))
const tipId = useId()
const tipDismissed = ref(false)

function activate() {
  if (control.value) emit('toggle')
  else emit('select')
}
</script>

<template>
  <div
    class="linear-pill"
    :class="{
      'is-selected': selected,
      'is-nucleus': nucleus,
      'is-dimmed': dimmed,
      'is-external': kind === 'external',
      'is-unresolved': kind === 'unresolved',
      'is-group': cluster,
      'is-more': more
    }"
    :data-node-id="id"
    :data-testid="more ? 'linear-more' : cluster ? 'linear-group' : nucleus ? 'linear-nucleus' : 'linear-pill'"
    :data-expanded="cluster ? String(expanded) : undefined"
    :tabindex="tabIndex"
    role="treeitem"
    :aria-selected="selected"
    :aria-expanded="cluster ? expanded : undefined"
    :aria-label="full"
    :aria-describedby="tipId"
    @keydown.esc="tipDismissed = true"
    @blur="tipDismissed = false"
    @mouseleave="tipDismissed = false"
    @click.stop="activate"
    @keydown.enter.prevent="activate"
    @keydown.space.prevent="emit('toggle')"
  >
    <Handle type="target" :position="Position.Left" />
    <BrandMark v-if="nucleus" class="mark" size="18px" />
    <span v-else-if="cluster" class="mark" aria-hidden="true">{{ expanded ? '▾' : '▸' }}</span>
    <span v-else-if="more" class="mark" aria-hidden="true">+</span>
    <span class="text text-wide" dir="ltr" aria-hidden="true">{{ wide }}</span>
    <span class="text text-narrow" dir="ltr" aria-hidden="true">{{ narrow }}</span>
    <span v-if="cluster" class="count">{{ groupLabel }}</span>
    <span :id="tipId" class="full" :class="{ 'is-dismissed': tipDismissed }" role="tooltip" dir="ltr">{{ full }}</span>
    <Handle type="source" :position="Position.Right" />
  </div>
</template>

<style scoped>
.linear-pill {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  box-sizing: border-box;
  inline-size: 184px;
  block-size: 32px;
  padding-inline: 12px;
  border: 1px solid #9fb6ea;
  border-radius: 16px;
  background: #1f3360;
  color: #e8eefc;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 12.5px;
  cursor: pointer;
}
@media (max-width: 640px) {
  .linear-pill { inline-size: 148px; }
  .text-wide { display: none; }
}
@media (min-width: 641px) {
  .text-narrow { display: none; }
}
.linear-pill:focus-visible { outline: 2px solid var(--color-focus, #f1b24a); outline-offset: 2px; }
.text { flex: 1; min-inline-size: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mark { display: inline-flex; flex: none; color: #9fb6ea; }
.count { flex: none; color: #9fb6ea; font-size: 11px; }
.is-external, .is-unresolved { border-style: dashed; background: #18233d; }
.is-group { background: #172a4f; font-family: var(--font-sans, system-ui, sans-serif); }
.is-more { justify-content: center; border-style: dotted; background: transparent; color: #9fb6ea; font-family: var(--font-sans, system-ui, sans-serif); }
.is-nucleus { border-color: #f1b24a; background: #e9a53a; color: #10172a; font-weight: 600; box-shadow: 0 0 0 4px rgba(233, 165, 58, 0.22); }
.is-nucleus .mark { color: #10172a; }
.is-selected:not(.is-nucleus) { border-color: #f1b24a; box-shadow: 0 0 0 2px rgba(241, 178, 74, 0.45); }
.is-dimmed { opacity: 0.45; }
.full {
  position: absolute;
  inset-block-end: calc(100% + 6px);
  inset-inline-start: 0;
  z-index: 5;
  display: none;
  padding: 3px 8px;
  border-radius: 6px;
  background: #0b1424;
  color: #e8eefc;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
  font-size: 12px;
  white-space: nowrap;
  pointer-events: none;
}
.linear-pill:hover .full, .linear-pill:focus-visible .full { display: block; }
.linear-pill .full.is-dismissed { display: none; }
:deep(.vue-flow__handle) { opacity: 0; inset-block-start: 50%; }
</style>
