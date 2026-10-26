<script setup lang="ts">
defineProps<{
  label: string
  name: string
  dependencies: string
  dependents: string
  both: string
  depthLabel: string
  confirmedOnly: string
  confirmed: string
  possible: string
  unresolved: string
  none: string
  exit: string
  direction: 'in' | 'out' | 'both'
  depth: number
  confirmedOnlyOn: boolean
}>()

const emit = defineEmits<{
  direction: [value: 'in' | 'out' | 'both']
  depth: [value: number]
  confirmed: []
  exit: []
}>()
</script>

<template>
  <div class="focus" role="region" :aria-label="label">
    <strong dir="ltr">{{ name }}</strong>
    <button type="button" :aria-pressed="direction === 'out'" @click="emit('direction', 'out')">{{ dependencies }}</button>
    <button type="button" :aria-pressed="direction === 'in'" @click="emit('direction', 'in')">{{ dependents }}</button>
    <button type="button" :aria-pressed="direction === 'both'" @click="emit('direction', 'both')">{{ both }}</button>
    <label>{{ depthLabel }}
      <input type="range" min="1" max="6" :value="depth" @input="emit('depth', Number(($event.target as HTMLInputElement).value))" />
    </label>
    <label><input type="checkbox" :checked="confirmedOnlyOn" @change="emit('confirmed')" />{{ confirmedOnly }}</label>
    <span>{{ confirmed }}</span>
    <span>{{ possible }}</span>
    <span v-if="unresolved">{{ unresolved }}</span>
    <span v-if="none">{{ none }}</span>
    <button type="button" @click="emit('exit')">{{ exit }}</button>
  </div>
</template>

<style scoped>
.focus {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-2);
  background: var(--color-surface);
}
button, label { min-block-size: var(--viewer-hit-target); }
</style>
