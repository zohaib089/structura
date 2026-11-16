<script setup lang="ts">
import { X } from '@lucide/vue'
import { FOCUS_DEPTH_MAX } from '../caps'

defineProps<{
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
}>()

const emit = defineEmits<{
  direction: [value: 'in' | 'out' | 'both']
  depth: [value: number]
  confirmed: []
  exit: []
}>()
</script>

<template>
  <!-- One compact chip under the toolbar: the focused file, its depth (− / +) and Exit. Direction stays
       on Dependencies (the default); the summary lines are announced, not painted, so nothing overlaps. -->
  <div class="focus" role="region" :aria-label="label" data-testid="focus-chip">
    <span v-if="chip" class="visually-hidden">{{ chip }}</span>
    <strong class="name" dir="ltr" :title="name">{{ name }}</strong>
    <span class="depth">
      <button type="button" class="step" :aria-label="`${depthLabel} −`" :disabled="depth <= 1" @click="emit('depth', Math.max(1, depth - 1))">−</button>
      <span class="depth-text">{{ depthLabel }}</span>
      <button type="button" class="step" :aria-label="`${depthLabel} +`" :disabled="depth >= FOCUS_DEPTH_MAX" @click="emit('depth', Math.min(FOCUS_DEPTH_MAX, depth + 1))">+</button>
    </span>
    <span v-if="none" class="none">{{ none }}</span>
    <span class="visually-hidden" aria-live="polite">{{ [confirmed, possible, unresolved].filter(Boolean).join(' · ') }}</span>
    <button type="button" class="exit" :aria-keyshortcuts="escHint === 'Esc' ? 'Escape' : undefined" @click="emit('exit')">
      <X :size="14" aria-hidden="true" />
      <span>{{ exit }}</span>
    </button>
  </div>
</template>

<style scoped>
.focus {
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
.visually-hidden { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
@media (max-width: 640px) {
  .none, .depth-text { display: none; }
  .name { max-inline-size: 9rem; }
}
</style>
