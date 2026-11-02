<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { BRAND } from '../../../../../packages/brand/src/brand'
import { isSupportedWebLocale, readLocalePreference, resolvePreferredWebLocale } from '../../services/locale'
import { fillLanding, landingMessages } from '../../services/landing-messages'

const route = useRoute()
const locale = computed(() => {
  const routeLocale = route.params.locale
  if (typeof routeLocale === 'string' && isSupportedWebLocale(routeLocale)) return routeLocale
  return resolvePreferredWebLocale(readLocalePreference(), navigator.languages)
})
const messages = computed(() => landingMessages(locale.value))
const caption = computed(() => fillLanding(messages.value.drift.yamlCaption, { config: BRAND.configFile }))
</script>

<template>
  <section id="drift" class="section">
    <div class="inner">
      <h2>{{ messages.drift.title }}</h2>
      <p>{{ messages.drift.body }}</p>
      <figure>
        <figcaption>{{ caption }}</figcaption>
        <pre><code>{{ messages.drift.illustrative }}</code></pre>
      </figure>
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

p,
figcaption {
  color: var(--color-text-secondary);
}

pre {
  margin: var(--space-4) 0 0;
  padding: var(--space-4);
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-raised);
  font-family: var(--font-family-mono);
  color: var(--color-text-primary);
}
</style>
