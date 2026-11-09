<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{
  steps: string[]
  skipLabel: string
  nextLabel: string
}>()

const emit = defineEmits<{ dismiss: [] }>()
const index = ref(0)
const step = computed(() => props.steps[index.value] ?? '')

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
  <aside class="coach" data-testid="coach-mark" role="note">
    <p>{{ step }}</p>
    <p class="progress">{{ index + 1 }} / {{ steps.length }}</p>
    <button type="button" @click="next">{{ nextLabel }}</button>
    <button type="button" @click="emit('dismiss')">{{ skipLabel }}</button>
  </aside>
</template>

<style scoped>
.coach {
  position: absolute;
  inset-block-end: var(--space-3);
  inset-inline-start: var(--space-3);
  /* Never under the zoom pad (bottom-right). The fit reserves this card's measured height. */
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
.progress { margin: 0; color: var(--color-text-muted); font-variant-numeric: tabular-nums; }
button { min-block-size: var(--viewer-hit-target); }
p { margin: 0; }
@media (max-width: 640px) {
  /* Compact bottom sheet above the footer / zoom pad; fit reserves this height so rings stay clear. */
  .coach {
    inset-block-start: auto;
    inset-block-end: var(--space-2);
    padding: var(--space-2);
    gap: var(--space-1) var(--space-2);
    font-size: var(--text-13, 0.8125rem);
    max-inline-size: min(20rem, calc(100% - var(--viewer-control-size, 2.75rem) - var(--space-8)));
  }
  .coach > p:first-child { flex-basis: 100%; }
}
</style>
