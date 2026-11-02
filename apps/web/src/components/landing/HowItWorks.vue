<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { BRAND, quickstartCommand } from '../../../../../packages/brand/src/brand'
import { EDGE_DASH, edgeStroke } from '../../viewer/edge-style'
import { sampleGraph } from '../../viewer/sample-graph'
import { isSupportedWebLocale, readLocalePreference, resolvePreferredWebLocale } from '../../services/locale'
import { landingMessages } from '../../services/landing-messages'

const route = useRoute()
const locale = computed(() => {
  const routeLocale = route.params.locale
  if (typeof routeLocale === 'string' && isSupportedWebLocale(routeLocale)) return routeLocale
  return resolvePreferredWebLocale(readLocalePreference(), navigator.languages)
})
const messages = computed(() => landingMessages(locale.value))
const files = sampleGraph.coverage.files
const sampleOutput = computed(() => [
  `$ ${quickstartCommand()}`,
  `discovered ${files.discovered}`,
  `parsed ${files.parsed}`,
  `partial ${files.partial}`,
  `failed ${files.failed}`,
  `skipped ${files.skipped}`,
  `open ${BRAND.graphFile}`
].join('\n'))
const edges = [
  { visual: 'extracted' as const, y: 16 },
  { visual: 'inferred' as const, y: 40 },
  { visual: 'unresolved' as const, y: 64 }
]
</script>

<template>
  <section id="how" class="section">
    <div class="inner">
      <h2>{{ messages.how.title }}</h2>
      <ol>
        <li v-for="(step, index) in messages.how.steps" :key="step.title" class="card">
          <span class="index">{{ index + 1 }}</span>
          <strong>{{ step.title }}</strong>
          <span>{{ step.body }}</span>
        </li>
      </ol>
      <figure class="sample">
        <figcaption><span class="pill">{{ messages.commandSample }}</span></figcaption>
        <svg aria-hidden="true" viewBox="0 0 160 80">
          <line
            v-for="edge in edges"
            :key="edge.visual"
            class="draw-edge"
            x1="8"
            :y1="edge.y"
            x2="120"
            :y2="edge.y"
            :stroke="edgeStroke(edge.visual)"
            stroke-width="2"
            pathLength="1"
            stroke-dasharray="1"
            :stroke-linecap="edge.visual === 'unresolved' ? 'round' : 'butt'"
          />
        </svg>
        <pre>{{ sampleOutput }}</pre>
        <p class="legend">
          <span v-for="edge in edges" :key="edge.visual">
            {{ edge.visual }}
            <svg aria-hidden="true" viewBox="0 0 48 12">
              <line
                x1="2"
                y1="6"
                x2="46"
                y2="6"
                :stroke="edgeStroke(edge.visual)"
                stroke-width="2"
                :stroke-dasharray="EDGE_DASH[edge.visual] === 'none' ? undefined : EDGE_DASH[edge.visual]"
              />
            </svg>
          </span>
        </p>
      </figure>
    </div>
  </section>
</template>

<style scoped>
.section { padding: var(--space-16) var(--space-6); }
.inner { max-inline-size: var(--content-width); margin-inline: auto; }
h2 { margin: 0 0 var(--space-6); color: var(--color-text-primary); }
ol {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-4);
  margin: 0;
  padding: 0;
  list-style: none;
}
.card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}
.index, .card span:last-child, .legend { color: var(--color-text-secondary); }
.sample {
  margin: var(--space-6) 0 0;
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}
.pill {
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  background: var(--color-surface-raised);
  font-size: var(--font-size-xs);
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
}
pre {
  margin: var(--space-3) 0 0;
  font-family: var(--font-family-mono);
  white-space: pre-wrap;
}
.sample > svg { inline-size: 10rem; block-size: 5rem; }
.legend { display: flex; flex-wrap: wrap; gap: var(--space-4); }
.legend svg { inline-size: 3rem; block-size: 0.75rem; }
@media (max-width: 920px) {
  ol { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  .draw-edge { stroke-dashoffset: 0; }
}
</style>
