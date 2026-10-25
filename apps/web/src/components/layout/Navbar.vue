<script setup lang="ts">
import { Moon, Sun } from '@lucide/vue';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useThemeStore } from '../../stores/theme';
import LocaleSwitcher from './LocaleSwitcher.vue'
import { LOCALE_PREFERENCE_KEY, isSupportedWebLocale, resolvePreferredWebLocale } from '../../services/locale'
import { navigationMessages } from '../../services/navigation-messages'
import { getCurrentSession, logoutUser } from '../../services/auth'

const route = useRoute()
const router = useRouter()
const themeStore = useThemeStore()

const locale = computed(() => {
  const routeLocale = route.params.locale
  if (typeof routeLocale === 'string' && isSupportedWebLocale(routeLocale)) return routeLocale
  return resolvePreferredWebLocale(localStorage.getItem(LOCALE_PREFERENCE_KEY), navigator.languages)
})
const messages = computed(() => navigationMessages(locale.value))
const showLandingLinks = computed(() => route.name === 'home' || route.name === 'localized-home')
const isAuthenticated = computed(() =>
  Boolean(route.fullPath) && getCurrentSession() !== null
)

async function handleLogout() {
  const result = await logoutUser()
  await router.push({
    path: `/${locale.value}/auth/login`,
    query: result.success ? {} : { notice: result.message }
  })
}
</script>

<template>
  <header class="navbar">
    <div class="container">
      <div class="logo-wrap">
        <RouterLink :to="`/${locale}`" class="logo" :aria-label="messages.home">
          <div class="logo-icon" aria-label="Structura logo">
            <span class="logo-mark"></span>
          </div>
          <span class="logo-text">Structura</span>
        </RouterLink>
      </div>

      <nav v-if="showLandingLinks" class="nav-links" :aria-label="messages.mainNavigation">
        <a href="#what">{{ messages.whatIsIt }}</a>
        <a href="#how">{{ messages.howItWorks }}</a>
        <a href="#services">{{ messages.services }}</a>
        <a href="#reviews">{{ messages.reviews }}</a>
        <a href="#contact">{{ messages.contact }}</a>
      </nav>

      <div class="right-side">
        <LocaleSwitcher />

        <button class="theme-btn" @click="themeStore.toggleTheme" :aria-label="messages.toggleTheme">
          <Sun v-if="themeStore.theme === 'dark'" :size="18" />
          <Moon v-else :size="18" />
        </button>

        <button v-if="isAuthenticated" type="button" class="btn-signup" @click="handleLogout">
          {{ messages.logOut }}
        </button>
        <template v-else>
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
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding: var(--space-4) var(--space-3) 0;
  pointer-events: none;
}

.container {
  width: calc(100% - 28px);
  max-width: none;
  margin: 0 auto;
  padding: var(--space-3) var(--space-5);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-6);
  border: 1px solid color-mix(in srgb, var(--color-accent-primary) var(--alpha-16), transparent);
  border-radius: var(--radius-2xl);
  background: linear-gradient(135deg, color-mix(in srgb, var(--color-surface) var(--alpha-90), transparent), color-mix(in srgb, var(--color-surface) var(--alpha-70), transparent));
  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);
  box-shadow: var(--shadow-md);
  pointer-events: auto;
}

.logo-wrap {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  text-decoration: none;
  color: inherit;
}

.logo-icon {
  position: relative;
  width: 42px;
  height: 42px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, color-mix(in srgb, var(--color-accent-primary) var(--alpha-20), transparent), color-mix(in srgb, var(--color-accent-secondary) var(--alpha-20), transparent));
  border: 1px solid color-mix(in srgb, var(--color-accent-primary) var(--alpha-32), transparent);
  box-shadow: var(--shadow-accent-glow);
}

.logo-mark {
  position: relative;
  width: 18px;
  height: 18px;
  border-radius: var(--radius-sm);
  border: 2px solid color-mix(in srgb, var(--color-highlight) var(--alpha-90), transparent);
  border-left-color: color-mix(in srgb, var(--color-accent-primary) var(--alpha-90), transparent);
  border-bottom-color: color-mix(in srgb, var(--color-accent-secondary) var(--alpha-90), transparent);
  transform: rotate(45deg);
  box-shadow: var(--shadow-accent-glow);
}

