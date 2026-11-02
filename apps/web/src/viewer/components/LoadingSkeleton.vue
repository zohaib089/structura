<script setup lang="ts">
defineProps<{ label: string; cancelLabel: string }>()
const emit = defineEmits<{ cancel: [] }>()
</script>

<template>
  <div class="skeleton" role="status">
    <p>{{ label }}</p>
    <div class="line" role="progressbar" :aria-valuetext="label"></div>
    <div class="shapes" aria-hidden="true">
      <span v-for="item in 5" :key="item" class="cluster" :style="{ '--row': item - 1 }"></span>
    </div>
    <button type="button" @click="emit('cancel')">{{ cancelLabel }}</button>
  </div>
</template>

<style scoped>
.skeleton {
  display: grid;
  gap: var(--space-3);
  justify-items: center;
  padding: var(--space-6);
}
.line {
  inline-size: min(16rem, 80%);
  block-size: var(--graph-budget-height);
  background: var(--color-border);
}
.shapes { position: relative; inline-size: 100%; min-block-size: 18rem; }
.cluster {
  position: absolute;
  inset-inline-start: 30%;
  inset-block-start: calc(var(--row) * 3.25rem);
  inline-size: 10rem;
  block-size: var(--graph-node-height);
  border-radius: var(--radius-lg);
  background: var(--surface-tint);
  border-inline-start: 3px solid var(--graph-layer-1);
}
@media (prefers-reduced-motion: no-preference) {
  .line { background: linear-gradient(90deg, var(--color-border), var(--color-text-muted), var(--color-border)); background-size: 200% 100%; animation: read var(--duration-slow) linear infinite; }
}
@keyframes read { to { background-position: -200% 0; } }
button { min-block-size: var(--viewer-hit-target); }
</style>
