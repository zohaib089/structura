<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { motionMs } from '../motion'

defineProps<{ text: string }>()

const open = ref(false)
let timer = 0

function show(immediate: boolean) {
  window.clearTimeout(timer)
  if (immediate) {
    open.value = true
    return
  }
  timer = window.setTimeout(() => { open.value = true }, motionMs('--tooltip-delay', 400, false))
}

function hide() {
  window.clearTimeout(timer)
  open.value = false
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') hide()
}

onBeforeUnmount(() => window.clearTimeout(timer))
</script>

<template>
  <span class="tip" @mouseenter="show(false)" @mouseleave="hide" @focusin="show(true)" @focusout="hide" @keydown="onKey">
    <slot />
    <span v-if="open" class="bubble" role="tooltip">{{ text }}</span>
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
}
</style>
