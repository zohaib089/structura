<script setup lang="ts">
/**
 * ToastStack - renders the useToast() queue. Mount once per app (App.vue, standalone viewer).
 * Bottom-right on desktop (16px inset), top-centre full width under 640px. Newest on top,
 * max 3 visible then a "+N more" chip. Flat surface, 1px border, left accent bar.
 * The region (aria-label "Notifications") stays in the DOM so live announcements fire.
 */
import { CircleCheck, Info, OctagonX, TriangleAlert, X } from '@lucide/vue'
import { computed, nextTick, ref, watch, type Component } from 'vue'
import { useToast, type ToastItem, type ToastVariant } from '../../composables/useToast'

const MAX_VISIBLE = 3

const props = withDefaults(
  defineProps<{
    regionLabel?: string
    variantLabels?: Record<ToastVariant, string>
    /** "+{n} more" chip text; `{n}` is replaced. */
    moreLabel?: string
    lessLabel?: string
  }>(),
  {
    regionLabel: 'Notifications',
    variantLabels: () => ({ success: 'Success', info: 'Info', warning: 'Warning', error: 'Error' }),
    moreLabel: '+{n} more',
    lessLabel: 'Show fewer'
  }
)

const { toasts, dismiss, pause, resume, runAction } = useToast()
const expanded = ref(false)
const actionButtons = new Map<string, HTMLButtonElement>()

const icons: Record<ToastVariant, Component> = {
  success: CircleCheck,
  info: Info,
  warning: TriangleAlert,
  error: OctagonX
}

const visible = computed(() => (expanded.value ? toasts : toasts.slice(0, MAX_VISIBLE)))
const hiddenCount = computed(() => Math.max(0, toasts.length - MAX_VISIBLE))
const moreText = computed(() => props.moreLabel.replace('{n}', String(hiddenCount.value)))

watch(hiddenCount, count => {
  if (count === 0) expanded.value = false
})

function isAssertive(variant: ToastVariant): boolean {
  return variant === 'warning' || variant === 'error'
}

function titleText(toast: ToastItem): string {
  return toast.count > 1 ? `${toast.title} ×${toast.count}` : toast.title
}

function setActionRef(id: string, el: unknown) {
  if (el instanceof HTMLButtonElement) actionButtons.set(id, el)
  else actionButtons.delete(id)
}

// User-caused toast with an action: move focus to the action (§2.4). Origin focus returns on dismiss.
watch(
  () => toasts.map(toast => `${toast.id}:${toast.revision}`),
  async (_now, before) => {
    const fresh = toasts.find(toast => toast.focusAction && !before?.includes(`${toast.id}:${toast.revision}`))
    if (!fresh) return
    await nextTick()
    actionButtons.get(fresh.id)?.focus()
  }
)

function onKeydown(event: KeyboardEvent, toast: ToastItem) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    dismiss(toast.id)
  }
}

function onFocusOut(event: FocusEvent, toast: ToastItem) {
  const next = event.relatedTarget
  const root = event.currentTarget as HTMLElement
  if (next instanceof Node && root.contains(next)) return
  resume(toast.id, 'focus')
}
</script>

<template>
  <section class="toast-stack" data-toast-region :aria-label="regionLabel">
    <TransitionGroup name="toast" tag="div" class="toast-stack__list">
      <article
        v-for="toast in visible"
        :key="toast.id"
        class="toast-item"
        :class="`toast-item--${toast.variant}`"
        :role="isAssertive(toast.variant) ? 'alert' : 'status'"
        :aria-live="isAssertive(toast.variant) ? 'assertive' : 'polite'"
        aria-atomic="true"
        :aria-labelledby="`${toast.id}-title`"
        tabindex="-1"
        :data-variant="toast.variant"
        @mouseenter="pause(toast.id, 'hover')"
        @mouseleave="resume(toast.id, 'hover')"
        @focusin="pause(toast.id, 'focus')"
        @focusout="onFocusOut($event, toast)"
        @keydown="onKeydown($event, toast)"
      >
        <component :is="icons[toast.variant]" class="toast-item__icon" :size="18" aria-hidden="true" />
        <div class="toast-item__content">
          <p :id="`${toast.id}-title`" class="toast-item__title">
            <span class="toast-item__variant">{{ variantLabels[toast.variant] }}: </span>{{ titleText(toast) }}
          </p>
          <p v-if="toast.body" class="toast-item__body">{{ toast.body }}</p>
          <button
            v-if="toast.action"
            :ref="el => setActionRef(toast.id, el)"
            type="button"
            class="toast-item__action"
            @click="runAction(toast.id)"
          >
            {{ toast.action.label }}
          </button>
        </div>
        <button type="button" class="toast-item__dismiss" :aria-label="toast.dismissLabel" @click="dismiss(toast.id)">
          <X :size="16" aria-hidden="true" />
        </button>
      </article>
    </TransitionGroup>
    <button
      v-if="hiddenCount > 0"
      type="button"
      class="toast-stack__more"
      :aria-expanded="expanded"
      @click="expanded = !expanded"
    >
      {{ expanded ? lessLabel : moreText }}
    </button>
  </section>
