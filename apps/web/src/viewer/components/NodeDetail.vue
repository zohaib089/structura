<script setup lang="ts">
defineProps<{
  empty: string
  kindLabel: string
  pathLabel: string
  spanLabel: string
  provenanceLabel: string
  confidenceLabel: string
  reasonLabel: string
  internalLabel: string
  weightLabel: string
  focusLabel: string
  detail: {
    title: string
    kind: string
    path: string
    span: string
    provenance: string
    confidence: string
    reason: string
    internal: string
    weight: string
  } | null
}>()

const emit = defineEmits<{ focus: [] }>()
</script>

<template>
  <section data-testid="node-detail">
    <p v-if="!detail">{{ empty }}</p>
    <template v-else>
      <h3 dir="ltr">{{ detail.title }}</h3>
      <dl>
        <div><dt>{{ kindLabel }}</dt><dd>{{ detail.kind }}</dd></div>
        <div v-if="detail.path"><dt>{{ pathLabel }}</dt><dd dir="ltr">{{ detail.path }}</dd></div>
        <div v-if="detail.span"><dt>{{ spanLabel }}</dt><dd dir="ltr">{{ detail.span }}</dd></div>
        <div v-if="detail.provenance"><dt>{{ provenanceLabel }}</dt><dd>{{ detail.provenance }}</dd></div>
        <div v-if="detail.confidence"><dt>{{ confidenceLabel }}</dt><dd>{{ detail.confidence }}</dd></div>
        <div v-if="detail.reason"><dt>{{ reasonLabel }}</dt><dd>{{ detail.reason }}</dd></div>
        <div v-if="detail.weight"><dt>{{ weightLabel }}</dt><dd>{{ detail.weight }}</dd></div>
        <div v-if="detail.internal"><dt>{{ internalLabel }}</dt><dd>{{ detail.internal }}</dd></div>
      </dl>
      <button type="button" @click="emit('focus')">{{ focusLabel }}</button>
    </template>
  </section>
</template>

<style scoped>
dl { display: grid; gap: var(--space-2); }
div { display: flex; justify-content: space-between; gap: var(--space-2); }
dd { margin: 0; unicode-bidi: isolate; }
button { min-block-size: var(--viewer-hit-target); }
</style>
