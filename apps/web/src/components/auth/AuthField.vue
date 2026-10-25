<script setup lang="ts">
import { Eye, EyeOff } from '@lucide/vue'
import { ref, useId } from 'vue'

const props = withDefaults(
  defineProps<{
    label: string
    modelValue: string
    type?: string
    placeholder?: string
    hint?: string
    autocomplete?: string
    passwordVisibilityLabels?: {
      show: string
      hide: string
    }
  }>(),
  {
    type: 'text',
    placeholder: '',
    hint: '',
    autocomplete: 'off'
  }
)

const inputId = useId()
const isPasswordVisible = ref(false)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function onInput(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <div class="field">
    <label class="field-label" :for="inputId">{{ props.label }}</label>
    <span class="input-wrap">
      <input
        :id="inputId"
        :type="props.type === 'password' && isPasswordVisible ? 'text' : props.type"
        :value="props.modelValue"
        :placeholder="props.placeholder"
        :autocomplete="props.autocomplete"
        :class="{ 'has-password-toggle': props.type === 'password' }"
        @input="onInput"
      />
      <button
        v-if="props.type === 'password'"
        class="password-toggle"
        type="button"
        :aria-label="props.passwordVisibilityLabels
          ? (isPasswordVisible ? props.passwordVisibilityLabels.hide : props.passwordVisibilityLabels.show)
          : `${isPasswordVisible ? 'Hide' : 'Show'} ${props.label.toLowerCase()}`"
        :aria-pressed="isPasswordVisible"
        :aria-controls="inputId"
        @click="isPasswordVisible = !isPasswordVisible"
      >
        <EyeOff v-if="isPasswordVisible" :size="18" aria-hidden="true" />
        <Eye v-else :size="18" aria-hidden="true" />
      </button>
    </span>
    <small v-if="props.hint">{{ props.hint }}</small>
  </div>
</template>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  text-align: left;
}

.input-wrap {
  position: relative;
  display: block;
}

.field-label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  color: var(--color-text-secondary);
}

input {
  width: 100%;
  border: 1px solid color-mix(in srgb, var(--color-accent-primary) var(--alpha-16), transparent);
  background: color-mix(in srgb, var(--color-surface) var(--alpha-04), transparent);
  color: var(--color-text-primary);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-3);
  font-size: var(--font-size-md);
  outline: none;
  transition: border-color var(--duration-normal) ease, box-shadow var(--duration-normal) ease, background var(--duration-normal) ease;
}

input.has-password-toggle {
  padding-right: var(--space-12);
}

.password-toggle {
  position: absolute;
  top: 50%;
  right: var(--space-2);
  display: grid;
  width: var(--space-8);
  height: var(--space-8);
  padding: 0;
  place-items: center;
  transform: translateY(-50%);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: color var(--duration-fast) ease, background var(--duration-fast) ease, border-color var(--duration-fast) ease;
}

.password-toggle:hover,
.password-toggle:focus-visible {
  border-color: color-mix(in srgb, var(--color-accent-primary) var(--alpha-16), transparent);
  background: color-mix(in srgb, var(--color-accent-primary) var(--alpha-08), transparent);
  color: var(--color-accent-primary);
}

input::placeholder {
  color: var(--color-text-secondary);
}

input:focus {
  border-color: color-mix(in srgb, var(--color-accent-primary) var(--alpha-50), transparent);
  box-shadow: var(--focus-ring);
  background: color-mix(in srgb, var(--color-surface) var(--alpha-04), transparent);
}

small {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  line-height: var(--line-height-normal);
}

[data-theme='light'] input {
  background: color-mix(in srgb, var(--color-surface-raised) var(--alpha-90), transparent);
  border-color: color-mix(in srgb, var(--color-surface) var(--alpha-08), transparent);
}
</style>
