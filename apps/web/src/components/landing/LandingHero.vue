<script setup lang="ts">
import { ArrowRight, CircleDot } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useLandingLinks } from '../../composables/useLandingLinks'
import { landingPageCopy as copy, stepsAway } from '../../services/landing-page-copy'
import { SAMPLE_NODES, type SampleNode } from '../../services/landing-sample-graph'
import GithubMark from './GithubMark.vue'
import LandingCta from './LandingCta.vue'
import RadialSampleGraph from './RadialSampleGraph.vue'

const links = useLandingLinks()
const inspected = ref<SampleNode | null>(null)

const inspectTitle = computed(() => {
  const node = inspected.value
  if (!node) return copy.hero.inspectDefaultTitle
  return node.entry ? copy.hero.inspectDefaultTitle : node.label
})
const inspectParts = computed(() => {
  const node = inspected.value
  if (!node || node.entry) return null
  return {
    severity: node.severity === 'info' ? copy.severity.info : `${copy.severity[node.severity]} issue`,
    steps: stepsAway(node.ring),
    link: copy.linkKind[node.link]
  }
})
const inspectBody = computed(() =>
  inspected.value?.entry ? copy.hero.inspectEntryBody : copy.hero.inspectDefaultBody
)
</script>

<template>
  <section id="top" class="landing-hero" aria-labelledby="landing-h1">
    <div class="landing-hero__graph">
      <RadialSampleGraph @inspect="inspected = $event" />
    </div>

    <div class="landing-hero__copy">
      <div class="landing-hero__eyebrow">{{ copy.hero.eyebrow }}</div>
      <h1 id="landing-h1">{{ copy.hero.titleLead }}<em>{{ copy.hero.titleEmphasis }}</em></h1>
      <p class="landing-hero__lead">
        {{ copy.hero.leadBefore }}<strong>{{ copy.hero.leadMap }}</strong>{{ copy.hero.leadMiddle }}<strong>{{ copy.hero.leadNoAccount }}</strong>{{ copy.hero.leadAfter }}
      </p>
      <div class="landing-hero__ctas">
        <LandingCta :to="links.viewer.value" variant="amber" size="lg">
          {{ copy.cta.viewer }} <ArrowRight aria-hidden="true" />
        </LandingCta>
        <LandingCta to="#self-host" variant="ghost" size="lg">{{ copy.cta.selfHost }}</LandingCta>
        <LandingCta :to="links.repo" variant="ghost" size="lg"><GithubMark />{{ copy.cta.github }}</LandingCta>
      </div>
      <RouterLink v-if="links.app.value" :to="links.app.value.to" class="landing-hero__scan">
        <template v-if="!links.signedIn.value">{{ copy.hero.scanPrompt }}</template>{{ links.app.value.label }}
        <ArrowRight :size="14" aria-hidden="true" />
      </RouterLink>
    </div>

    <div class="landing-hero__foot">
      <div class="landing-hero__legend" role="group" :aria-label="copy.hero.legendLabel">
        <span>
          <svg viewBox="0 0 34 8" aria-hidden="true"><line x1="1" y1="4" x2="33" y2="4" stroke="currentColor" stroke-width="1.6" /></svg>
          {{ copy.hero.legend.extracted }}
        </span>
        <span>
          <svg viewBox="0 0 34 8" aria-hidden="true"><line x1="1" y1="4" x2="33" y2="4" stroke="currentColor" stroke-width="1.6" stroke-dasharray="6 4" /></svg>
          {{ copy.hero.legend.inferred }}
        </span>
        <span>
          <svg viewBox="0 0 34 8" aria-hidden="true"><line x1="1" y1="4" x2="33" y2="4" stroke="currentColor" stroke-width="1.8" stroke-dasharray="1.5 4.5" stroke-linecap="round" /></svg>
          {{ copy.hero.legend.unresolved }}
        </span>
      </div>
      <figure class="landing-hero__fig">
        <div class="landing-hero__inspect" role="status" aria-live="polite" data-testid="landing-inspector">
          <div class="landing-hero__inspect-title">
            <CircleDot :size="14" aria-hidden="true" />
            <span>{{ inspectTitle }}</span>
          </div>
          <div class="landing-hero__inspect-body">
            <template v-if="inspectParts">
              <b>{{ inspectParts.severity }}</b> · {{ inspectParts.steps }} from {{ SAMPLE_NODES[0]?.label }} · link:
              <b>{{ inspectParts.link }}</b>
            </template>
            <template v-else>{{ inspectBody }}</template>
          </div>
        </div>
        <figcaption>
          <span class="landing-hero__sample-tag"><i aria-hidden="true" />{{ copy.hero.sampleTag }}</span>
        </figcaption>
      </figure>
    </div>

    <div id="landing-graph-desc" class="landing-sr-only">
      {{ copy.hero.graphTextIntro }}
      <ul :aria-label="copy.hero.graphListLabel">
        <li v-for="node in SAMPLE_NODES.filter(n => !n.entry)" :key="node.id">
          {{ node.label }} — ring {{ node.ring }}, {{ copy.linkKind[node.link] }},
          {{ node.severity === 'info' ? 'no issues' : `${copy.severity[node.severity]} issue` }}
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.landing-hero {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-block-size: 100vh;
  min-block-size: 100svh;
  margin-block-start: calc(var(--landing-nav-h) * -1);
  padding: calc(var(--landing-nav-h) + 40px) var(--landing-pad) 40px;
  overflow: hidden;
  isolation: isolate;
  background:
    radial-gradient(60% 70% at 72% 52%, color-mix(in srgb, var(--color-brand-navy) 55%, transparent) 0%, transparent 70%),
    var(--gray-0);
}
.landing-hero__graph {
  position: absolute;
  z-index: -1;
  inset-block: var(--landing-nav-h) 0;
  inset-inline-end: 0;
  aspect-ratio: 1 / 1;
  max-inline-size: 100%;
}
/* Flat scrim so the headline stays readable over the rings. */
.landing-hero::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background: linear-gradient(90deg, var(--gray-0) 0%, color-mix(in srgb, var(--gray-0) 92%, transparent) 28%, transparent 56%);
}
.landing-hero__copy {
  position: relative;
  max-inline-size: 600px;
}
.landing-hero__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-block-end: 20px;
  color: var(--color-brand-amber-ui);
  font: 500 12px/16px var(--landing-font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.landing-hero__eyebrow::before {
  content: '';
  inline-size: 22px;
  block-size: 1px;
  background: var(--color-brand-amber-ui);
}
h1 {
  margin: 0 0 20px;
  font: 600 clamp(36px, 4.6vw, 64px) / 1.04 var(--font-family-sans);
  letter-spacing: -0.03em;
  text-wrap: balance;
}
h1 em {
  font-style: normal;
  color: var(--color-brand-amber-ui);
}
.landing-hero__lead {
  margin: 0 0 32px;
  max-inline-size: 34em;
  color: var(--gray-8);
  font-size: clamp(17px, 1.35vw, 20px);
  line-height: 1.55;
}
.landing-hero__lead strong {
  color: var(--gray-10);
  font-weight: var(--font-weight-medium);
}
.landing-hero__ctas {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-block-end: 20px;
}
.landing-hero__scan {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding-block: var(--space-1);
  border-radius: var(--r-xs);
  color: var(--gray-8);
  font-size: var(--text-14);
  text-decoration: none;
}
.landing-hero__scan:hover {
  color: var(--gray-10);
  text-decoration: underline;
  text-underline-offset: 4px;
}

.landing-hero__foot {
  position: absolute;
  inset-inline: var(--landing-pad);
  inset-block-end: 24px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-6);
  pointer-events: none;
}
.landing-hero__foot > * {
  pointer-events: auto;
}
.landing-hero__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  color: var(--gray-8);
  font-size: var(--text-12);
}
.landing-hero__legend span {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}
.landing-hero__legend svg {
  inline-size: 34px;
  block-size: 8px;
}
.landing-hero__fig {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  margin: 0;
  text-align: end;
}
.landing-hero__sample-tag {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 5px var(--space-3);
  border: 1px solid var(--gray-4);
  border-radius: var(--r-full);
  background: var(--gray-1);
  color: var(--gray-8);
  font: 500 12px/16px var(--landing-font-mono);
}
.landing-hero__sample-tag i {
  inline-size: 6px;
  block-size: 6px;
  border-radius: 50%;
  background: var(--color-brand-amber-ui);
}
.landing-hero__inspect {
  inline-size: min(340px, 100%);
  padding: var(--space-3) 14px;
  border: 1px solid var(--gray-5);
  border-radius: 10px;
  background: var(--gray-2);
  text-align: start;
  font-size: var(--text-13);
  line-height: 1.45;
}
.landing-hero__inspect-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-block-end: 2px;
  color: var(--gray-10);
  font-weight: var(--font-weight-semibold);
}
.landing-hero__inspect-title svg {
  flex: none;
  color: var(--color-brand-amber-ui);
}
.landing-hero__inspect-body {
  color: var(--gray-8);
}
.landing-hero__inspect-body b {
  color: var(--gray-10);
  font-weight: var(--font-weight-medium);
}

@media (max-width: 900px) {
  .landing-hero {
    min-block-size: 0;
    justify-content: flex-start;
    padding-block-end: 0;
  }
  .landing-hero::after {
    display: none;
  }
  .landing-hero__copy {
    max-inline-size: none;
  }
  .landing-hero__graph {
    position: relative;
    order: 3;
    inset: auto;
    inline-size: min(100%, 640px);
    margin: 24px auto 0;
  }
  .landing-hero__foot {
    position: static;
    order: 4;
    flex-direction: column;
    align-items: stretch;
    padding-block: 8px 28px;
  }
  .landing-hero__fig {
    align-items: flex-start;
    text-align: start;
  }
}
@media (max-width: 640px) {
  .landing-hero__graph {
    inline-size: 112%;
    margin-inline-start: -6%;
  }
}
</style>
