<script setup lang="ts">
import { CircleDashed } from '@lucide/vue'

defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <div class="ui-empty-state">
    <CircleDashed class="ui-empty-state__icon" aria-hidden="true" :size="24" />
    <h3 class="ui-empty-state__title">{{ title }}</h3>
    <p v-if="description" class="ui-empty-state__body">{{ description }}</p>
    <div v-if="$slots.action" class="ui-empty-state__action">
      <slot name="action" />
    </div>
  </div>
</template>

<style scoped>
.ui-empty-state {
  display: grid;
  justify-items: center;
  gap: var(--space-2);
  padding: var(--space-6);
  text-align: center;
}

.ui-empty-state__icon {
  color: var(--color-text-muted);
}

.ui-empty-state__title {
  margin: 0;
  font-size: var(--text-16);
  line-height: var(--text-16-lh);
  font-weight: var(--font-weight-semibold);
}

.ui-empty-state__body {
  margin: 0;
  max-width: 28rem;
  font-size: var(--text-14);
  line-height: var(--text-14-lh);
  color: var(--color-text-secondary);
}

.ui-empty-state__action {
  margin-top: var(--space-2);
}
</style>
