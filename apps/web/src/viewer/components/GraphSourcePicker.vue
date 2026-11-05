<script setup lang="ts">
import { ref } from 'vue'
import BrandMark from '../../components/brand/BrandMark.vue'

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
  body?: string
  copiedLabel?: string
}>()

const emit = defineEmits<{ sample: []; copy: [] }>()
const copied = ref(false)

function onCopy() {
  copied.value = true
  emit('copy')
}
</script>

<template>
  <div class="picker-wrap">
    <BrandMark class="watermark" variant="mono" :size="280" />
    <section class="picker" :class="{ 'is-dragging': dragging }">
      <h1>{{ title }}</h1>
      <label class="drop" for="graph-file">
        <span>{{ dragging ? dropOverlay : (body || dropHint) }}</span>
      </label>
      <div class="actions">
        <label class="choose" for="graph-file">{{ chooseLabel }}</label>
        <button type="button" class="primary" @click="emit('sample')">{{ sampleLabel }}</button>
      </div>
      <p>{{ privateLine }}</p>
      <p>{{ noFile }}</p>
      <p class="command" dir="ltr">
        <code>{{ command }}</code>
        <button type="button" @click="onCopy">{{ copied ? (copiedLabel || copyLabel) : copyLabel }}</button>
      </p>
      <p class="sr-only" role="status">{{ copied ? (copiedLabel || copyLabel) : '' }}</p>
    </section>
  </div>
</template>

<style scoped>
.picker-wrap {
  position: relative;
  display: grid;
  flex: 1;
  place-items: center;
  min-block-size: 100%;
  padding: var(--space-4);
}
.watermark {
  position: absolute;
  inline-size: var(--viewer-empty-mark-size);
  block-size: var(--viewer-empty-mark-size);
  opacity: var(--alpha-08);
  pointer-events: none;
}
.picker {
  position: relative;
  display: grid;
  gap: var(--space-3);
  max-inline-size: 32rem;
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: var(--color-surface-raised);
  box-shadow: var(--shadow-lg);
  border: 1px solid transparent;
}
.picker.is-dragging {
  border: var(--viewer-drop-border-width) dashed var(--color-brand-amber-ui);
}
.drop {
  display: grid;
  place-items: center;
  min-block-size: 8rem;
  padding: var(--space-4);
  border: var(--graph-node-border-width) dashed var(--viewer-control-border, var(--color-border-strong));
  border-radius: var(--radius-md);
}
.actions { display: flex; flex-wrap: wrap; gap: var(--space-2); }
button, .choose { min-block-size: var(--viewer-hit-target); }
.primary {
  background: var(--color-brand-amber-ui);
  color: var(--color-on-brand-amber);
  border: 0;
  border-radius: var(--radius-md);
  padding-inline: var(--space-3);
}
.command { display: flex; gap: var(--space-2); align-items: center; font-family: var(--font-family-mono); }
.sr-only { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip: rect(0 0 0 0); }
</style>
