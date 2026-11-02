<script setup lang="ts">
import type { BudgetTone } from '../budget-tone'

const props = defineProps<{
  text: string
  ratio: number
  warn?: boolean
  full?: boolean
  nearLabel: string
  fullLabel: string
  hiddenLabel: string
  tone?: BudgetTone
  detailLabel?: string
  limitLabel?: string
}>()

const tone = () => props.tone ?? (props.full ? 'limit' : props.warn ? 'detail' : 'neutral')
</script>

<template>
  <div class="meter" role="status" :data-tone="tone()">
    <p class="tnum">{{ text }}</p>
    <div class="bar" aria-hidden="true">
      <span :style="{ inlineSize: `${Math.min(ratio, 1) * 100}%` }" :data-tone="tone()" />
    </div>
    <p v-if="tone() === 'limit'">▲ {{ limitLabel || fullLabel }}</p>
    <p v-else-if="tone() === 'detail'">{{ detailLabel || nearLabel }}</p>
    <button v-if="hiddenLabel" type="button">{{ hiddenLabel }}</button>
  </div>
</template>

<style scoped>
.meter { display: flex; align-items: center; gap: var(--space-2); min-inline-size: 0; }
.tnum { font-feature-settings: var(--font-feature-ui); font-variant-numeric: tabular-nums; }
.bar {
  inline-size: 6rem;
  block-size: var(--graph-budget-height);
  background: var(--graph-budget-track, var(--color-border));
}
.bar span { display: block; block-size: 100%; background: var(--color-text-secondary); }
.bar span[data-tone='detail'] { background: var(--color-info); }
.bar span[data-tone='limit'] { background: var(--color-warning); }
button { background: transparent; color: inherit; border: 0; }
</style>
