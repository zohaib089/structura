<script setup lang="ts">
import { computed } from 'vue'
import { BRAND } from '../../../../../packages/brand/src/brand'
import { useLandingLinks } from '../../composables/useLandingLinks'
import { useLandingCopy } from '../../composables/useLandingCopy'
import { navigationMessages } from '../../services/navigation-messages'
import BrandMark from '../brand/BrandMark.vue'
import GithubMark from './GithubMark.vue'

const copy = useLandingCopy()

const links = useLandingLinks()
const year = new Date().getFullYear()
const tagline = computed(() => navigationMessages(links.locale.value).brandTagline)
</script>

<template>
  <footer class="landing-footer">
    <div class="landing-footer__inner">
      <div class="landing-footer__top">
        <div class="landing-footer__brand-col">
          <RouterLink :to="links.home.value" class="landing-footer__brand" :aria-label="copy.homeLabel">
            <BrandMark :size="28" />
            <span>{{ BRAND.name }}</span>
          </RouterLink>
          <p class="landing-footer__tagline">{{ tagline }}</p>
        </div>
        <nav class="landing-footer__cols" :aria-label="copy.footer.label">
          <div class="landing-footer__col">
            <p id="landing-footer-product" class="landing-footer__heading">{{ copy.nav.product }}</p>
            <ul aria-labelledby="landing-footer-product">
              <li><a href="#how">{{ copy.nav.how }}</a></li>
              <li><RouterLink :to="links.viewer.value">{{ copy.cta.viewer }}</RouterLink></li>
              <li><a href="#self-host">{{ copy.footer.selfHost }}</a></li>
            </ul>
          </div>
          <div class="landing-footer__col">
            <p id="landing-footer-resources" class="landing-footer__heading">{{ copy.footer.resources }}</p>
            <ul aria-labelledby="landing-footer-resources">
              <li><a :href="links.docs" rel="noopener noreferrer">{{ copy.footer.docs }}</a></li>
              <li><a :href="links.selfHostDocs" rel="noopener noreferrer">{{ copy.cta.selfHostGuide }}</a></li>
              <li><a :href="links.repo" rel="noopener noreferrer"><GithubMark />{{ copy.footer.github }}</a></li>
            </ul>
          </div>
        </nav>
      </div>
      <div class="landing-footer__bar">
        <span>© {{ year }} {{ BRAND.name }}</span>
        <span class="landing-footer__meta">{{ copy.hero.eyebrow }}</span>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.landing-footer {
  position: relative;
  padding: clamp(48px, 6vw, 72px) var(--landing-pad) var(--space-6);
  border-block-start: 1px solid var(--gray-4);
  background:
    radial-gradient(50% 120% at 0% 0%, color-mix(in srgb, var(--color-brand-navy) 18%, transparent) 0%, transparent 70%),
    var(--gray-1);
  color: var(--gray-8);
  font-size: var(--text-14);
}
.landing-footer__inner {
  max-inline-size: var(--landing-measure);
  margin-inline: auto;
}
.landing-footer__top {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
  gap: var(--space-8) clamp(32px, 6vw, 96px);
  padding-block-end: clamp(32px, 4vw, 48px);
}
.landing-footer__brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border-radius: var(--r-sm);
  color: var(--gray-10);
  font-size: 18px;
  font-weight: var(--font-weight-semibold);
  letter-spacing: -0.02em;
  text-decoration: none;
}
.landing-footer__tagline {
  max-inline-size: 24em;
  margin: 14px 0 0;
  color: var(--gray-8);
  font-size: 15px;
  line-height: 1.55;
}
.landing-footer__cols {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-6);
}
.landing-footer__heading {
  margin: 0 0 14px;
  color: var(--gray-7);
  font: 500 12px/16px var(--landing-font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
ul {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.landing-footer__col a {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border-radius: var(--r-xs);
  color: var(--gray-10);
  text-decoration: none;
  transition: color var(--dur-2) var(--easing-product);
}
.landing-footer__col a :deep(svg) {
  inline-size: 15px;
  block-size: 15px;
  color: var(--gray-8);
}
.landing-footer__col a:hover {
  color: var(--color-brand-amber-ui);
}
.landing-footer__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2) var(--space-6);
  padding-block-start: var(--space-5);
  border-block-start: 1px solid var(--gray-4);
  color: var(--gray-7);
  font-size: var(--text-13);
}
.landing-footer__meta {
  font: 500 11px/16px var(--landing-font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

@media (max-width: 720px) {
  .landing-footer__top {
    grid-template-columns: 1fr;
  }
}
</style>
