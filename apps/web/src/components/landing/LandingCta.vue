<script setup lang="ts">
/**
 * LandingCta - the one button pattern on the marketing page.
 *  amber   = the single marketing primary ("Try the viewer"). Marketing only.
 *  neutral = product-style primary (nav "Scan a project", self-host band).
 *  ghost   = secondary.
 * `to` starting with "/" is an in-app route; anything else is a plain link (hash or external).
 */
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    to: string
    variant?: 'amber' | 'neutral' | 'ghost'
    size?: 'sm' | 'md' | 'lg'
  }>(),
  { variant: 'ghost', size: 'md' }
)

const isRoute = computed(() => props.to.startsWith('/'))
const external = computed(() => /^https?:\/\//.test(props.to))
</script>

<template>
  <RouterLink v-if="isRoute" :to="to" class="landing-cta" :class="[`landing-cta--${variant}`, `landing-cta--${size}`]">
    <slot />
  </RouterLink>
  <a
    v-else
    :href="to"
    class="landing-cta"
    :class="[`landing-cta--${variant}`, `landing-cta--${size}`]"
    :rel="external ? 'noopener noreferrer' : undefined"
  >
    <slot />
  </a>
</template>

<style scoped>
.landing-cta {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  block-size: 40px;
  padding-inline: 18px;
  border: 1px solid transparent;
  border-radius: var(--r-md);
  font-size: var(--text-14);
  font-weight: var(--font-weight-semibold);
  line-height: 1;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background var(--dur-2) var(--easing-product),
    border-color var(--dur-2) var(--easing-product),
    transform var(--dur-1) var(--easing-product);
}
.landing-cta:active {
  transform: translateY(1px);
}
.landing-cta--sm {
  block-size: 32px;
  padding-inline: 14px;
  font-size: var(--text-13);
}
.landing-cta--lg {
  block-size: 48px;
  padding-inline: var(--space-6);
  font-size: 15px;
}
.landing-cta--amber {
  background: var(--color-brand-amber-ui);
  color: var(--color-on-brand-amber);
}
.landing-cta--amber:hover {
  background: #ecb257;
}
.landing-cta--neutral {
  background: var(--button-primary-bg);
  color: var(--button-primary-fg);
}
.landing-cta--neutral:hover {
  background: var(--button-primary-hover-bg);
}
.landing-cta--ghost {
  background: transparent;
  color: var(--gray-10);
  border-color: var(--gray-5);
}
.landing-cta--ghost:hover {
  background: var(--gray-3);
  border-color: var(--gray-7);
}
.landing-cta :deep(svg) {
  inline-size: 16px;
  block-size: 16px;
  flex: none;
}

@media (max-width: 640px) {
  .landing-cta--lg {
    flex: 1 1 100%;
    justify-content: center;
  }
}
</style>
