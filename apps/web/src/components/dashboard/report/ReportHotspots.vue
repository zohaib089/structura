<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { RouterLink } from 'vue-router'
import { hotspotBand, hotspotFileName, hotspotShortPath, type GraphHotspotEntry, type HotspotBand } from '../../../viewer/hotspot-band'

const props = defineProps<{
  items: GraphHotspotEntry[]
  title: string
  hint: string
  openLabel: string
  bandLabel: (band: HotspotBand) => string
  scoreLabel: (score: number, band: string) => string
  graphHref: (path?: string) => RouteLocationRaw
}>()

const rows = computed(() =>
  props.items.map((item) => {
    const band = hotspotBand(item.score)
    const bandWord = props.bandLabel(band)
    return {
      path: item.path,
      score: item.score,
      why: item.why,
      band,
      bandWord,
      name: hotspotFileName(item.path),
      shortPath: hotspotShortPath(item.path),
      scoreText: props.scoreLabel(item.score, bandWord)
    }
  })
)
</script>

<template>
  <section v-if="items.length" class="block" data-testid="riskiest-files" aria-labelledby="report-riskiest-files">
    <div class="block__head">
      <h3 id="report-riskiest-files" class="block__title">{{ title }}</h3>
    </div>
    <p class="hint">{{ hint }}</p>
    <ol class="hotspots">
      <li v-for="row in rows" :key="row.path" class="hotspot">
        <RouterLink
          class="hotspot__link"
          :to="graphHref(row.path)"
          :title="openLabel"
          :aria-label="`${row.name}. ${row.scoreText}. ${row.why}. ${openLabel}`"
        >
          <span class="score" :data-band="row.band">
            <span class="score__bar" aria-hidden="true">
              <span class="score__fill" :style="{ inlineSize: `${Math.max(0, Math.min(100, row.score))}%` }"></span>
            </span>
            <span class="score__value">{{ row.score }}</span>
            <span class="score__band">{{ row.bandWord }}</span>
          </span>
          <span class="hotspot__body">
            <span class="hotspot__name">{{ row.name }}</span>
            <span v-if="row.shortPath" class="hotspot__path" dir="ltr">{{ row.shortPath }}</span>
            <span class="hotspot__why">{{ row.why }}</span>
          </span>
        </RouterLink>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.block {
  padding-block: var(--space-5);
  border-block-end: 1px solid var(--color-border);
}
.block__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
}
.block__title {
  margin: 0 0 var(--space-2);
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}
.hint {
  margin: var(--space-2) 0 0;
  font-size: var(--text-13);
  line-height: var(--text-13-lh);
  color: var(--color-text-secondary);
}
.hotspots {
  display: grid;
  margin: var(--space-3) 0 0;
  padding: 0;
  list-style: none;
}
.hotspot + .hotspot {
  border-block-start: 1px solid var(--color-border);
}
.hotspot__link {
  display: grid;
  grid-template-columns: 7.5rem minmax(0, 1fr);
  align-items: start;
  gap: var(--space-3);
  padding-block: var(--space-3);
  color: inherit;
  text-decoration: none;
  border-radius: var(--r-sm);
}
.hotspot__link:hover {
  background: color-mix(in srgb, var(--color-brand-navy) 10%, transparent);
}
.hotspot__link:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
.score {
  display: grid;
  gap: 2px;
  color: var(--hotspot-fg, var(--color-text-primary));
  font-variant-numeric: tabular-nums;
}
.score[data-band='low'] { --hotspot-fg: var(--sev-low-fg); --hotspot-fill: var(--sev-low-fg); }
.score[data-band='medium'] { --hotspot-fg: var(--sev-medium-fg); --hotspot-fill: var(--sev-medium-fg); }
.score[data-band='high'] { --hotspot-fg: var(--sev-high-fg); --hotspot-fill: var(--sev-high-fg); }
.score__bar {
  display: block;
  inline-size: 100%;
  block-size: 0.4rem;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--hotspot-fill) 18%, var(--color-border));
}
.score__fill {
  display: block;
  block-size: 100%;
  border-radius: inherit;
  background: var(--hotspot-fill);
}
.score__value {
  font-size: var(--text-16, 1rem);
  font-weight: var(--font-weight-semibold, 600);
  line-height: 1.2;
}
.score__band {
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
  font-weight: var(--font-weight-medium);
}
.hotspot__body {
  display: grid;
  gap: 2px;
  min-inline-size: 0;
}
.hotspot__name {
  font-size: var(--text-14);
  line-height: var(--text-14-lh);
  font-weight: var(--font-weight-medium);
}
.hotspot__path {
  font-family: var(--font-family-mono);
  font-size: var(--text-12);
  color: var(--color-text-secondary);
  overflow-wrap: anywhere;
}
.hotspot__why {
  font-size: var(--text-13);
  line-height: var(--text-13-lh);
  color: var(--color-text-secondary);
}
@media (max-width: 760px) {
  .hotspot__link {
    grid-template-columns: 6.25rem minmax(0, 1fr);
  }
}
</style>
