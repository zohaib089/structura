<script setup lang="ts">
import { EDGE_DASH, edgeStroke } from '../edge-style'
import type { EdgeVisual } from '../overview'

export interface LegendRow {
  visual: EdgeVisual
  label: string
  count: string
}

defineProps<{ title: string; rows: LegendRow[] }>()
const emit = defineEmits<{ toggle: [visual: EdgeVisual] }>()
</script>

<template>
  <details class="legend" data-testid="legend" open>
    <summary>{{ title }}</summary>
    <ul>
      <li v-for="row in rows" :key="row.visual">
        <button type="button" @click="emit('toggle', row.visual)">
          <svg aria-hidden="true" viewBox="0 0 40 16">
            <line
              x1="2"
              y1="8"
              x2="38"
              y2="8"
              :stroke="edgeStroke(row.visual)"
              stroke-width="2"
              :stroke-dasharray="EDGE_DASH[row.visual] === 'none' ? undefined : EDGE_DASH[row.visual]"
              :stroke-linecap="row.visual === 'unresolved' ? 'round' : 'butt'"
            />
          </svg>
          <span>{{ row.label }}</span>
          <span class="count">{{ row.count }}</span>
        </button>
      </li>
    </ul>
  </details>
</template>

<style scoped>
.legend { color: var(--color-text-primary); }
ul { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-2); }
button {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  inline-size: 100%;
  min-block-size: var(--viewer-hit-target);
  text-align: start;
  background: transparent;
  color: inherit;
  border: 0;
}
svg { inline-size: var(--legend-swatch-width); block-size: var(--legend-swatch-height); }
.count { margin-inline-start: auto; color: var(--color-text-secondary); }
</style>