.logo-mark::before {
  content: '';
  position: absolute;
  inset: 4px 4px 4px 4px;
  border-radius: var(--radius-sm);
  border: 1px solid color-mix(in srgb, var(--color-highlight) var(--alpha-80), transparent);
  border-left-color: transparent;
  border-top-color: transparent;
}

.logo-text {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-primary);
  letter-spacing: var(--tracking-tighter);
}

.nav-links {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-6);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--color-accent-primary) var(--alpha-04), transparent);
  border: 1px solid color-mix(in srgb, var(--color-accent-primary) var(--alpha-08), transparent);
}

.nav-links a {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--tracking-wide);
  transition: color var(--duration-normal) ease, transform var(--duration-normal) ease;
}

.nav-links a:hover {
  color: var(--color-accent-primary);
  transform: translateY(-1px);
}

.right-side {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}

.theme-btn {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  border: 1px solid color-mix(in srgb, var(--color-accent-primary) var(--alpha-16), transparent);
  background: color-mix(in srgb, var(--color-accent-primary) var(--alpha-04), transparent);
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--duration-normal) ease;
}

.theme-btn:hover {
  border-color: color-mix(in srgb, var(--color-accent-primary) var(--alpha-50), transparent);
  box-shadow: var(--shadow-accent-glow);
  transform: translateY(-1px);
}

.btn-login {
  padding: var(--space-2) var(--space-3);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  border-radius: var(--radius-sm);
  transition: all var(--duration-normal) ease;
}

.btn-login:hover {
  color: var(--color-accent-primary);
  background: color-mix(in srgb, var(--color-accent-primary) var(--alpha-04), transparent);
}

.btn-signup {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--color-accent-gradient-soft);
  color: var(--color-text-on-accent);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-extrabold);
  box-shadow: var(--shadow-accent-glow);
  transition: all var(--duration-normal) ease;
}

.btn-signup:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-secondary-glow);
}

[data-theme='light'] .container {
  background: linear-gradient(135deg, color-mix(in srgb, var(--color-highlight) var(--alpha-90), transparent), color-mix(in srgb, var(--color-surface-raised) var(--alpha-90), transparent));
  border-color: color-mix(in srgb, var(--color-surface) var(--alpha-08), transparent);
  box-shadow: var(--shadow-accent-glow);
}

[data-theme='light'] .nav-links {
  background: color-mix(in srgb, var(--color-highlight) var(--alpha-70), transparent);
  border-color: color-mix(in srgb, var(--color-surface) var(--alpha-04), transparent);
}

[data-theme='light'] .nav-links a,
[data-theme='light'] .btn-login {
  color: var(--color-text-primary);
}

[data-theme='light'] .theme-btn,
[data-theme='light'] .btn-login:hover {
  background: color-mix(in srgb, var(--color-highlight) var(--alpha-70), transparent);
}

[data-theme='light'] .logo-icon {
  background: linear-gradient(135deg, color-mix(in srgb, var(--color-accent-primary) var(--alpha-12), transparent), color-mix(in srgb, var(--color-accent-secondary) var(--alpha-12), transparent));
  border-color: color-mix(in srgb, var(--color-accent-primary) var(--alpha-20), transparent);
}

[data-theme='light'] .logo-mark {
  border-color: color-mix(in srgb, var(--color-surface) var(--alpha-90), transparent);
  border-left-color: color-mix(in srgb, var(--color-accent-primary) var(--alpha-90), transparent);
  border-bottom-color: color-mix(in srgb, var(--color-accent-secondary) var(--alpha-90), transparent);
}

[data-theme='light'] .logo-mark::before {
  border-color: color-mix(in srgb, var(--color-surface) var(--alpha-70), transparent);
}

@media (max-width: 1000px) {
  .nav-links {
    display: none;
  }
}

@media (max-width: 640px) {
  .navbar {
    padding: var(--space-3) var(--space-3) 0;
  }

  .container {
    width: calc(100% - 12px);
    padding: var(--space-3) var(--space-3);
    gap: var(--space-3);
  }

  .logo-text {
    font-size: var(--font-size-md);
  }

  .btn-login {
    display: none;
  }

  .right-side {
    gap: var(--space-1);
  }

  :deep(.locale-control select) {
    width: 5.75rem;
  }

  .btn-signup {
    padding: var(--space-2) var(--space-2);
  }
}
</style>