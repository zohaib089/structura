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
    <BrandMark class="closing__mark" :size="56" />
    <h2 id="landing-fin-h" class="landing-h2">{{ copy.closing.title }}</h2>
    <p class="landing-lead closing__lead">{{ copy.closing.lead }}</p>
    <div class="closing__ctas">
      <LandingCta :to="links.viewer.value" variant="amber" size="lg">{{ copy.cta.viewer }}</LandingCta>
      <LandingCta to="#self-host" variant="ghost" size="lg">{{ copy.cta.selfHost }}</LandingCta>
      <LandingCta :to="links.repo" variant="ghost" size="lg"><GithubMark />{{ copy.cta.github }}</LandingCta>
    </div>
  </section>
</template>

<style scoped>
.closing {
  padding: clamp(72px, 9vw, 128px) var(--landing-pad);
  border-block-start: 1px solid var(--gray-4);
  text-align: center;
}
.closing__mark {
  margin-block-end: var(--space-6);
}
.closing h2 {
  max-inline-size: 20em;
  margin-inline: auto;
}
.closing__lead {
  margin-inline: auto;
}
.closing__ctas {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-3);
  margin-block-start: 32px;
}
</style>
