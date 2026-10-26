<script setup lang="ts">
import { useVueFlow } from '@vue-flow/core'
import { watch } from 'vue'

const props = defineProps<{ signature: string }>()
const flow = useVueFlow()

function fit() {
  void flow.fitView({ duration: 0, padding: 0.2, maxZoom: 1.15 })
}

watch(() => props.signature, () => fit())
flow.onNodesInitialized(() => fit())
</script>

<template>
  <span class="fit-frame" aria-hidden="true"></span>
</template>

<style scoped>
.fit-frame { display: none; }
</style>
