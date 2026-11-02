<script setup lang="ts">
import { computed } from 'vue'

export interface DriftFinding {
  rule: string
  edgeId: string
  label: string
  failing: boolean
}

const props = defineProps<{
  title: string
  body: string
  status: string
  snippetLabel: string
  snippet: string
  copyLabel: string
  findings?: DriftFinding[] | null
  failingLabel?: string
  passingLabel?: string
}>()

const emit = defineEmits<{ copy: []; focus: [edgeId: string] }>()

const configured = computed(() => Array.isArray(props.findings))
const violations = computed(() => props.findings?.filter((item) => item.failing).length ?? 0)
const groups = computed(() => {
  const map = new Map<string, DriftFinding[]>()
  for (const finding of props.findings ?? []) {
    const rows = map.get(finding.rule) ?? []
    rows.push(finding)
    map.set(finding.rule, rows)
  }
  return [...map.entries()]
})
</script>

<template>
  <section>
    <template v-if="configured">
      <p class="status" role="status">
        <span aria-hidden="true">{{ violations > 0 ? '▲' : '✓' }}</span>
        {{ violations > 0 ? failingLabel : passingLabel }}
      </p>
      <section v-for="[rule, rows] in groups" :key="rule">
        <h3>{{ rule }}</h3>
        <ul>
          <li v-for="row in rows" :key="row.edgeId">
            <button type="button" @click="emit('focus', row.edgeId)">{{ row.label }}</button>
          </li>
        </ul>
      </section>
    </template>
    <template v-else>
      <p>{{ status }}</p>
      <h3>{{ title }}</h3>
      <p>{{ body }}</p>
      <p>{{ snippetLabel }}</p>
      <pre dir="ltr">{{ snippet }}</pre>
      <button type="button" @click="emit('copy')">{{ copyLabel }}</button>
    </template>
  </section>
</template>

<style scoped>
pre {
  white-space: pre-wrap;
  font-family: var(--font-family-mono);
  background: var(--color-surface);
  padding: var(--space-2);
}
button { min-block-size: var(--viewer-hit-target); }
ul { list-style: none; margin: 0; padding: 0; }
.status { font-weight: var(--font-weight-semibold); }
</style>