</template>

<style scoped>
.toast-stack {
  position: fixed;
  z-index: var(--z-toast);
  inset-block-end: var(--space-4);
  inset-inline-end: var(--space-4);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-2);
  inline-size: min(24rem, calc(100vw - 2 * var(--space-4)));
  max-block-size: calc(100vh - 2 * var(--space-4));
  pointer-events: none;
}
.toast-stack > * {
  pointer-events: auto;
}
.toast-stack__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  inline-size: 100%;
}

.toast-item {
  --toast-accent: var(--color-text-secondary);
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-inline-start: 3px solid var(--toast-accent);
  border-radius: var(--r-sm);
  background: var(--color-surface-raised);
  color: var(--color-text-primary);
  font-size: var(--text-13);
  line-height: var(--text-13-lh);
}
.toast-item--success { --toast-accent: var(--color-success); }
.toast-item--info { --toast-accent: var(--color-text-secondary); }
.toast-item--warning { --toast-accent: var(--color-warning); }
.toast-item--error { --toast-accent: var(--color-danger); }
.toast-item:focus-visible,
.toast-item__action:focus-visible,
.toast-item__dismiss:focus-visible,
.toast-stack__more:focus-visible {
  outline: 2px solid var(--color-brand-amber-ui);
  outline-offset: 2px;
}

.toast-item__icon {
  flex: none;
  margin-block-start: 1px;
  color: var(--toast-accent);
}
.toast-item__content {
  display: grid;
  flex: 1;
  gap: var(--space-1);
  min-inline-size: 0;
  justify-items: start;
}
.toast-item__title {
  margin: 0;
  font-weight: var(--font-weight-semibold);
  overflow-wrap: anywhere;
}
.toast-item__variant {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.toast-item__body {
  margin: 0;
  color: var(--color-text-secondary);
  overflow-wrap: anywhere;
}
.toast-item__action,
.toast-stack__more {
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--color-text-primary);
  font: inherit;
  font-weight: var(--font-weight-medium);
  cursor: pointer;
}
.toast-item__action {
  margin-block-start: var(--space-1);
}
.toast-stack__more {
  background: var(--color-surface-raised);
  color: var(--color-text-secondary);
}
.toast-item__dismiss {
  display: grid;
  flex: none;
  place-items: center;
  inline-size: 1.5rem;
  block-size: 1.5rem;
  padding: 0;
  border: 0;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
}
.toast-item__dismiss:hover,
.toast-item__action:hover,
.toast-stack__more:hover {
  background: var(--gray-3);
}

/* 150ms slide/fade; none under reduced motion. */
.toast-enter-active,
.toast-leave-active {
  transition: opacity 150ms ease, transform 150ms ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (max-width: 639px) {
  .toast-stack {
    inset-block-start: var(--space-4);
    inset-block-end: auto;
    inset-inline: var(--space-4);
    inline-size: auto;
    align-items: stretch;
  }
  .toast-stack__list {
    flex-direction: column;
  }
  .toast-enter-from,
  .toast-leave-to {
    transform: translateY(-8px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .toast-enter-active,
  .toast-leave-active {
    transition: none;
  }
  .toast-enter-from,
  .toast-leave-to {
    transform: none;
  }
}
</style>
