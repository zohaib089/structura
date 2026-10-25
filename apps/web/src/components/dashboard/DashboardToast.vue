<script setup lang="ts">
defineProps<{
  message: string
  dismissLabel: string
}>()

defineEmits<{
  dismiss: []
}>()
</script>

<template>
  <div class="dashboard-toast" role="status" aria-live="polite" :aria-label="message">
    <span class="toast-indicator" aria-hidden="true">✓</span>
    <p>{{ message }}</p>
    <button type="button" :aria-label="dismissLabel" @click="$emit('dismiss')">×</button>
  </div>
</template>

<style scoped>
.dashboard-toast {
  position: fixed;
  z-index: 20;
  inset-block-start: var(--space-5);
  inset-inline-end: var(--space-5);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: min(420px, calc(100vw - var(--space-8)));
  padding: var(--space-3) var(--space-4);
  border: 1px solid color-mix(in srgb, var(--color-success) var(--alpha-40), var(--color-border));
  border-radius: var(--radius-lg);
  background: var(--color-surface-raised);
  color: var(--color-text-primary);
  box-shadow: var(--shadow-md);
}

.dashboard-toast p {
  flex: 1;
  margin: 0;
}

.toast-indicator {
  display: grid;
  width: 1.5rem;
  height: 1.5rem;
  place-items: center;
  border-radius: 50%;
  background: color-mix(in srgb, var(--color-success) var(--alpha-12), transparent);
  color: var(--color-success);
  font-weight: var(--font-weight-bold);
}

.dashboard-toast button {
  border: 0;
  background: transparent;
  color: var(--color-text-secondary);
  font: inherit;
  font-size: var(--font-size-xl);
  cursor: pointer;
}
</style>
