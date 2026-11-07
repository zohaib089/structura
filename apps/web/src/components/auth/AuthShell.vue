<script setup lang="ts">
import BrandMark from '../brand/BrandMark.vue'
import { BRAND } from '../../../../../packages/brand/src/brand'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { isSupportedWebLocale } from '../../services/locale'
import { navigationMessages } from '../../services/navigation-messages'

const route = useRoute()
const tagline = computed(() => {
  const raw = route?.params.locale
  return navigationMessages(typeof raw === 'string' && isSupportedWebLocale(raw) ? raw : 'en').brandTagline
})

defineProps({
  eyebrow: {
    type: String,
    default: 'Access your workspace'
  },
  title: {
    type: String,
    default: 'Welcome back'
  },
  subtitle: {
    type: String,
    default: ''
  }
})
</script>

<template>
  <div class="auth-page">
    <div class="auth-shell">
      <aside class="brand-panel" :aria-label="BRAND.name">
        <div class="brand-panel__inner">
          <BrandMark :size="56" :title="BRAND.name" />
          <p class="wordmark">{{ BRAND.name }}</p>
          <p class="tagline">{{ tagline }}</p>
        </div>
      </aside>

      <main class="form-panel">
        <div class="form-panel__inner">
          <div class="form-topline">
            <span class="eyebrow">{{ eyebrow }}</span>
          </div>

          <slot name="top" />

          <div class="panel-header">
            <h1>{{ title }}</h1>
            <p v-if="subtitle">{{ subtitle }}</p>
          </div>

          <slot />
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  position: relative;
  isolation: isolate;
  width: 100%;
  min-height: calc(100vh - var(--shell-topbar-height, 48px));
  background: var(--gray-0);
  overflow: hidden;
}

.auth-shell {
  display: grid;
  grid-template-columns: minmax(16rem, 0.9fr) minmax(0, 1.2fr);
  width: 100%;
  min-height: inherit;
  border: none;
  border-radius: 0;
  box-shadow: none;
  background: transparent;
}

.brand-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(var(--space-8), 4.5vw, var(--space-16)) clamp(var(--space-6), 4.5vw, var(--space-12));
  background:
    radial-gradient(ellipse at 20% 15%, color-mix(in srgb, var(--color-brand-amber-ui) var(--alpha-16), transparent), transparent 42%),
    linear-gradient(165deg, var(--color-brand-navy-lift) 0%, var(--color-brand-navy) 48%, #0e1d38 100%);
  color: #dbe6f8;
  border-inline-end: 1px solid color-mix(in srgb, #2a4a80 var(--alpha-80), transparent);
}

.brand-panel__inner {
  display: grid;
  gap: var(--space-4);
  width: min(28rem, 100%);
}

.wordmark {
  margin: 0;
  color: #ffffff;
  font-size: clamp(var(--font-size-3xl), 3vw, var(--font-size-5xl));
  font-weight: var(--font-weight-extrabold);
  letter-spacing: var(--tracking-tighter);
  line-height: 1.1;
}

.tagline {
  margin: 0;
  color: #c3d3ee;
  line-height: var(--line-height-relaxed);
  font-size: var(--text-16);
}

.form-panel {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: clamp(var(--space-8), 4.5vw, var(--space-16)) clamp(var(--space-5), 4.5vw, var(--space-12));
  background: var(--gray-0);
}

.form-panel__inner {
  width: min(32rem, 100%);
}

.form-topline {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-brand-amber-ui);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-extrabold);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
}

.panel-header {
  margin-bottom: var(--space-5);
}

.panel-header h1 {
  margin: 0 0 var(--space-2);
  color: var(--gray-10);
  font-size: clamp(var(--text-24), 2.4vw, var(--text-32));
  letter-spacing: var(--tracking-tighter);
  line-height: 1.15;
}

.panel-header p {
  margin: 0;
  color: var(--gray-8);
  line-height: var(--line-height-relaxed);
}

[data-theme='light'] .auth-page,
[data-theme='light'] .form-panel {
  background: var(--gray-0);
}

[data-theme='light'] .brand-panel {
  background:
    radial-gradient(ellipse at 20% 15%, color-mix(in srgb, var(--color-brand-amber-ui) var(--alpha-12), transparent), transparent 42%),
    linear-gradient(165deg, #1b3a6b 0%, var(--color-brand-navy) 55%, #0e1d38 100%);
  border-inline-end-color: #2a4a80;
}

[data-theme='light'] .panel-header h1 {
  color: var(--gray-10);
}

[data-theme='light'] .panel-header p {
  color: var(--gray-8);
}

@media (max-width: 900px) {
  .auth-shell {
    grid-template-columns: 1fr;
  }

  .brand-panel {
    align-items: flex-start;
    min-height: auto;
    padding-block: var(--space-8);
    border-inline-end: none;
    border-block-end: 1px solid #2a4a80;
  }

  .form-panel {
    padding-block-start: var(--space-8);
  }
}

@media (max-width: 640px) {
  .brand-panel,
  .form-panel {
    padding-inline: var(--space-5);
  }

  .form-panel {
    padding-block: var(--space-6) var(--space-10);
  }
}

@media (prefers-reduced-motion: reduce) {
  .auth-page,
  .auth-shell,
  .brand-panel,
  .form-panel {
    transition: none;
  }
}
</style>
