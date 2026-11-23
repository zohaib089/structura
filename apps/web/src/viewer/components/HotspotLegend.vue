<script setup lang="ts">
import type { HotspotBand } from '../hotspot-band'

const props = defineProps<{
  title: string
  bands: { id: HotspotBand; label: string }[]
}>()
void props
</script>

<template>
  <div class="hotspot-legend" data-testid="hotspot-legend" role="note" :aria-label="title">
    <p class="title">{{ title }}</p>
    <ul>
      <li v-for="band in bands" :key="band.id">
        <span class="swatch" :data-band="band.id" aria-hidden="true"></span>
        <span>{{ band.label }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.hotspot-legend {
  pointer-events: none;
  min-inline-size: 8.5rem;
  padding: var(--space-2) var(--space-3);
  border: 1px solid color-mix(in srgb, var(--color-brand-amber-ui) 28%, var(--color-border));
  border-radius: var(--r-md, var(--radius-md));
  background: color-mix(in srgb, var(--color-brand-navy) 28%, var(--color-surface-raised) 72%);
  box-shadow: var(--shadow-md, 0 8px 24px color-mix(in srgb, var(--color-brand-navy) 35%, transparent));
  color: var(--color-text-primary);
}
.title {
  margin: 0 0 var(--space-2);
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
  font-weight: var(--font-weight-medium, 500);
  color: var(--color-text-secondary);
}
ul {
  display: grid;
  gap: var(--space-1);
  margin: 0;
  padding: 0;
  list-style: none;
}
li {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-13);
  line-height: var(--text-13-lh);
}
.swatch {
  flex: none;
  inline-size: 0.75rem;
  block-size: 0.75rem;
  border-radius: 999px;
  background: var(--hotspot-swatch);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--hotspot-swatch) 40%, transparent);
}
.swatch[data-band='low'] { --hotspot-swatch: var(--sev-low-fg); }
.swatch[data-band='medium'] { --hotspot-swatch: var(--sev-medium-fg); }
.swatch[data-band='high'] { --hotspot-swatch: var(--sev-high-fg); }
</style>
