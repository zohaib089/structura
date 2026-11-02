<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { BRAND, quickstartCommand } from '../../../../../packages/brand/src/brand'
import { showGithubStar } from '../../landing-flags'
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
const headline = computed(() => `${messages.value.headlineLead} ${messages.value.headlineProve}${messages.value.headlineTail}`)
const command = quickstartCommand()
const live = ref(false)

onMounted(() => {
  requestAnimationFrame(() => { live.value = true })
})
</script>

<template>
  <section id="hero" class="hero">
    <div class="inner">
      <div class="copy">
        <p class="badge">{{ messages.badge }}</p>
        <h1>
          <span class="sr-only">{{ headline }}</span>
          <span aria-hidden="true">{{ messages.headlineLead }} </span>
          <span class="prove" aria-hidden="true">{{ messages.headlineProve }}</span>
          <span aria-hidden="true">{{ messages.headlineTail }}</span>
        </h1>
        <p class="subtitle">{{ subtitle }}</p>
        <QuickstartCommand
          :command="command"
          :label="messages.quickstart.label"
          :copy-label="messages.quickstart.copy"
          :copied-label="messages.quickstart.copied"
          :failed-label="messages.quickstart.copyFailed"
          :sample-label="messages.commandSample"
        />
        <div class="actions">
          <a class="btn" href="#viewer">{{ messages.openViewer }}</a>
          <a v-if="showGithubStar" class="text-link" :href="BRAND.repoUrl">{{ messages.starGithub }}</a>
        </div>
      </div>
      <div id="viewer">
        <div v-if="!live" class="poster" role="img" :aria-label="messages.imageAlt">
          <span class="pill">{{ messages.samplePill }}</span>
          <span class="cluster"></span>
          <span class="cluster second"></span>
          <span class="file"></span>
        </div>
        <SampleViewer v-else :alt="messages.imageAlt" :sample-pill="messages.samplePill" />
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
  align-items: center;
}

.badge {
  margin: 0 0 var(--space-4);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
}

h1 {
  margin: 0 0 var(--space-4);
  color: var(--color-text-primary);
  font-size: var(--font-size-6xl);
  font-weight: var(--font-weight-extrabold);
  line-height: var(--line-height-display);
  letter-spacing: var(--tracking-display);
}

.prove { color: var(--color-brand-amber-ui); }

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
  background: var(--color-brand-amber-ui);
  border: 0;
  color: var(--color-on-brand-amber);
  font-weight: var(--font-weight-semibold);
  text-decoration: none;
}

.text-link { color: var(--color-accent-primary); }

.poster {
  position: relative;
  display: grid;
  gap: var(--space-3);
  align-content: center;
  block-size: 28rem;
  padding: var(--space-6);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-2xl);
  background: var(--color-canvas);
  box-shadow: var(--shadow-lg);
}

.pill {
  justify-self: start;
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-raised);
  font-size: var(--font-size-sm);
}

.cluster,
.file {
  display: block;
  block-size: var(--graph-node-height);
  border: var(--graph-node-border-width) solid var(--graph-node-border);
  background: var(--surface-tint);
}

.cluster { inline-size: 9rem; border-radius: var(--radius-lg); border-inline-start: 3px solid var(--graph-layer-1); }
.second { border-inline-start-color: var(--graph-layer-2); }
.file { inline-size: 7rem; border-radius: var(--radius-full); background: var(--graph-node-fill); }

.sr-only {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

@media (max-width: 920px) {
  .inner { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .hero { padding-top: var(--space-24); }
  h1 { font-size: var(--font-size-4xl); }
}
</style>
