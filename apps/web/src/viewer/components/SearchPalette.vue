<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import type { SearchHit } from '../overview'
import { highlightParts } from '../text'
import { prefersReducedTransparency } from '../motion'

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
  clustersLabel?: string
  filesLabel?: string
  symbolsLabel?: string
}>()

const emit = defineEmits<{ input: [value: string]; choose: [id: string]; close: [] }>()
const input = ref<HTMLInputElement | null>(null)
const active = ref(0)

function bucket(kind: string): 'clusters' | 'files' | 'symbols' {
  if (kind === 'directory') return 'clusters'
  if (kind === 'symbol') return 'symbols'
  return 'files'
}

const groups = computed(() => {
  const labels = {
    clusters: props.clustersLabel || 'Clusters',
    files: props.filesLabel || 'Files',
    symbols: props.symbolsLabel || 'Symbols'
  }
  const buckets = {
    clusters: [] as { hit: SearchHit; index: number }[],
    files: [] as { hit: SearchHit; index: number }[],
    symbols: [] as { hit: SearchHit; index: number }[]
  }
  props.hits.forEach((hit, index) => buckets[bucket(hit.kind)].push({ hit, index }))
  return (['clusters', 'files', 'symbols'] as const)
    .filter((id) => buckets[id].length > 0)
    .map((id) => ({ id, label: labels[id], hits: buckets[id] }))
})

function parts(label: string) {
  return highlightParts(label, props.query)
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
    return
  }
  if (props.hits.length === 0) return
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    active.value = (active.value + 1) % props.hits.length
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    active.value = (active.value - 1 + props.hits.length) % props.hits.length
  }
  if (event.key === 'Enter') {
    event.preventDefault()
    const hit = props.hits[active.value]
    if (hit) emit('choose', hit.id)
  }
}

watch(
  () => props.hits,
  () => {
    active.value = 0
  }
)

watch(active, async () => {
  await nextTick()
  const hit = props.hits[active.value]
  if (!hit) return
  document.getElementById(`hit-${hit.id}`)?.scrollIntoView({ block: 'nearest' })
})

onMounted(() => input.value?.focus())
</script>

<template>
  <div class="scrim" :class="{ 'is-solid': prefersReducedTransparency() }" @click.self="emit('close')">
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
        :aria-activedescendant="hits[active] ? `hit-${hits[active].id}` : undefined"
        :placeholder="placeholder"
        :value="query"
        @input="emit('input', ($event.target as HTMLInputElement).value)"
      />
      <div id="search-results" data-testid="search-results" role="listbox">
        <p v-if="query && hits.length === 0">{{ none }}<span>{{ hint }}</span></p>
        <section v-for="group in groups" :key="group.id">
          <h3>{{ group.label }}</h3>
          <ul>
            <li
              v-for="item in group.hits"
              :id="`hit-${item.hit.id}`"
              :key="item.hit.id"
              role="option"
              :aria-selected="item.index === active"
            >
              <button type="button" @click="emit('choose', item.hit.id)">
                <span>
                  <template v-for="(part, partIndex) in parts(item.hit.label)" :key="partIndex">
                    <mark v-if="part.match">{{ part.text }}</mark>
                    <template v-else>{{ part.text }}</template>
                  </template>
                </span>
                <span class="path" dir="ltr">{{ item.hit.path }}</span>
              </button>
            </li>
          </ul>
        </section>
      </div>
      <p v-if="total > hits.length">{{ more }}</p>
      <p>{{ footer }}</p>
    </div>
  </div>
</template>

<style scoped>
.scrim {
  position: fixed;
  inset: 0;
  z-index: var(--z-palette);
  display: grid;
  place-items: start center;
  padding-block-start: var(--space-8);
  background: color-mix(in srgb, var(--color-canvas) var(--alpha-60), transparent);
}
.scrim:not(.is-solid) { backdrop-filter: blur(4px); }
.palette {
  inline-size: min(var(--viewer-palette-width), 92vw);
  background: var(--color-surface-raised);
  padding: var(--space-3);
  display: grid;
  gap: var(--space-2);
  box-shadow: var(--shadow-lg);
  border-radius: var(--radius-md);
}
input, button { min-block-size: var(--viewer-hit-target); }
h3 {
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
}
ul { list-style: none; margin: 0; padding: 0; }
#search-results { max-block-size: 18rem; overflow: auto; }
button { display: flex; inline-size: 100%; justify-content: space-between; gap: var(--space-2); background: transparent; color: inherit; border: 0; }
.path { color: var(--color-text-secondary); unicode-bidi: isolate; font-family: var(--font-family-mono); }
mark { background: transparent; color: var(--color-accent-primary); text-decoration: underline; }
[aria-selected='true'] button { background: var(--surface-tint); }
</style>
