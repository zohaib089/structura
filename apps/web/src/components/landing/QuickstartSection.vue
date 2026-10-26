<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { BRAND, quickstartCommand } from '../../../../../packages/brand/src/brand'
import { isSupportedWebLocale, readLocalePreference, resolvePreferredWebLocale } from '../../services/locale'
import { fillLanding, landingMessages } from '../../services/landing-messages'
import QuickstartCommand from './QuickstartCommand.vue'

const route = useRoute()
const locale = computed(() => {
  const routeLocale = route.params.locale
  if (typeof routeLocale === 'string' && isSupportedWebLocale(routeLocale)) return routeLocale
  return resolvePreferredWebLocale(readLocalePreference(), navigator.languages)
})
const messages = computed(() => landingMessages(locale.value))
const openStep = computed(() => fillLanding(messages.value.quickstart.openStep, { graphFile: BRAND.graphFile }))
</script>

<template>
  <section id="quickstart" class="section">
    <div class="inner">
      <h2>{{ messages.quickstart.title }}</h2>
      <p>{{ messages.quickstart.intro }}</p>
      <ol>
        <li>
          <QuickstartCommand
            :command="quickstartCommand()"
            :label="messages.quickstart.label"
            :copy-label="messages.quickstart.copy"
            :copied-label="messages.quickstart.copied"
            :failed-label="messages.quickstart.copyFailed"
          />
        </li>
        <li>
          <QuickstartCommand
            :command="openStep"
            :label="messages.quickstart.label"
            :copy-label="messages.quickstart.copy"
            :copied-label="messages.quickstart.copied"
            :failed-label="messages.quickstart.copyFailed"
          />
        </li>
        <li>
          <QuickstartCommand
            :command="quickstartCommand('check')"
            :label="messages.quickstart.label"
            :copy-label="messages.quickstart.copy"
            :copied-label="messages.quickstart.copied"
            :failed-label="messages.quickstart.copyFailed"
          />
          <p class="note">{{ messages.quickstart.checkNote }}</p>
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

ol {
  display: grid;
  gap: var(--space-4);
  margin: var(--space-6) 0 0;
  padding: 0;
  list-style: none;
}

.note {
  margin: var(--space-2) 0 0;
  font-size: var(--font-size-sm);
}
</style>
