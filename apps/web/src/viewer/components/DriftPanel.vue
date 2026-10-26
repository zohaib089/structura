<script setup lang="ts">
defineProps<{
  title: string
  body: string
  status: string
  snippetLabel: string
  snippet: string
  copyLabel: string
}>()

const emit = defineEmits<{ copy: [] }>()
</script>

<template>
  <section>
    <p>{{ status }}</p>
    <h3>{{ title }}</h3>
    <p>{{ body }}</p>
    <p>{{ snippetLabel }}</p>
    <pre dir="ltr">{{ snippet }}</pre>
    <button type="button" @click="emit('copy')">{{ copyLabel }}</button>
  </section>
</template>

<style scoped>
pre {
  white-space: pre-wrap;
  font-family: var(--font-family-mono);
  background: var(--color-surface);
  padding: var(--space-2);
}
button { min-block-size: var(--viewer-hit-target); }
</style>
