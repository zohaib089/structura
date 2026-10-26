<script setup lang="ts">
defineProps<{
  title: string
  dropHint: string
  chooseLabel: string
  sampleLabel: string
  privateLine: string
  noFile: string
  command: string
  copyLabel: string
  dragging: boolean
  dropOverlay: string
}>()

const emit = defineEmits<{ sample: []; copy: [] }>()
</script>

<template>
  <div class="picker-wrap">
    <section class="picker">
      <h1>{{ title }}</h1>
      <label class="drop" for="graph-file" :class="{ 'is-dragging': dragging }">
        <span>{{ dragging ? dropOverlay : dropHint }}</span>
      </label>
      <label class="choose" for="graph-file">{{ chooseLabel }}</label>
      <button type="button" class="primary" @click="emit('sample')">{{ sampleLabel }}</button>
      <p>{{ privateLine }}</p>
      <p>{{ noFile }}</p>
      <p class="command" dir="ltr"><code>{{ command }}</code>
        <button type="button" @click="emit('copy')">{{ copyLabel }}</button>
      </p>
    </section>
  </div>
</template>

<style scoped>
.picker-wrap { display: grid; place-items: center; min-block-size: 100%; padding: var(--space-4); }
.picker {
  display: grid;
  gap: var(--space-3);
  max-inline-size: 32rem;
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: var(--color-surface-raised);
}
.drop {
  display: grid;
  place-items: center;
  min-block-size: 8rem;
  padding: var(--space-4);
  border: var(--graph-node-border-width) dashed var(--color-border-strong);
  border-radius: var(--radius-md);
}
.drop.is-dragging { background: var(--surface-brand-soft); }
button, .choose { min-block-size: var(--viewer-hit-target); }
.primary { background: var(--color-brand-amber-ui); color: var(--color-on-brand-amber); border: 0; }
.command { display: flex; gap: var(--space-2); align-items: center; font-family: var(--font-family-mono); }
</style>
