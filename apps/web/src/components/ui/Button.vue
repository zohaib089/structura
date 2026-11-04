<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    size?: 'sm' | 'md'
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
    loading?: boolean
  }>(),
  {
    variant: 'secondary',
    size: 'md',
    type: 'button',
    disabled: false,
    loading: false
  }
)

const isDisabled = computed(() => props.disabled || props.loading)
</script>

<template>
  <button
    :type="type"
    class="ui-button"
    :class="[`ui-button--${variant}`, `ui-button--${size}`, { 'ui-button--loading': loading }]"
    :disabled="isDisabled"
    :aria-busy="loading || undefined"
  >
    <span v-if="loading" class="ui-button__spinner" aria-hidden="true" />
    <span class="ui-button__label" :class="{ 'ui-button__label--hidden': loading }">
      <slot />
    </span>
  </button>
</template>

<style scoped>
.ui-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  border-radius: var(--r-sm);
  border: 1px solid transparent;
  font-size: var(--text-14);
  line-height: var(--text-14-lh);
  font-weight: var(--font-weight-medium);
  font-family: inherit;
  cursor: pointer;
  transition:
    background var(--dur-1) var(--easing-product),
    border-color var(--dur-1) var(--easing-product),
    color var(--dur-1) var(--easing-product);
}

.ui-button:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.ui-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.ui-button--sm {
  min-block-size: 1.75rem;
  padding-inline: var(--space-3);
}

.ui-button--md {
  min-block-size: 2rem;
  padding-inline: var(--space-4);
}

.ui-button--primary {
  background: var(--button-primary-bg);
  color: var(--button-primary-fg);
  border-color: var(--button-primary-border);
}

.ui-button--primary:not(:disabled):hover {
  background: var(--button-primary-hover-bg);
}

.ui-button--secondary {
  background: var(--color-surface-raised);
  color: var(--color-text-primary);
  border-color: var(--color-border-strong);
}

.ui-button--secondary:not(:disabled):hover {
  background: var(--gray-3);
}

.ui-button--ghost {
  background: transparent;
  color: var(--color-text-primary);
  border-color: transparent;
}

.ui-button--ghost:not(:disabled):hover {
  background: var(--gray-3);
}

.ui-button--danger {
  background: color-mix(in srgb, var(--sev-critical-fg) var(--alpha-12), var(--color-surface-raised));
  color: var(--sev-critical-fg);
  border-color: var(--sev-critical-border);
}

.ui-button--danger:not(:disabled):hover {
  background: color-mix(in srgb, var(--sev-critical-fg) var(--alpha-20), var(--color-surface-raised));
}

.ui-button__spinner {
  inline-size: 1rem;
  block-size: 1rem;
  border: 2px solid currentColor;
  border-inline-end-color: transparent;
  border-radius: var(--r-full);
  animation: ui-button-spin var(--duration-slow) linear infinite;
}

.ui-button__label--hidden {
  visibility: hidden;
  position: absolute;
  inline-size: 0;
  overflow: hidden;
}

.ui-button--loading {
  position: relative;
}

@media (prefers-reduced-motion: reduce) {
  .ui-button__spinner {
    animation: none;
    border-inline-end-color: currentColor;
    opacity: 0.6;
  }
}

@keyframes ui-button-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
