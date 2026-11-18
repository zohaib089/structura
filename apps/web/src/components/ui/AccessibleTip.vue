<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, useId } from 'vue'
import { motionMs } from '../../viewer/motion'

/** `side="start"` puts the bubble beside the control (stacked pads); `placement="above"` lifts it above. */
withDefaults(defineProps<{ text: string; side?: 'below' | 'start'; placement?: 'above' | 'below' }>(), { side: 'below', placement: 'below' })

const tipId = useId()
const root = ref<HTMLElement | null>(null)
const open = ref(false)
let timer = 0

function described(target: HTMLElement | null, on: boolean) {
  if (!target) return
  if (on) target.setAttribute('aria-describedby', tipId)
  else if (target.getAttribute('aria-describedby') === tipId) target.removeAttribute('aria-describedby')
}

function show(immediate: boolean) {
  window.clearTimeout(timer)
  const apply = () => {
    open.value = true
    void nextTick(() => {
      const focusable = root.value?.querySelector<HTMLElement>('button, a, [tabindex], input, select, textarea')
      described(focusable ?? null, true)
    })
  }
  if (immediate) apply()
  else timer = window.setTimeout(apply, motionMs('--tooltip-delay', 400, false))
}

function hide() {
  window.clearTimeout(timer)
  open.value = false
  const focusable = root.value?.querySelector<HTMLElement>('button, a, [tabindex], input, select, textarea')
  described(focusable ?? null, false)
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    hide()
  }
}

onBeforeUnmount(() => {
  window.clearTimeout(timer)
  hide()
})
</script>

<template>
  <span ref="root" class="tip" @mouseenter="show(false)" @mouseleave="hide" @focusin="show(true)" @focusout="hide" @keydown="onKey">
    <slot />
    <span v-if="open" :id="tipId" class="bubble" :class="{ 'bubble--start': side === 'start', 'bubble--above': placement === 'above' && side !== 'start' }" role="tooltip">{{ text }}</span>
  </span>
</template>

<style scoped>
.tip { position: relative; display: inline-flex; }
.bubble {
  position: absolute;
  inset-block-start: calc(100% + var(--space-1));
  inset-inline-start: 50%;
  z-index: var(--z-toast);
  transform: translateX(-50%);
  max-inline-size: 16rem;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  background: var(--color-surface-raised);
  color: var(--color-text-primary);
  box-shadow: var(--shadow-md);
  font-size: var(--font-size-xs);
  white-space: nowrap;
  /* A tooltip never steals the click from the control under it. */
  pointer-events: none;
}
.bubble--start {
  inset-block-start: 50%;
  inset-inline-start: auto;
  inset-inline-end: calc(100% + var(--space-2));
  transform: translateY(-50%);
}
.bubble--above {
  inset-block-start: auto;
  inset-block-end: calc(100% + var(--space-1));
}

</style>
