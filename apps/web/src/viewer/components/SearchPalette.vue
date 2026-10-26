<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { SearchHit } from '../overview'

const props = defineProps<{
  label: string
  placeholder: string
  none: string
  hint: string
  more: string
  footer: string
  hits: SearchHit[]
  total: number
  query: string
}>()

const emit = defineEmits<{ input: [value: string]; choose: [id: string]; close: [] }>()
const input = ref<HTMLInputElement | null>(null)
const active = ref(0)

onMounted(() => input.value?.focus())

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
  } else if (event.key === 'ArrowDown') {
    event.preventDefault()
    active.value = Math.min(active.value + 1, Math.max(props.hits.length - 1, 0))
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    active.value = Math.max(active.value - 1, 0)
  } else if (event.key === 'Enter') {
    event.preventDefault()
    const hit = props.hits[active.value]
    if (hit) emit('choose', hit.id)
  }
}
</script>

<template>
  <div class="scrim" @click.self="emit('close')">
    <div
      class="palette"
      role="dialog"
      aria-modal="true"
      :aria-label="label"
      @keydown="onKey"
    >
      <input
        ref="input"
        data-testid="search-input"
        role="combobox"
        aria-autocomplete="list"
        aria-controls="search-results"
        :aria-expanded="hits.length > 0"
        :placeholder="placeholder"
        :value="query"
        @input="emit('input', ($event.target as HTMLInputElement).value)"
      />
      <ul id="search-results" data-testid="search-results" role="listbox">
        <li v-if="query && hits.length === 0">{{ none }}<span>{{ hint }}</span></li>
        <li
          v-for="(hit, index) in hits"
          :id="`hit-${hit.id}`"
          :key="hit.id"
          role="option"
          :aria-selected="index === active"
        >
          <button type="button" @click="emit('choose', hit.id)">
            <span>{{ hit.label }}</span>
            <span class="path" dir="ltr">{{ hit.path }}</span>
          </button>
        </li>
      </ul>
      <p v-if="total > hits.length">{{ more }}</p>
      <p>{{ footer }}</p>
    </div>
  </div>
</template>

<style scoped>
.scrim { position: fixed; inset: 0; z-index: var(--z-palette); display: grid; place-items: start center; padding-block-start: var(--space-8); background: var(--color-surface-overlay); }
.palette { inline-size: min(var(--viewer-palette-width), 92vw); background: var(--color-surface-raised); padding: var(--space-3); display: grid; gap: var(--space-2); }
input, button { min-block-size: var(--viewer-hit-target); }
ul { list-style: none; margin: 0; padding: 0; max-block-size: 16rem; overflow: auto; }
button { display: flex; inline-size: 100%; justify-content: space-between; gap: var(--space-2); background: transparent; color: inherit; border: 0; }
.path { color: var(--color-text-secondary); unicode-bidi: isolate; }
</style>
