<script setup lang="ts">
import { ref } from 'vue'
import Button from './Button.vue'

defineProps<{
  title?: string
  message: string
  details?: string
  retryLabel: string
  detailsLabel?: string
}>()

const emit = defineEmits<{ retry: [] }>()

const detailsOpen = ref(false)
</script>

<template>
  <section class="ui-error-state" role="alert" data-testid="error-state">
    <h3 v-if="title" class="ui-error-state__title">{{ title }}</h3>
    <p class="ui-error-state__message">{{ message }}</p>
    <div class="ui-error-state__actions">
      <Button variant="secondary" size="sm" @click="emit('retry')">{{ retryLabel }}</Button>
      <Button
        v-if="details"
        variant="ghost"
        size="sm"
        type="button"
        @click="detailsOpen = !detailsOpen"
      >
        {{ detailsLabel ?? 'Details' }}
      </Button>
    </div>
    <pre v-if="details && detailsOpen" class="ui-error-state__details">{{ details }}</pre>
  </section>
</template>

<style scoped>
.ui-error-state {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-4);
  border: 1px solid var(--sev-critical-border);
  border-radius: var(--r-md);
  background: color-mix(in srgb, var(--sev-critical-bg) 80%, var(--color-surface));
}

.ui-error-state__title {
  margin: 0;
  font-size: var(--text-14);
  line-height: var(--text-14-lh);
  font-weight: var(--font-weight-semibold);
}

.ui-error-state__message {
  margin: 0;
  font-size: var(--text-14);
  line-height: var(--text-14-lh);
  color: var(--color-text-primary);
}

.ui-error-state__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.ui-error-state__details {
  margin: 0;
  padding: var(--space-3);
  border-radius: var(--r-sm);
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  font-family: var(--font-family-mono, ui-monospace, monospace);
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
