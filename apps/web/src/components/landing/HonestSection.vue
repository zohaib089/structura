<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { BRAND } from '../../../../../packages/brand/src/brand'
import { EDGE_DASH, edgeStroke } from '../../viewer/edge-style'
import { isSupportedWebLocale, readLocalePreference, resolvePreferredWebLocale } from '../../services/locale'
import { landingMessages } from '../../services/landing-messages'

const route = useRoute()
const locale = computed(() => {
  const routeLocale = route.params.locale
  if (typeof routeLocale === 'string' && isSupportedWebLocale(routeLocale)) return routeLocale
  return resolvePreferredWebLocale(readLocalePreference(), navigator.languages)
})
const messages = computed(() => landingMessages(locale.value))
const rows = computed(() => [
  { visual: 'extracted' as const, card: messages.value.honest.extracted, mark: '' },
  { visual: 'inferred' as const, card: messages.value.honest.inferred, mark: '~' },
  { visual: 'unresolved' as const, card: messages.value.honest.unresolved, mark: '' }
])
</script>

<template>
  <section id="honest" class="section">
    <div class="inner">
      <h2>{{ messages.honest.title }}</h2>
      <ul>
        <li v-for="row in rows" :key="row.card.title" class="card">
          <svg aria-hidden="true" viewBox="0 0 72 24">
            <line
              x1="4"
              y1="12"
              x2="56"
              y2="12"
              :stroke="edgeStroke(row.visual)"
              stroke-width="2"
              :stroke-dasharray="EDGE_DASH[row.visual] === 'none' ? undefined : EDGE_DASH[row.visual]"
              :stroke-linecap="row.visual === 'unresolved' ? 'round' : 'butt'"
            />
            <circle
              v-if="row.visual === 'unresolved'"
              cx="64"
              cy="12"
              r="3"
              fill="none"
              :stroke="edgeStroke(row.visual)"
            />
            <text v-if="row.mark" x="60" y="16" :fill="edgeStroke(row.visual)">{{ row.mark }}</text>
          </svg>
          <strong>{{ row.card.title }}</strong>
          <span>{{ row.card.body }}</span>
        </li>
        <li class="card">
          <strong>{{ messages.honest.telemetry.title }}</strong>
          <span>{{ messages.honest.telemetry.body }}</span>
        </li>
      </ul>
      <h3>{{ messages.honest.compareTitle }}</h3>
      <table>
        <thead>
          <tr>
            <th scope="col">{{ messages.honest.compareClaim }}</th>
            <th scope="col">{{ messages.honest.compareAnswer }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in messages.honest.compareRows" :key="row.title">
            <th scope="row">{{ row.title }}</th>
            <td>{{ row.body }}</td>
          </tr>
        </tbody>
      </table>
      <p class="caption"><a :href="BRAND.repoUrl">{{ messages.honest.compareCaption }}</a></p>
    </div>
  </section>
</template>

<style scoped>
.section {
  padding: var(--space-16) var(--space-6);
}

.inner {
  max-inline-size: var(--content-width);
  margin-inline: auto;
}

h2 {
  margin: 0 0 var(--space-6);
  color: var(--color-text-primary);
}

ul {
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

svg {
  inline-size: 4.5rem;
  block-size: 1.5rem;
}

span {
  color: var(--color-text-secondary);
}

h3 { margin: var(--space-8) 0 var(--space-4); }
table { inline-size: 100%; border-collapse: collapse; }
th, td {
  padding: var(--space-3);
  border-block-end: 1px solid var(--color-border);
  text-align: start;
  vertical-align: top;
}
.caption { color: var(--color-text-secondary); }
.caption a { color: var(--color-accent-primary); }

@media (max-width: 920px) {
  ul {
    grid-template-columns: 1fr;
  }
}
</style>
