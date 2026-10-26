<script setup lang="ts">
import { FileJson } from '@lucide/vue'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { BRAND, quickstartCommand } from '../../../../../packages/brand/src/brand'
import { isSupportedWebLocale, readLocalePreference, resolvePreferredWebLocale } from '../../services/locale'
import { fillLanding, landingMessages } from '../../services/landing-messages'
import QuickstartCommand from './QuickstartCommand.vue'
import SampleViewer from './SampleViewer.vue'

const route = useRoute()
const locale = computed(() => {
  const routeLocale = route.params.locale
  if (typeof routeLocale === 'string' && isSupportedWebLocale(routeLocale)) return routeLocale
  return resolvePreferredWebLocale(readLocalePreference(), navigator.languages)
})
const messages = computed(() => landingMessages(locale.value))
const subtitle = computed(() => fillLanding(messages.value.subtitle, {
  name: BRAND.name,
  graphFile: BRAND.graphFile,
  config: BRAND.configFile
}))
const command = quickstartCommand()
</script>

<template>
  <section id="hero" class="hero">
    <div class="inner">
      <div class="copy">
        <p class="badge">
          <FileJson :size="14" aria-hidden="true" />
          <span>{{ messages.badge }}</span>
        </p>
        <h1>{{ BRAND.tagline }}</h1>
        <p class="subtitle">{{ subtitle }}</p>
        <QuickstartCommand
          :command="command"
          :label="messages.quickstart.label"
          :copy-label="messages.quickstart.copy"
          :copied-label="messages.quickstart.copied"
          :failed-label="messages.quickstart.copyFailed"
        />
        <div class="actions">
          <a class="btn" href="#viewer">{{ messages.openViewer }}</a>
          <a class="text-link" :href="BRAND.repoUrl">{{ messages.github }}</a>
        </div>
        <ul class="facts">
          <li class="card">
            <strong>{{ messages.facts.provenance.title }}</strong>
            <span>{{ messages.facts.provenance.body }}</span>
          </li>
          <li class="card">
            <strong>{{ messages.facts.coverage.title }}</strong>
            <span>{{ messages.facts.coverage.body }}</span>
          </li>
          <li class="card">
            <strong>{{ messages.facts.local.title }}</strong>
            <span>{{ messages.facts.local.body }}</span>
          </li>
        </ul>
      </div>
      <div id="viewer">
        <SampleViewer :alt="messages.imageAlt" :sample-pill="messages.samplePill" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  padding: var(--space-32) var(--space-6) var(--space-16);
}

.inner {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--space-8);
  max-inline-size: var(--content-width);
  margin-inline: auto;
  align-items: start;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0 0 var(--space-4);
  color: var(--color-text-secondary);
}

h1 {
  margin: 0 0 var(--space-4);
  color: var(--color-text-primary);
  font-size: clamp(var(--font-size-5xl), 5vw, var(--font-size-6xl));
  line-height: var(--line-height-tight);
}

.subtitle {
  max-inline-size: var(--content-width-copy);
  margin: 0 0 var(--space-5);
  color: var(--color-text-secondary);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-4);
  margin-block: var(--space-5);
}

.btn,
.text-link {
  min-block-size: var(--viewer-hit-target);
  display: inline-flex;
  align-items: center;
}

.btn {
  padding-inline: var(--space-4);
  border-radius: var(--radius-md);
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  text-decoration: none;
}

.text-link {
  color: var(--color-accent-primary);
}

.facts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.card {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.card span {
  color: var(--color-text-secondary);
}

@media (max-width: 920px) {
  .inner,
  .facts {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .hero {
    padding-top: var(--space-24);
  }
}
</style>
