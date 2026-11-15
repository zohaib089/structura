<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    steps: string[]
    skipLabel: string
    nextLabel: string
    /** Chip label when collapsed so the guide does not cover nodes at first paint. */
    openLabel?: string
  }>(),
  { openLabel: 'Tips' }
)

const emit = defineEmits<{ dismiss: [] }>()
const index = ref(0)
const step = computed(() => props.steps[index.value] ?? '')
/** Start collapsed (Tips chip) on every viewport so the guide never covers nodes at first paint. */
const expanded = ref(false)

function next() {
  if (index.value >= props.steps.length - 1) emit('dismiss')
  else index.value += 1
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('dismiss')
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <aside
    class="coach"
    :class="{ 'is-collapsed': !expanded }"
    data-testid="coach-mark"
    role="note"
  >
    <button
      v-if="!expanded"
      type="button"
      class="coach-chip"
      data-testid="coach-expand"
      :aria-label="openLabel"
      @click="expanded = true"
    >
      {{ openLabel }}
    </button>
    <template v-else>
      <p>{{ step }}</p>
      <p class="progress">{{ index + 1 }} / {{ steps.length }}</p>
      <button type="button" @click="next">{{ nextLabel }}</button>
      <button type="button" @click="emit('dismiss')">{{ skipLabel }}</button>
      <button
        type="button"
        class="coach-minify"
        data-testid="coach-collapse"
        aria-label="Minimise tips"
        @click="expanded = false"
      >
        –
      </button>
    </template>
  </aside>
</template>

<style scoped>
.coach {
  position: absolute;
  inset-block-end: var(--space-3);
  inset-inline-start: var(--space-3);
  max-inline-size: min(22rem, calc(100% - var(--viewer-control-size, 2.75rem) - var(--space-8)));
  z-index: var(--z-viewer-panel);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-surface-raised);
  box-shadow: var(--shadow-lg);
  pointer-events: auto;
}
.coach.is-collapsed {
  padding: 0;
  max-inline-size: none;
  background: transparent;
  box-shadow: none;
}
/* G4c shared control style: same border, radius, surface, text and states as the ZoomPad. */
.coach-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  min-block-size: 2.25rem;
  padding-inline: var(--space-3);
  border-radius: var(--r-md);
  border: 1px solid var(--viewer-control-border, var(--color-border));
  background: var(--color-surface-raised);
  color: var(--color-text-primary);
  font-size: var(--text-12, 0.75rem);
  font-weight: 600;
  cursor: pointer;
}
.coach-chip:hover { background: color-mix(in srgb, var(--color-text-primary) 8%, var(--color-surface-raised)); }
.coach-chip:focus-visible { outline: none; box-shadow: var(--focus-ring); border-color: var(--color-brand-amber-ui); }
.coach-minify {
  min-block-size: var(--viewer-hit-target);
  min-inline-size: 2rem;
  padding-inline: var(--space-2);
}
.progress { margin: 0; color: var(--color-text-muted); font-variant-numeric: tabular-nums; }
button { min-block-size: var(--viewer-hit-target); }
p { margin: 0; }
@media (max-width: 640px) {
  .coach:not(.is-collapsed) {
    inset-block-start: auto;
    inset-block-end: var(--space-2);
    padding: var(--space-2);
    gap: var(--space-1) var(--space-2);
    font-size: var(--text-13, 0.8125rem);
    max-inline-size: min(20rem, calc(100% - var(--viewer-control-size, 2.75rem) - var(--space-8)));
  }
  .coach:not(.is-collapsed) > p:first-child { flex-basis: 100%; }
}
</style>
