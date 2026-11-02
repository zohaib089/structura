<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  WEB_LOCALES,
  isSupportedWebLocale,
  readLocalePreference,
  resolvePreferredWebLocale
} from '../../services/locale'
import { navigationMessages } from '../../services/navigation-messages'

const route = useRoute()
const router = useRouter()

const locale = computed(() => {
  const routeLocale = route.params.locale
  if (typeof routeLocale === 'string' && isSupportedWebLocale(routeLocale)) return routeLocale
  return resolvePreferredWebLocale(readLocalePreference(), navigator.languages)
})

const messages = computed(() => navigationMessages(locale.value))

async function changeLocale(event: Event) {
  const target = event.target
  if (!(target instanceof HTMLSelectElement) || !isSupportedWebLocale(target.value)) return

  const currentLocale = route.params.locale
  const suffix = typeof currentLocale === 'string' && isSupportedWebLocale(currentLocale)
    ? route.path.slice(currentLocale.length + 1)
    : route.path === '/' ? '' : route.path

  await router.push({
    path: `/${target.value}${suffix}`,
    query: route.query,
    hash: route.hash
  })
}
</script>

<template>
  <label class="locale-control">
    <span class="sr-only">{{ messages.language }}</span>
    <select
      :value="locale"
      :aria-label="messages.language"
      @change="changeLocale"
    >
      <option v-for="item in WEB_LOCALES" :key="item.tag" :value="item.tag">
        {{ item.nativeName }}
      </option>
    </select>
  </label>
</template>

<style scoped>
.locale-control {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.locale-control::after {
  position: absolute;
  inset-inline-end: var(--space-3);
  width: 0.45rem;
  height: 0.45rem;
  border-inline-end: 1px solid var(--color-text-secondary);
  border-block-end: 1px solid var(--color-text-secondary);
  content: '';
  pointer-events: none;
  transform: translateY(-0.15rem) rotate(45deg);
}

select {
  appearance: none;
  max-width: 9rem;
  width: 9rem;
  min-height: 40px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  padding-block: var(--space-2);
  padding-inline-start: var(--space-3);
  padding-inline-end: var(--space-8);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font: inherit;
  cursor: pointer;
}

select:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}
</style>
