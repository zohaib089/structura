<script setup lang="ts">
import type { Coverage } from '../graph-types'

defineProps<{
  coverage: Coverage | null
  none: string
  bar: string
  banner: string
  full: string
  honesty: string
  language: string
  parsed: string
  partial: string
  failed: string
  skipped: string
  exportLabel: string
  skippedNote?: string
}>()

const emit = defineEmits<{ export: [] }>()
</script>

<template>
  <section>
    <p v-if="!coverage">{{ none }}</p>
    <template v-else>
      <p v-if="banner" role="status">{{ banner }}</p>
      <p v-else-if="full">{{ full }}</p>
      <div v-if="coverage" class="stack" role="img" :aria-label="bar">
        <span class="parsed" :style="{ flexGrow: coverage.files.parsed }">{{ parsed }} {{ coverage.files.parsed }}</span>
        <span class="skipped" :style="{ flexGrow: coverage.files.skipped }">{{ skipped }} {{ coverage.files.skipped }}</span>
        <span class="unresolved" :style="{ flexGrow: coverage.files.failed + coverage.files.partial }">{{ failed }} {{ coverage.files.failed + coverage.files.partial }}</span>
      </div>
      <p v-if="skippedNote && coverage.files.parsed < coverage.files.discovered">{{ skippedNote }}</p>
      <p role="img" :aria-label="bar">{{ bar }}</p>
      <table>
        <caption class="sr-only">{{ language }}</caption>
        <thead>
          <tr>
            <th scope="col">{{ language }}</th>
            <th scope="col">{{ parsed }}</th>
            <th scope="col">{{ partial }}</th>
            <th scope="col">{{ failed }}</th>
            <th scope="col">{{ skipped }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in coverage.byLanguage" :key="index">
            <td dir="ltr">{{ row.language ?? '' }}</td>
            <td>{{ row.parsed }}</td>
            <td>{{ row.partial }}</td>
            <td>{{ row.failed }}</td>
            <td>{{ row.skipped }}</td>
          </tr>
        </tbody>
      </table>
      <button type="button" @click="emit('export')">{{ exportLabel }}</button>
      <p>{{ honesty }}</p>
    </template>
  </section>
</template>

<style scoped>
.sr-only { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip: rect(0 0 0 0); }
.stack { display: flex; min-block-size: var(--coverage-bar-height); gap: var(--space-1); }
.stack span { min-inline-size: 2rem; padding-inline: var(--space-1); font-size: var(--font-size-xs); }
.parsed { background: var(--coverage-parsed); }
.skipped { background: var(--coverage-skipped); }
.unresolved { background: var(--coverage-partial); }
table { inline-size: 100%; border-collapse: collapse; }
button { min-block-size: var(--viewer-hit-target); }
</style>




