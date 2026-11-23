<script setup lang="ts">
import { useLandingLinks } from '../../composables/useLandingLinks'
import { useLandingCopy } from '../../composables/useLandingCopy'
import BrandMark from '../brand/BrandMark.vue'
import GithubMark from './GithubMark.vue'
import LandingCta from './LandingCta.vue'

const copy = useLandingCopy()

const links = useLandingLinks()
</script>

<template>
  <section class="closing" aria-labelledby="landing-fin-h">
    <div class="closing__card">
      <svg class="closing__rings" viewBox="0 0 400 400" aria-hidden="true">
        <circle v-for="r in [70, 120, 170]" :key="r" cx="200" cy="200" :r="r" />
      </svg>
      <BrandMark class="closing__mark" :size="56" />
      <h2 id="landing-fin-h" class="landing-h2">{{ copy.closing.title }}</h2>
      <p class="landing-lead closing__lead">{{ copy.closing.lead }}</p>
      <div class="closing__ctas">
        <LandingCta :to="links.viewer.value" variant="amber" size="lg">{{ copy.cta.viewer }}</LandingCta>
        <LandingCta to="#self-host" variant="ghost" size="lg">{{ copy.cta.selfHost }}</LandingCta>
        <LandingCta :to="links.repo" variant="ghost" size="lg"><GithubMark />{{ copy.cta.github }}</LandingCta>
      </div>
    </div>
  </section>
</template>

<style scoped>
.closing {
  padding: clamp(64px, 7vw, 96px) var(--landing-pad);
  border-block-start: 1px solid var(--gray-4);
  text-align: center;
}
/* The CTA band: a navy panel with the hero's rings and glow, dark in both themes like the self-host band. */
.closing__card {
  position: relative;
  isolation: isolate;
  max-inline-size: var(--landing-measure);
  margin-inline: auto;
  padding: clamp(48px, 6vw, 80px) clamp(20px, 4vw, 64px);
  overflow: hidden;
  border: 1px solid var(--landing-navy-line);
  border-radius: 24px;
  background:
    radial-gradient(50% 70% at 50% 0%, color-mix(in srgb, var(--color-brand-amber-ui) 14%, transparent) 0%, transparent 70%),
    linear-gradient(170deg, var(--color-brand-navy) 0%, var(--landing-navy-deep) 100%);
  box-shadow: 0 40px 80px -48px rgb(0 0 0 / 0.8);
  color: #fff;

  --gray-0: #0b0d10;
  --gray-3: #1f2329;
  --gray-5: #3a4049;
  --gray-7: #7d838c;
  --gray-10: #e6e8eb;
  --color-brand-amber-ui: #e0a040;
}
.closing__rings {
  position: absolute;
  inset-block-start: 50%;
  inset-inline-start: 50%;
  z-index: -1;
  inline-size: 760px;
  block-size: 760px;
  transform: translate(-50%, -50%);
  fill: none;
  stroke: var(--landing-navy-ring);
  stroke-width: 0.6;
  stroke-dasharray: 2 5;
  opacity: 0.45;
}
.closing__mark {
  margin-block-end: var(--space-5);
}
.closing h2 {
  max-inline-size: 20em;
  margin-inline: auto;
  color: #fff;
}
.closing__lead {
  margin-inline: auto;
  color: var(--landing-navy-lead);
}
.closing__ctas {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-3);
  margin-block-start: 32px;
}
.closing__ctas :deep(.landing-cta--ghost) {
  border-color: var(--landing-navy-ring);
  color: #fff;
}
.closing__ctas :deep(.landing-cta--ghost:hover) {
  background: rgb(255 255 255 / 0.08);
  border-color: var(--landing-navy-accent);
}
.closing :focus-visible {
  box-shadow: 0 0 0 2px var(--color-brand-navy), 0 0 0 4px var(--color-brand-amber-ui);
}
@media (max-width: 640px) {
  .closing {
    padding-inline: 16px;
  }
  .closing__card {
    border-radius: 18px;
  }
}
</style>
