<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { BRAND } from '../../../../../packages/brand/src/brand'
import { isSupportedWebLocale, readLocalePreference, resolvePreferredWebLocale } from '../../services/locale'
import { landingMessages } from '../../services/landing-messages'

const route = useRoute()
const locale = computed(() => {
  const routeLocale = route.params.locale
  if (typeof routeLocale === 'string' && isSupportedWebLocale(routeLocale)) return routeLocale
  return resolvePreferredWebLocale(readLocalePreference(), navigator.languages)
})
const messages = computed(() => landingMessages(locale.value))
</script>

<template>
  <section id="limits" class="section">
    <div class="inner">
      <h2>{{ messages.limits.title }}</h2>
      <ul>
        <li v-for="item in messages.limits.items" :key="item">{{ item }}</li>
      </ul>
      <p>
        <a :href="BRAND.repoUrl">{{ messages.github }}</a>
      </p>
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
  margin: 0 0 var(--space-4);
  color: var(--color-text-primary);
}

ul {
  display: grid;
  gap: var(--space-3);
  margin: 0;
  padding-inline-start: var(--space-5);
  color: var(--color-text-secondary);
}

a {
  color: var(--color-accent-primary);
}
</style>
