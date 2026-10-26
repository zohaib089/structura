<script setup lang="ts">
import { Panel, useVueFlow } from '@vue-flow/core'

defineProps<{ zoomIn: string; zoomOut: string; zoomFit: string }>()

const flow = useVueFlow()

function fit() {
  void flow.fitView({ duration: 0, padding: 0.2, maxZoom: 1.15 })
}
</script>

<template>
  <Panel position="bottom-left" class="zoom">
    <button type="button" :aria-label="zoomIn" @click="flow.zoomIn()">+</button>
    <button type="button" :aria-label="zoomOut" @click="flow.zoomOut()">−</button>
    <button type="button" :aria-label="zoomFit" @click="fit()">Fit</button>
  </Panel>
</template>

<style scoped>
.zoom {
  display: grid;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-raised);
}
button {
  min-inline-size: var(--viewer-control-size, 2.75rem);
  min-block-size: var(--viewer-hit-target, 2.75rem);
  padding-inline: var(--space-2);
  border: 0;
  border-block-start: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-primary);
}
button:first-child { border-block-start: 0; }
</style>
