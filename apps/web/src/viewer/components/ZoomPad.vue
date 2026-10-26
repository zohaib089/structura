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
    <button type="button" :aria-label="zoomFit" @click="fit()">0</button>
  </Panel>
</template>

<style scoped>
.zoom { display: grid; }
button {
  min-inline-size: var(--viewer-control-size);
  min-block-size: var(--viewer-hit-target);
}
</style>
