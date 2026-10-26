<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { BRAND } from '../../../../../packages/brand/src/brand'
import { hostedAppEnabled } from '../../hosted-app'
import BrandMark from '../brand/BrandMark.vue'
import { getCurrentSession } from '../../services/auth'
import { isSupportedWebLocale, localizedPath, readLocalePreference, resolvePreferredWebLocale } from '../../services/locale'
import { landingMessages } from '../../services/landing-messages'
import { navigationMessages } from '../../services/navigation-messages'

const route = useRoute()
const year = new Date().getFullYear()
const locale = computed(() => {
  const routeLocale = route.params.locale
  if (typeof routeLocale === 'string' && isSupportedWebLocale(routeLocale)) return routeLocale
  return resolvePreferredWebLocale(readLocalePreference(), navigator.languages)
})
const messages = computed(() => landingMessages(locale.value))
const nav = computed(() => navigationMessages(locale.value))
const isAuthenticated = computed(() => Boolean(route.fullPath) && getCurrentSession() !== null)
</script>

<template>
  <footer class="footer">
    <div class="container">
      <div class="top">
        <div class="brand-block">
          <div class="logo">
            <BrandMark :size="28" />
            <span>{{ BRAND.wordmark }}</span>
          </div>
          <p>{{ BRAND.tagline }}</p>
        </div>

        <div class="links">
          <div class="col">
            <h4>{{ messages.footer.product }}</h4>
            <a href="#quickstart">{{ nav.quickstart }}</a>
            <a href="#honest">{{ nav.honest }}</a>
            <a href="#coverage">{{ nav.coverage }}</a>
            <a href="#drift">{{ nav.drift }}</a>
            <a href="#how">{{ nav.howItWorks }}</a>
          </div>
          <div class="col">
            <h4>{{ messages.footer.github }}</h4>
            <a :href="BRAND.repoUrl">{{ messages.github }}</a>
            <template v-if="hostedAppEnabled && !isAuthenticated">
              <RouterLink :to="localizedPath(locale, '/auth/login')">{{ nav.logIn }}</RouterLink>
              <RouterLink :to="localizedPath(locale, '/auth/signup')">{{ nav.launchApp }}</RouterLink>
            </template>
          </div>
        </div>
      </div>

      <div class="bottom">
        <p>© {{ year }} {{ BRAND.name }}</p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  position: relative;
  padding: var(--space-20) var(--space-6) var(--space-8);
  border-top: 1px solid color-mix(in srgb, var(--color-accent-primary) var(--alpha-12), transparent);
  background: linear-gradient(180deg, color-mix(in srgb, var(--color-surface) var(--alpha-full), transparent), color-mix(in srgb, var(--color-surface) var(--alpha-full), transparent));
}

.container {
  max-width: var(--content-width);
  margin: 0 auto;
}

.top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-14);
  margin-bottom: var(--space-10);
  flex-wrap: wrap;
}

.brand-block {
  max-width: 360px;
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-extrabold);
  letter-spacing: var(--tracking-tighter);
}

.logo-mark {
  position: relative;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  border: 2px solid color-mix(in srgb, var(--color-highlight) var(--alpha-90), transparent);
  border-left-color: color-mix(in srgb, var(--color-accent-primary) var(--alpha-90), transparent);
  border-bottom-color: color-mix(in srgb, var(--color-accent-secondary) var(--alpha-90), transparent);
  transform: rotate(45deg);
  box-shadow: var(--shadow-accent-glow);
}

.brand-block p {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-relaxed);
}

.cta-row {
  margin-top: var(--space-4);
}

.cta-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--color-accent-gradient-soft);
  color: var(--color-text-on-accent);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-extrabold);
  box-shadow: var(--shadow-accent-glow);
}

.links {
  display: flex;
  gap: var(--space-12);
  flex-wrap: wrap;
}

.col {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 120px;
}

.col h4 {
  margin-bottom: var(--space-1);
  font-size: var(--font-size-xs);
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
  color: var(--color-text-primary);
}

.col a,
.meta-links a {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  transition: color var(--duration-normal) ease;
}

.col a:hover,
.meta-links a:hover {
  color: var(--color-accent-primary);
}

.bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-5);
  padding-top: var(--space-6);
  border-top: 1px solid color-mix(in srgb, var(--color-accent-primary) var(--alpha-12), transparent);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  flex-wrap: wrap;
}

.meta-links {
  display: flex;
  gap: var(--space-4);
}

[data-theme='light'] .footer {
  background: linear-gradient(180deg, color-mix(in srgb, var(--color-surface-raised) var(--alpha-90), transparent), color-mix(in srgb, var(--color-highlight) var(--alpha-90), transparent));
}

[data-theme='light'] .logo-mark {
  border-color: color-mix(in srgb, var(--color-surface) var(--alpha-80), transparent);
  border-left-color: color-mix(in srgb, var(--color-accent-primary) var(--alpha-90), transparent);
  border-bottom-color: color-mix(in srgb, var(--color-accent-secondary) var(--alpha-90), transparent);
}

[data-theme='light'] .cta-btn {
  box-shadow: var(--shadow-accent-glow);
}

@media (max-width: 640px) {
  .footer {
    padding-top: var(--space-14);
  }

  .links {
    width: 100%;
    justify-content: space-between;
    gap: var(--space-6);
  }

  .bottom {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>