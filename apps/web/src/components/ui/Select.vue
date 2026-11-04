<script setup lang="ts">
import { computed, useId } from 'vue'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

const props = withDefaults(
  defineProps<{
    modelValue?: string
    options: SelectOption[]
    label?: string
    disabled?: boolean
    id?: string
  }>(),
  {
    modelValue: '',
    disabled: false
  }
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const autoId = useId()
const selectId = computed(() => props.id ?? `ui-select-${autoId}`)

function onChange(event: Event) {
  emit('update:modelValue', (event.target as HTMLSelectElement).value)
}
</script>

<template>
  <div class="ui-select-field">
    <label v-if="label" class="ui-select-field__label" :for="selectId">{{ label }}</label>
    <select
      :id="selectId"
      class="ui-select"
      :value="modelValue"
      :disabled="disabled"
      @change="onChange"
    >
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
        :disabled="option.disabled"
      >
        {{ option.label }}
      </option>
    </select>
  </div>
</template>

<style scoped>
.ui-select-field {
  display: grid;
  gap: var(--space-1);
}

.ui-select-field__label {
  font-size: var(--text-14);
  line-height: var(--text-14-lh);
  font-weight: var(--font-weight-medium);
}

.ui-select {
  min-block-size: 2rem;
  padding-inline: var(--space-3);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--r-sm);
  background: var(--color-surface-raised);
  color: var(--color-text-primary);
  font-size: var(--text-14);
  line-height: var(--text-14-lh);
  font-family: inherit;
}

.ui-select:focus-visible {
  outline: none;
  border-color: var(--accent);
  box-shadow: var(--focus-ring);
}
</style>
