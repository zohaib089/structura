<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
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

.index {
  color: var(--color-text-secondary);
}

.card span:last-child {
  color: var(--color-text-secondary);
}

@media (max-width: 920px) {
  ol {
    grid-template-columns: 1fr;
  }
}
</style>
