<script setup lang="ts">
import { BRAND } from '../../../../../packages/brand/src/brand'
import { useLandingLinks } from '../../composables/useLandingLinks'
import { useLandingCopy } from '../../composables/useLandingCopy'
import BrandMark from '../brand/BrandMark.vue'

const copy = useLandingCopy()

const links = useLandingLinks()
const year = new Date().getFullYear()
</script>

<template>
  <footer class="landing-footer">
    <RouterLink :to="links.home.value" class="landing-footer__brand" :aria-label="copy.homeLabel">
      <BrandMark :size="26" />
      <span>{{ BRAND.name }}</span>
    </RouterLink>
    <nav :aria-label="copy.footer.label">
      <a :href="links.repo" rel="noopener noreferrer">{{ copy.footer.github }}</a>
      <a :href="links.docs" rel="noopener noreferrer">{{ copy.footer.docs }}</a>
      <a href="#self-host">{{ copy.footer.selfHost }}</a>
    </nav>
    <span>© {{ year }} {{ BRAND.name }}</span>
  </footer>
</template>

<style scoped>
.landing-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 20px 40px;
  padding: var(--space-8) var(--landing-pad);
  border-block-start: 1px solid var(--gray-4);
  background: var(--gray-1);
  color: var(--gray-8);
  font-size: var(--text-14);
}
.landing-footer__brand {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  border-radius: var(--r-sm);
  color: var(--gray-10);
  font-size: 16px;
  font-weight: var(--font-weight-semibold);
  letter-spacing: -0.02em;
  text-decoration: none;
}
nav {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-6);
}
nav a {
  border-radius: var(--r-xs);
  color: var(--gray-8);
  text-decoration: none;
}
nav a:hover {
  color: var(--gray-10);
  text-decoration: underline;
  text-underline-offset: 4px;
}
</style>
