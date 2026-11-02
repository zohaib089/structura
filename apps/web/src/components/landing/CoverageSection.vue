<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { isSupportedWebLocale, readLocalePreference, resolvePreferredWebLocale } from '../../services/locale'
import { fillLanding, landingMessages } from '../../services/landing-messages'
import { sampleGraph } from '../../viewer/sample-graph'

const route = useRoute()
const locale = computed(() => {
  const routeLocale = route.params.locale
  if (typeof routeLocale === 'string' && isSupportedWebLocale(routeLocale)) return routeLocale
  return resolvePreferredWebLocale(readLocalePreference(), navigator.languages)
})
const messages = computed(() => landingMessages(locale.value))
const files = sampleGraph.coverage.files
const width = computed(() => files.discovered === 0 ? '0%' : `${Math.round((files.parsed / files.discovered) * 100)}%`)
const caption = computed(() => fillLanding(messages.value.coverage.sampleCaption, {
  parsed: String(files.parsed),
  discovered: String(files.discovered)
}))
</script>

<template>
  <section id="coverage" class="section">
    <div class="inner">
      <h2>{{ messages.coverage.title }}</h2>
      <p>{{ messages.coverage.body }}</p>
      <div class="meter" role="img" :aria-label="caption">
        <span class="bar" :style="{ inlineSize: width }"></span>
      </div>
      <p class="caption"><span class="pill">{{ messages.samplePill }}</span> {{ caption }}</p>
    </div>
  </section>
</template>

<style scoped>
.section {
  padding: var(--space-16) var(--space-6);
}

.inner {
  max-inline-size: var(--content-width-copy);
  margin-inline: auto;
}

h2 {
  margin: 0 0 var(--space-3);
  color: var(--color-text-primary);
}

p {
  color: var(--color-text-secondary);
}

.meter {
  block-size: var(--space-3);
  margin-block: var(--space-5);
  border-radius: var(--radius-sm);
  background: var(--color-surface-raised);
  overflow: hidden;
}

.bar {
  display: block;
  block-size: 100%;
  background: var(--color-accent-primary);
}

.pill {
  margin-inline-end: var(--space-2);
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
}
</style>
