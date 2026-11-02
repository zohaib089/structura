<script setup lang="ts">
import { Panel, useVueFlow } from '@vue-flow/core'
import Tip from './Tip.vue'

defineProps<{ zoomIn: string; zoomOut: string; zoomFit: string }>()

const flow = useVueFlow()

function fit() {
  void flow.fitView({ duration: 0, padding: 0.2, maxZoom: 1.15 })
}
</script>

<template>
  <Panel position="bottom-right" class="zoom">
    <Tip :text="zoomIn"><button type="button" :aria-label="zoomIn" @click="flow.zoomIn()">+</button></Tip>
    <Tip :text="zoomOut"><button type="button" :aria-label="zoomOut" @click="flow.zoomOut()">−</button></Tip>
    <Tip :text="zoomFit"><button type="button" :aria-label="zoomFit" @click="fit()">Fit</button></Tip>
  </Panel>
</template>

<style scoped>
.zoom {
  display: flex;
  flex-direction: column;
  overflow: visible;
  border: 1px solid var(--viewer-control-border, var(--color-border));
  border-radius: var(--radius-md);
  background: var(--color-surface-raised);
}
.zoom :deep(.tip) { display: flex; }
button {
  inline-size: 100%;
  min-inline-size: var(--viewer-control-size, 2.75rem);
  min-block-size: var(--viewer-hit-target, 2.75rem);
  background: transparent;
  color: var(--color-text-primary);
}
.zoom :deep(.tip:first-child) button { border-block-start: 0; }
</style>
