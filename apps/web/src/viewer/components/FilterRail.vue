<script setup lang="ts">
defineProps<{
  label: string
  provenanceLabel: string
  kindLabel: string
  languageLabel: string
  driftLabel: string
  resetLabel: string
  emptyLabel: string
  disabled: boolean
  extracted: boolean
  inferred: boolean
  unresolved: boolean
  driftOnly: boolean
  kinds: { id: string; label: string; checked: boolean }[]
  languages: { id: string; label: string; checked: boolean }[]
  extractedText: string
  inferredText: string
  unresolvedText: string
}>()

const emit = defineEmits<{
  'toggle-provenance': [key: 'extracted' | 'inferred' | 'unresolved']
  'toggle-kind': [id: string]
  'toggle-language': [id: string]
  'toggle-drift': []
  reset: []
}>()
</script>

<template>
  <div class="filters" :aria-disabled="disabled">
    <p v-if="disabled">{{ emptyLabel }}</p>
    <fieldset :disabled="disabled">
      <legend>{{ provenanceLabel }}</legend>
      <label><input type="checkbox" :checked="extracted" @change="emit('toggle-provenance', 'extracted')" />{{ extractedText }}</label>
      <label><input type="checkbox" :checked="inferred" @change="emit('toggle-provenance', 'inferred')" />{{ inferredText }}</label>
      <label><input type="checkbox" :checked="unresolved" @change="emit('toggle-provenance', 'unresolved')" />{{ unresolvedText }}</label>
    </fieldset>
    <fieldset :disabled="disabled">
      <legend>{{ kindLabel }}</legend>
      <label v-for="kind in kinds" :key="kind.id">
        <input type="checkbox" :checked="kind.checked" @change="emit('toggle-kind', kind.id)" />{{ kind.label }}
      </label>
    </fieldset>
    <fieldset v-if="languages.length > 1" :disabled="disabled">
      <legend>{{ languageLabel }}</legend>
      <label v-for="language in languages" :key="language.id">
        <input type="checkbox" :checked="language.checked" @change="emit('toggle-language', language.id)" />{{ language.label }}
      </label>
    </fieldset>
    <label>
      <input type="checkbox" :checked="driftOnly" :disabled="disabled" @change="emit('toggle-drift')" />{{ driftLabel }}
    </label>
    <button type="button" :disabled="disabled" @click="emit('reset')">{{ resetLabel }}</button>
  </div>
</template>

<style scoped>
.filters { display: grid; gap: var(--space-3); }
fieldset { border: 0; margin: 0; padding: 0; display: grid; gap: var(--space-1); }
label { display: flex; gap: var(--space-2); align-items: center; min-block-size: var(--viewer-hit-target); }
button { min-block-size: var(--viewer-hit-target); }
</style>
