<script setup lang="ts">
import { SlidersHorizontal, X } from '@lucide/vue'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { FOCUS_DEPTH_MAX } from '../caps'
import { middleEllipsis } from '../pill-label'

const props = defineProps<{
  label: string
  name: string
  dependencies: string
  dependents: string
  both: string
  depthLabel: string
  confirmedOnly: string
  confirmed: string
  possible: string
  unresolved: string
  none: string
  exit: string
  direction: 'in' | 'out' | 'both'
  depth: number
  confirmedOnlyOn: boolean
  chip?: string
  escHint?: string
  optionsLabel?: string
  directionLabel?: string
}>()

const emit = defineEmits<{
  direction: [value: 'in' | 'out' | 'both']
  depth: [value: number]
  confirmed: []
  exit: []
}>()

// Phone: the chip keeps a readable middle-ellipsis name (start + tail + extension); the full name is the tooltip.
const shortName = computed(() => middleEllipsis(props.name, 15))

// Options popover: direction, depth and confirmed-only. Esc closes it and focus goes back to the trigger.
const open = ref(false)
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const panel = ref<HTMLElement | null>(null)
const panelId = `focus-options-${Math.random().toString(36).slice(2, 8)}`
function close(returnFocus = true) {
  if (!open.value) return
  open.value = false
  if (returnFocus) void nextTick(() => trigger.value?.focus())
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) {
    event.stopPropagation()
    event.preventDefault()
    close()
  }
}
function onPointerDown(event: PointerEvent) {
  if (open.value && root.value && !root.value.contains(event.target as Node)) close(false)
}
watch(open, (value) => {
  if (value) {
    document.addEventListener('pointerdown', onPointerDown, true)
    void nextTick(() => panel.value?.querySelector<HTMLElement>('button[aria-pressed="true"], button, input')?.focus())
  } else document.removeEventListener('pointerdown', onPointerDown, true)
})
onBeforeUnmount(() => document.removeEventListener('pointerdown', onPointerDown, true))
</script>

<template>
  <!-- One compact chip under the toolbar: the focused file, its depth (− / +) and Exit. Direction stays
       on Dependencies (the default); the summary lines are announced, not painted, so nothing overlaps. -->
  <div ref="root" class="focus" role="region" :aria-label="label" data-testid="focus-chip" @keydown="onKeydown">
    <span v-if="chip" class="visually-hidden">{{ chip }}</span>
    <strong class="name name-full" dir="ltr" :title="name">{{ name }}</strong>
    <strong class="name name-short" dir="ltr" :title="name" aria-hidden="true">{{ shortName }}</strong>
    <span class="depth">
      <button type="button" class="step" :aria-label="`${depthLabel} −`" :disabled="depth <= 1" @click="emit('depth', Math.max(1, depth - 1))">−</button>
      <span class="depth-text">{{ depthLabel }}</span>
      <button type="button" class="step" :aria-label="`${depthLabel} +`" :disabled="depth >= FOCUS_DEPTH_MAX" @click="emit('depth', Math.min(FOCUS_DEPTH_MAX, depth + 1))">+</button>
    </span>
    <span v-if="none" class="none">{{ none }}</span>
    <span class="visually-hidden" aria-live="polite">{{ [confirmed, possible, unresolved].filter(Boolean).join(' · ') }}</span>
    <button
      ref="trigger"
      type="button"
      class="exit"
      aria-haspopup="dialog"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-controls="panelId"
      data-testid="focus-options"
      :title="optionsLabel ?? 'Options'"
      @click="open ? close() : (open = true)"
    >
      <SlidersHorizontal :size="14" aria-hidden="true" />
      <span class="exit-label">{{ optionsLabel ?? 'Options' }}</span>
    </button>
    <div v-if="open" :id="panelId" ref="panel" class="popover" role="dialog" :aria-label="optionsLabel ?? 'Options'" data-testid="focus-options-panel">
      <fieldset class="group">
        <legend>{{ directionLabel ?? 'Show' }}</legend>
        <div class="seg">
          <button type="button" :aria-pressed="direction === 'out'" @click="emit('direction', 'out')">{{ dependencies }}</button>
          <button type="button" :aria-pressed="direction === 'in'" @click="emit('direction', 'in')">{{ dependents }}</button>
          <button type="button" :aria-pressed="direction === 'both'" @click="emit('direction', 'both')">{{ both }}</button>
        </div>
      </fieldset>
      <label class="row">
        <span>{{ depthLabel }}</span>
        <input type="range" min="1" :max="FOCUS_DEPTH_MAX" :value="depth" :aria-label="depthLabel" @input="emit('depth', Number(($event.target as HTMLInputElement).value))" />
      </label>
      <label class="row check"><input type="checkbox" :checked="confirmedOnlyOn" @change="emit('confirmed')" /><span>{{ confirmedOnly }}</span></label>
      <p class="summary">{{ [confirmed, possible, unresolved].filter(Boolean).join(' · ') }}</p>
    </div>
    <button type="button" class="exit" :title="exit" :aria-keyshortcuts="escHint === 'Esc' ? 'Escape' : undefined" @click="emit('exit')">
      <X :size="14" aria-hidden="true" />
      <span class="exit-label">{{ exit }}</span>
    </button>
  </div>
