<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    body: string
    confirmLabel: string
    cancelLabel: string
    danger?: boolean
    busy?: boolean
  }>(),
  {
    danger: false,
    busy: false
  }
)

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const titleId = 'confirm-dialog-title'
const bodyId = 'confirm-dialog-body'
const dialogRef = ref<HTMLElement | null>(null)
const cancelRef = ref<HTMLButtonElement | null>(null)
let previousFocus: HTMLElement | null = null

function close() {
  if (props.busy) return
  emit('cancel')
}

function onKeydown(event: KeyboardEvent) {
  if (!props.open) return
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
    return
  }
  if (event.key !== 'Tab' || !dialogRef.value) return
  const focusable = [...dialogRef.value.querySelectorAll<HTMLElement>(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )]
  if (focusable.length === 0) return
  const first = focusable[0]!
  const last = focusable[focusable.length - 1]!
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

watch(
  () => props.open,
  async open => {
    if (open) {
      previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
      window.addEventListener('keydown', onKeydown)
      await nextTick()
      cancelRef.value?.focus()
      return
    }
    window.removeEventListener('keydown', onKeydown)
    if (previousFocus?.isConnected) previousFocus.focus()
    previousFocus = null
  }
)

onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="confirm-layer">
      <button class="confirm-backdrop" type="button" tabindex="-1" :aria-hidden="true" @click="close" />
      <div
        ref="dialogRef"
        class="confirm-dialog"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-describedby="bodyId"
      >
        <h2 :id="titleId">{{ title }}</h2>
        <p :id="bodyId">{{ body }}</p>
        <div v-if="$slots.default" class="confirm-extra">
          <slot />
        </div>
        <div class="confirm-actions">
          <button ref="cancelRef" class="secondary-button" type="button" :disabled="busy" @click="close">
            {{ cancelLabel }}
          </button>
          <button
            class="primary-button"
            :class="{ 'confirm-danger': danger }"
            type="button"
            data-testid="confirm-accept"
            :disabled="busy"
            @click="emit('confirm')"
          >
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.confirm-layer {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  padding: var(--space-4);
}

.confirm-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  padding: 0;
  background: color-mix(in srgb, var(--color-text-primary) 45%, transparent);
  cursor: pointer;
}

.confirm-dialog {
  position: relative;
  z-index: 1;
  width: min(28rem, 100%);
  display: grid;
  gap: var(--space-3);
  padding: var(--space-5);
  border: 1px solid var(--color-border);
  border-radius: var(--r-md);
  background: var(--color-surface-raised);
  color: var(--color-text-primary);
  box-shadow: var(--shadow-2, 0 12px 32px color-mix(in srgb, var(--color-text-primary) 18%, transparent));
}

.confirm-dialog h2 {
  margin: 0;
  font-size: var(--text-18, 1.125rem);
  line-height: 1.3;
}

.confirm-dialog p {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--text-14);
  line-height: var(--text-14-lh);
}

.confirm-extra {
  display: grid;
  gap: var(--space-2);
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-top: var(--space-2);
}

/* Neutral white/dark primary — never amber (amber is reserved for brand, not confirm actions). */
.primary-button {
  background: var(--button-primary-bg);
  color: var(--button-primary-fg);
  border-color: var(--button-primary-border);
}

.primary-button:hover:not(:disabled) {
  background: var(--button-primary-hover-bg);
}

.confirm-danger {
  border-color: color-mix(in srgb, var(--color-danger) 70%, var(--button-primary-border));
  background: var(--color-danger);
  color: var(--color-text-on-danger, #fff);
}

.confirm-danger:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-danger) 88%, var(--color-text-primary));
}

.confirm-dialog :is(button):focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
</style>
