<script setup lang="ts">
import { BRAND } from '../../../../../packages/brand/src/brand'
import { useLandingLinks } from '../../composables/useLandingLinks'
import { landingPageCopy as copy } from '../../services/landing-page-copy'
import { navigationMessages } from '../../services/navigation-messages'
import { useRoute } from 'vue-router'
import { computed } from 'vue'
import { isSupportedWebLocale } from '../../services/locale'
import BrandMark from '../brand/BrandMark.vue'
import LocaleSwitcher from '../layout/LocaleSwitcher.vue'
import ThemeToggle from '../layout/ThemeToggle.vue'
import GithubMark from './GithubMark.vue'
import LandingCta from './LandingCta.vue'

const links = useLandingLinks()
const route = useRoute()
const navMessages = computed(() => {
  const raw = route.params.locale
  return navigationMessages(typeof raw === 'string' && isSupportedWebLocale(raw) ? raw : 'en')
})
</script>

<template>
  <header class="landing-nav">
    <RouterLink :to="links.home.value" class="landing-nav__brand" :aria-label="copy.homeLabel">
      <BrandMark :size="28" />
      <span class="landing-nav__name">{{ BRAND.name }}</span>
    </RouterLink>
    <nav class="landing-nav__links" :aria-label="copy.nav.label">
      <a href="#product">{{ copy.nav.product }}</a>
      <a href="#how">{{ copy.nav.how }}</a>
      <a :href="links.docs" rel="noopener noreferrer">{{ copy.nav.docs }}</a>
    </nav>
    <div class="landing-nav__spacer" />
    <div class="landing-nav__actions">
      <LocaleSwitcher class="landing-nav__locale" />
      <ThemeToggle :label="navMessages.toggleTheme" />
      <a class="landing-nav__github" :href="links.repo" rel="noopener noreferrer" :aria-label="copy.nav.githubLabel">
        <GithubMark />
        <span>{{ copy.nav.github }}</span>
      </a>
      <LandingCta class="landing-nav__viewer" :to="links.viewer.value" variant="ghost" size="sm">{{ copy.cta.viewer }}</LandingCta>
      <LandingCta v-if="links.app.value" :to="links.app.value.to" variant="neutral" size="sm">{{ links.app.value.label }}</LandingCta>
    </div>
  </header>
</template>

<style scoped>
.landing-nav {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 28px;
  block-size: var(--landing-nav-h);
  padding-inline: var(--landing-pad);
  background: color-mix(in srgb, var(--gray-0) 82%, transparent);
  backdrop-filter: blur(10px);
  border-block-end: 1px solid var(--gray-4);
}
.landing-nav__brand {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
  flex: none;
  border-radius: var(--r-sm);
  color: var(--gray-10);
  text-decoration: none;
  font-size: 18px;
  font-weight: var(--font-weight-semibold);
  letter-spacing: -0.02em;
}
.landing-nav__links {
  display: flex;
  gap: var(--space-1);
  margin-inline-start: var(--space-3);
}
.landing-nav__links a,
.landing-nav__github {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--r-sm);
  color: var(--gray-8);
  font-size: var(--text-14);
  font-weight: var(--font-weight-medium);
  text-decoration: none;
}
.landing-nav__links a:hover,
.landing-nav__github:hover {
  color: var(--gray-10);
  background: var(--gray-3);
}
.landing-nav__github :deep(svg) {
  inline-size: 18px;
  block-size: 18px;
}
.landing-nav__locale :deep(select) {
  inline-size: 7.5rem;
  min-block-size: var(--header-control-h);
  padding-block: var(--space-1);
  font-size: var(--text-13);
}
.landing-nav__spacer {
  flex: 1;
}
.landing-nav__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

@media (max-width: 1100px) {
  .landing-nav__links {
    display: none;
  }
}
@media (max-width: 900px) {
  .landing-nav__github span,
  .landing-nav__viewer {
    display: none;
  }
}
@media (max-width: 480px) {
  .landing-nav { gap: var(--space-2); }
  .landing-nav__actions { gap: var(--space-1); }
  .landing-nav__github { display: none; }
  .landing-nav__locale :deep(select) { inline-size: 5.75rem; }
}
@media (max-width: 400px) {
  .landing-nav__name {
    display: none;
  }
}
</style>