</template>

<style scoped>
.focus {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  max-inline-size: 100%;
  padding: 2px var(--space-1) 2px var(--space-3);
  border: 1px solid color-mix(in srgb, var(--color-brand-amber-ui) 45%, var(--color-border));
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-brand-amber-ui) 10%, var(--color-surface-raised));
  color: var(--color-text);
  font-size: var(--font-size-sm, 0.8125rem);
  pointer-events: auto;
}
.name { min-inline-size: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; max-inline-size: 18rem; }
.depth { display: inline-flex; align-items: center; gap: 2px; color: var(--color-text-muted); white-space: nowrap; font-variant-numeric: tabular-nums; }
.step, .exit {
  display: inline-flex; align-items: center; justify-content: center; gap: 4px;
  min-block-size: 1.75rem; border: 1px solid transparent; border-radius: 999px;
  background: transparent; color: inherit; font: inherit; cursor: pointer;
}
.step { inline-size: 1.75rem; }
.step:disabled { opacity: 0.4; cursor: default; }
.exit { padding-inline: var(--space-2); border-color: var(--color-border); background: var(--color-surface); white-space: nowrap; }
.step:hover:not(:disabled), .exit:hover { border-color: var(--color-brand-amber-ui); }
.step:focus-visible, .exit:focus-visible { outline: none; box-shadow: var(--focus-ring); }
.none { color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-inline-size: 0; }
.popover {
  position: absolute; inset-block-start: calc(100% + var(--space-2)); inset-inline-end: 0; z-index: 5;
  display: grid; gap: var(--space-2); inline-size: max-content; max-inline-size: min(20rem, 90vw);
  padding: var(--space-3); border: 1px solid var(--color-border); border-radius: var(--r-md);
  background: var(--color-surface-raised); box-shadow: var(--shadow-md); text-align: start;
}
.group { margin: 0; padding: 0; border: 0; display: grid; gap: var(--space-1); }
.group legend { padding: 0; color: var(--color-text-muted); font-size: 0.75rem; }
.seg { display: inline-flex; border: 1px solid var(--color-border); border-radius: var(--r-sm); overflow: hidden; }
.seg button { min-block-size: 1.75rem; padding-inline: var(--space-2); border: 0; background: transparent; color: inherit; font: inherit; cursor: pointer; }
.seg button + button { border-inline-start: 1px solid var(--color-border); }
.seg button[aria-pressed='true'] { background: color-mix(in srgb, var(--color-brand-amber-ui) 22%, transparent); font-weight: 600; }
.seg button:focus-visible, .row input:focus-visible { outline: none; box-shadow: var(--focus-ring); }
.row { display: flex; align-items: center; gap: var(--space-2); justify-content: space-between; }
.row.check { justify-content: flex-start; }
.summary { margin: 0; color: var(--color-text-muted); font-size: 0.75rem; }
.visually-hidden { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.name-short { display: none; }
@media (max-width: 640px) {
  .none, .depth-text { display: none; }
  /* Phone: the name gets the room; Options / Exit are icon buttons (labels stay for screen readers). */
  .name { max-inline-size: 10rem; }
  .name-full { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .name-short { display: block; }
  .exit { inline-size: 1.75rem; padding-inline: 0; }
  .exit-label { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
}
</style>
