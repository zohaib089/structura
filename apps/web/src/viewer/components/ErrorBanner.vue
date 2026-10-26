<script setup lang="ts">
defineProps<{
  title: string
  body: string
  paths: string[]
  moreLabel: string
  chooseLabel: string
  copyLabel: string
}>()

const emit = defineEmits<{ choose: []; copy: [] }>()
</script>

<template>
  <section class="error-banner" data-testid="error-banner" role="alert">
    <h2>{{ title }}</h2>
    <p>{{ body }}</p>
    <ul v-if="paths.length">
      <li v-for="path in paths" :key="path" dir="ltr">{{ path }}</li>
    </ul>
    <p v-if="moreLabel">{{ moreLabel }}</p>
    <div class="actions">
      <button type="button" @click="emit('choose')">{{ chooseLabel }}</button>
      <button type="button" @click="emit('copy')">{{ copyLabel }}</button>
    </div>
  </section>
</template>

<style scoped>
.error-banner {
  inline-size: min(36rem, calc(100% - var(--space-6)));
  margin-block: auto;
  margin-inline: auto;
  padding: var(--space-4);
  border: var(--graph-node-border-width, 1.5px) solid var(--color-danger);
  border-radius: var(--radius-md);
  background: var(--color-surface-raised);
}
.actions { display: flex; gap: var(--space-2); }
button {
  min-block-size: var(--viewer-hit-target);
  padding-inline: var(--space-3);
}
</style>
