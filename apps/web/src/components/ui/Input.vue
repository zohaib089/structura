<script setup lang="ts">
import { computed, useId } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    type?: 'text' | 'email' | 'password' | 'search' | 'url'
    label?: string
    hint?: string
    error?: string
    placeholder?: string
    disabled?: boolean
    required?: boolean
    id?: string
  }>(),
  {
    modelValue: '',
    type: 'text',
    disabled: false,
    required: false
  }
)

const emit = defineEmits<{ 'update:modelValue': [value: string]; blur: [event: FocusEvent] }>()

const autoId = useId()
const inputId = computed(() => props.id ?? `ui-input-${autoId}`)
const hintId = computed(() => (props.hint ? `${inputId.value}-hint` : undefined))
const errorId = computed(() => (props.error ? `${inputId.value}-error` : undefined))
const describedBy = computed(() => [hintId.value, errorId.value].filter(Boolean).join(' ') || undefined)

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}

function onBlur(event: FocusEvent) {
  emit('blur', event)
}
</script>

<template>
  <div class="ui-input-field" :class="{ 'ui-input-field--error': !!error }">
    <label v-if="label" class="ui-input-field__label" :for="inputId">{{ label }}</label>
    <input
      :id="inputId"
      class="ui-input"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="describedBy"
      autocomplete="off"
      @input="onInput"
      @blur="onBlur"
    >
    <p v-if="hint && !error" :id="hintId" class="ui-input-field__hint">{{ hint }}</p>
    <p v-if="error" :id="errorId" class="ui-input-field__error" role="alert">{{ error }}</p>
  </div>
</template>

<style scoped>
.ui-input-field {
  display: grid;
  gap: var(--space-1);
}

.ui-input-field__label {
  font-size: var(--text-14);
  line-height: var(--text-14-lh);
  font-weight: var(--font-weight-medium);
}

.ui-input {
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

.ui-input:focus-visible {
  outline: none;
  border-color: var(--accent);
  box-shadow: var(--focus-ring);
}

.ui-input-field--error .ui-input {
  border-color: var(--sev-critical-fg);
}

.ui-input-field__hint {
  margin: 0;
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
  color: var(--color-text-muted);
}

.ui-input-field__error {
  margin: 0;
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
  color: var(--sev-critical-fg);
}
</style>
