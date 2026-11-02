<script setup lang="ts">
import { EDGE_DASH, edgeStroke } from '../edge-style'
import type { EdgeVisual } from '../overview'

export interface LegendRow {
  visual: EdgeVisual
  label: string
  count: string
  active?: boolean
}

defineProps<{ title: string; rows: LegendRow[] }>()
const emit = defineEmits<{ toggle: [visual: EdgeVisual] }>()
</script>

<template>
  <details class="legend" data-testid="legend">
    <summary>{{ title }}</summary>
    <ul>
      <li v-for="row in rows" :key="row.visual">
        <button type="button" :aria-pressed="row.active" @click="emit('toggle', row.visual)">
          <svg aria-hidden="true" viewBox="0 0 48 16">
            <line
              x1="2"
              y1="8"
              x2="34"
              y2="8"
              :stroke="edgeStroke(row.visual)"
              stroke-width="2"
              :stroke-dasharray="EDGE_DASH[row.visual] === 'none' ? undefined : EDGE_DASH[row.visual]"
              :stroke-linecap="row.visual === 'unresolved' ? 'round' : 'butt'"
            />
            <text v-if="row.visual === 'inferred'" x="38" y="12" font-size="10">~</text>
            <circle v-if="row.visual === 'unresolved'" cx="40" cy="8" r="3" fill="none" :stroke="edgeStroke(row.visual)" />
            <text v-if="row.visual === 'mixed'" x="38" y="12" font-size="10">✕</text>
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



