<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { BRAND } from '../../../../../packages/brand/src/brand'
import BrandMark from '../brand/BrandMark.vue'
import { hostedAppEnabled } from '../../hosted-app'
import LocaleSwitcher from './LocaleSwitcher.vue'
import ThemeToggle from './ThemeToggle.vue'
import { isSupportedWebLocale, readLocalePreference, resolvePreferredWebLocale } from '../../services/locale'
import { navigationMessages } from '../../services/navigation-messages'
import { getCurrentSession, logoutUser } from '../../services/auth'

const route = useRoute()
const router = useRouter()

const locale = computed(() => {
  const routeLocale = route.params.locale
  if (typeof routeLocale === 'string' && isSupportedWebLocale(routeLocale)) return routeLocale
  return resolvePreferredWebLocale(readLocalePreference(), navigator.languages)
})
const messages = computed(() => navigationMessages(locale.value))
const showLandingLinks = computed(() => route.name === 'home' || route.name === 'localized-home')
const isAuthenticated = computed(() =>
  Boolean(route.fullPath) && getCurrentSession() !== null
)
const scrolled = ref(false)

function scrollOffset() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--nav-scroll-offset').trim()
  const parsed = Number.parseFloat(raw)
  return Number.isFinite(parsed) ? parsed : 8
}

function onScroll() {
  scrolled.value = window.scrollY > scrollOffset()
}

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))

async function handleLogout() {
  const result = await logoutUser()
  await router.push({
    path: `/${locale.value}/auth/login`,
    query: result.success ? {} : { notice: result.message }
  })
}
</script>

<template>
  <header class="navbar" :class="{ 'is-scrolled': scrolled }">
    <div class="container">
      <div class="logo-wrap">
        <RouterLink :to="`/${locale}`" class="logo" :aria-label="messages.home">
          <BrandMark :size="28" />
          <span class="logo-text">{{ BRAND.name }}</span>
        </RouterLink>
      </div>

      <nav v-if="showLandingLinks" class="nav-links" :aria-label="messages.mainNavigation">
        <a href="#honest">{{ messages.honest }}</a>
        <a href="#coverage">{{ messages.coverage }}</a>
        <a href="#drift">{{ messages.drift }}</a>
        <a href="#how">{{ messages.howItWorks }}</a>
        <a href="#quickstart">{{ messages.quickstart }}</a>
        <a v-if="hostedAppEnabled" :href="`${BRAND.repoUrl}#readme`">{{ messages.docs }}</a>
        <RouterLink v-if="hostedAppEnabled" :to="`/${locale}/dashboard`">{{ messages.dashboard }}</RouterLink>
        <a :href="BRAND.repoUrl">{{ messages.github }}</a>
      </nav>

      <div class="right-side">
        <LocaleSwitcher />

        <ThemeToggle :label="messages.toggleTheme" />

        <button v-if="hostedAppEnabled && isAuthenticated" type="button" class="btn-signup" @click="handleLogout">
          {{ messages.logOut }}
        </button>
        <template v-else-if="hostedAppEnabled">
          <RouterLink :to="`/${locale}/auth/login`" class="btn-login">{{ messages.logIn }}</RouterLink>
          <RouterLink :to="`/${locale}/auth/signup?plan=enterprise`" class="btn-signup">
            {{ messages.launchApp }}
          </RouterLink>
        </template>
      </div>
    </div>
  </header>
</template>

<style scoped>
/* Same geometry as LandingNav and the dashboard TopBar: full-width bar, --shell-topbar-height, bottom border. */
.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: color-mix(in srgb, var(--color-surface) 88%, transparent);
  border-block-end: 1px solid var(--color-border);
}
.navbar.is-scrolled { backdrop-filter: blur(10px); }
@media (prefers-reduced-transparency: reduce) {
  .navbar.is-scrolled { backdrop-filter: none; background: var(--color-surface); }
}
.container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-6);
  block-size: var(--shell-topbar-height);
  padding-inline: var(--space-6);
}
.logo-wrap { display: flex; align-items: center; flex-shrink: 0; }
.logo {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
  border-radius: var(--r-sm);
  color: var(--color-text-primary);
  text-decoration: none;
}
.logo-text {
  font-size: 18px;
  font-weight: var(--font-weight-semibold);
  letter-spacing: -0.02em;
}
.nav-links { display: flex; align-items: center; gap: var(--space-1); }
.nav-links a {
  padding: var(--space-2) var(--space-3);
  border-radius: var(--r-sm);
  color: var(--color-text-secondary);
  font-size: var(--text-14);
  font-weight: var(--font-weight-medium);
  text-decoration: none;
}
.nav-links a:hover { color: var(--color-text-primary); background: var(--gray-3); }
.right-side { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
:deep(.locale-control select) {
  inline-size: 7.5rem;
  min-block-size: var(--header-control-h);
  padding-block: var(--space-1);
  font-size: var(--text-13);
}
.btn-login,
.btn-signup {
  display: inline-flex;
  align-items: center;
  min-block-size: var(--header-control-h);
  padding: 0 var(--space-3);
  border-radius: var(--r-sm);
  font-size: var(--text-13);
  font-weight: var(--font-weight-semibold);
  text-decoration: none;
}
.btn-login { color: var(--color-text-primary); border: 1px solid var(--color-border); background: transparent; }
.btn-login:hover { background: var(--gray-3); }
.btn-signup {
  border: 0;
  background: var(--button-primary-bg);
  color: var(--button-primary-fg);
  cursor: pointer;
}
@media (max-width: 1000px) { .nav-links { display: none; } }
@media (max-width: 640px) {
  .container { padding-inline: var(--space-3); gap: var(--space-2); }
  .right-side { gap: var(--space-1); }
  .btn-login { display: none; }
  :deep(.locale-control select) { inline-size: 5.75rem; }
}
@media (max-width: 400px) { .logo-text { display: none; } }
</style>
