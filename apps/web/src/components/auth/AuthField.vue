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
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--gray-10);
}

input {
  width: 100%;
  height: 44px;
  border: 1px solid var(--gray-5);
  background: var(--gray-0);
  color: var(--gray-10);
  border-radius: 10px;
  padding: 0 var(--space-3);
  font-size: var(--font-size-md);
  outline: none;
  transition: border-color var(--dur-1) var(--easing-product), box-shadow var(--dur-1) var(--easing-product), background var(--dur-1) var(--easing-product);
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
  border-radius: var(--r-xs);
  background: transparent;
  color: var(--gray-8);
  cursor: pointer;
  transition: color var(--dur-1) var(--easing-product), background var(--dur-1) var(--easing-product), border-color var(--dur-1) var(--easing-product);
}

.password-toggle:hover,
.password-toggle:focus-visible {
  border-color: var(--gray-5);
  background: var(--gray-3);
  color: var(--color-brand-amber-ui);
}

.password-toggle:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

input::placeholder {
  color: var(--gray-7);
}

input:hover:not(:focus) {
  border-color: var(--gray-7);
}

input:focus {
  border-color: var(--color-brand-amber-ui);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-brand-amber-ui) 28%, transparent);
  background: var(--gray-0);
}

/* Inline validation: only after the person has interacted (e.g. a malformed email), never on first paint. */
input:user-invalid {
  border-color: var(--color-danger);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-danger) 22%, transparent);
}

small {
  color: var(--gray-7);
  font-size: var(--font-size-xs);
  line-height: var(--line-height-normal);
}

[data-theme='light'] input {
  background: #ffffff;
  border-color: var(--gray-5);
  color: var(--gray-10);
}

@media (prefers-reduced-motion: reduce) {
  input,
  .password-toggle {
    transition: none;
  }
}
</style>
