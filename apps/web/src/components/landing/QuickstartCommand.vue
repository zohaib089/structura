<script setup lang="ts">
import { Check, Copy } from '@lucide/vue'
import { ref } from 'vue'

const props = defineProps<{
  command: string
  label: string
  copyLabel: string
  copiedLabel: string
  failedLabel: string
}>()

const copied = ref(false)
const failed = ref(false)
const status = ref('')
const codeEl = ref<HTMLElement | null>(null)
let timer = 0

async function copy() {
  window.clearTimeout(timer)
  failed.value = false
  try {
    await navigator.clipboard.writeText(props.command)
    copied.value = true
    status.value = props.copiedLabel
  } catch {
    copied.value = false
    failed.value = true
    status.value = props.failedLabel
    const code = codeEl.value
    if (code) {
      const range = document.createRange()
      range.selectNodeContents(code)
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
    }
  }
  timer = window.setTimeout(() => {
    copied.value = false
    failed.value = false
  }, 2000)
}
</script>

<template>
  <div class="quickstart">
    <span class="prompt" aria-hidden="true">$</span>
    <code ref="codeEl" tabindex="0" :aria-label="label">{{ command }}</code>
    <button type="button" @click="copy">
      <Check v-if="copied" :size="16" aria-hidden="true" />
      <Copy v-else :size="16" aria-hidden="true" />
      {{ copied ? copiedLabel : failed ? failedLabel : copyLabel }}
    </button>
    <span class="sr-only" role="status">{{ status }}</span>
  </div>
</template>

<style scoped>
.quickstart {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-block-size: var(--viewer-hit-target);
  padding: var(--space-2) var(--space-2) var(--space-2) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-raised);
}

.prompt {
  color: var(--color-text-secondary);
  font-family: var(--font-family-mono);
}

code {
  flex: 1;
  min-inline-size: 0;
  overflow-x: auto;
  font-family: var(--font-family-mono);
  color: var(--color-text-primary);
}

button {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-block-size: var(--viewer-hit-target);
  padding-inline: var(--space-4);
  border: 0;
  border-radius: var(--radius-md);
  background: var(--color-brand-amber-ui);
  color: var(--color-on-brand-amber);
  font: inherit;
  cursor: pointer;
}

.sr-only {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

@media (max-width: 640px) {
  .quickstart {
    flex-wrap: wrap;
  }

  code,
  button {
    flex-basis: 100%;
  }
}
</style>
