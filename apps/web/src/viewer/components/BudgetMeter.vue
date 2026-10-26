<script setup lang="ts">
defineProps<{
  text: string
  ratio: number
  warn: boolean
  full: boolean
  nearLabel: string
  fullLabel: string
  hiddenLabel: string
}>()
</script>

<template>
  <div class="meter" role="status">
    <p>{{ text }}</p>
    <div class="bar" aria-hidden="true">
      <span :style="{ inlineSize: `${Math.min(ratio, 1) * 100}%` }" :class="{ warn, full }" />
    </div>
    <p v-if="full">{{ fullLabel }}</p>
    <p v-else-if="warn">{{ nearLabel }}</p>
    <button v-if="hiddenLabel" type="button">{{ hiddenLabel }}</button>
  </div>
</template>

<style scoped>
.meter { display: flex; align-items: center; gap: var(--space-2); min-inline-size: 0; }
.bar {
  inline-size: 6rem;
  block-size: var(--graph-budget-height);
  background: var(--color-border);
}
.bar span { display: block; block-size: 100%; background: var(--color-text-secondary); }
.bar span.warn, .warn { color: var(--color-warning); }
.bar span.warn { background: var(--color-warning); }
.bar span.full { background: var(--color-danger); }
button { background: transparent; color: inherit; border: 0; }
</style>
