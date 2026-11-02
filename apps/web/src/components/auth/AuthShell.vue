<script setup lang="ts">
import BrandMark from '../brand/BrandMark.vue'
import { BRAND } from '../../../../../packages/brand/src/brand'

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
        <BrandMark :size="56" :title="BRAND.name" />
        <p class="wordmark">{{ BRAND.name }}</p>
        <p class="tagline">{{ BRAND.tagline }}</p>
      </aside>

      <main class="form-panel">
        <div class="form-topline">
          <span class="eyebrow">{{ eyebrow }}</span>
        </div>

        <slot name="top" />

        <div class="panel-header">
          <h1>{{ title }}</h1>
          <p v-if="subtitle">{{ subtitle }}</p>
        </div>

        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  position: relative;
  isolation: isolate;
  width: 100%;
  min-height: 100vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: var(--space-40) var(--space-4) var(--space-8);
  overflow: hidden;
  background:
    radial-gradient(ellipse at 12% 18%, color-mix(in srgb, var(--color-accent-primary) var(--alpha-12), transparent), transparent 36%),
    radial-gradient(ellipse at 90% 82%, color-mix(in srgb, var(--color-accent-secondary) var(--alpha-12), transparent), transparent 34%);
}

.auth-page::before {
  position: absolute;
  z-index: -1;
  inset: 0;
  background-image: radial-gradient(color-mix(in srgb, var(--color-accent-primary) var(--alpha-16), transparent) 1px, transparent 1px);
  background-size: 30px 30px;
  content: '';
  mask-image: linear-gradient(135deg, black, transparent 65%);
  opacity: 0.25;
}

.auth-shell {
  position: relative;
  display: grid;
  grid-template-columns: minmax(16rem, 0.85fr) minmax(0, 1.35fr);
  width: min(980px, 100%);
  margin: 0 auto;
  border-radius: var(--radius-2xl);
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--color-accent-primary) var(--alpha-16), transparent);
  background: color-mix(in srgb, var(--color-surface) var(--alpha-80), transparent);
  box-shadow: var(--shadow-lg), var(--shadow-accent-glow);
  backdrop-filter: blur(24px);
}

.brand-panel {
  display: grid;
  align-content: center;
  gap: var(--space-4);
  padding: var(--space-10) var(--space-8);
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--color-surface) var(--alpha-full), transparent),
    color-mix(in srgb, var(--color-surface) var(--alpha-80), transparent)
  );
  border-right: 1px solid color-mix(in srgb, var(--color-accent-primary) var(--alpha-12), transparent);
}

.wordmark {
  margin: 0;
  font-size: clamp(var(--font-size-3xl), 3vw, var(--font-size-5xl));
  font-weight: var(--font-weight-extrabold);
  letter-spacing: var(--tracking-tighter);
}

.tagline {
  margin: 0;
  color: var(--color-text-secondary);
  line-height: var(--line-height-relaxed);
}

.form-panel {
  position: relative;
  z-index: 1;
  padding: var(--space-10) var(--space-8) var(--space-8);
  background: color-mix(in srgb, var(--color-surface) var(--alpha-70), transparent);
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
  color: var(--color-accent-primary);
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
  font-size: clamp(var(--font-size-3xl), 2.4vw, var(--font-size-5xl));
  letter-spacing: var(--tracking-tighter);
}

.panel-header p {
  color: var(--color-text-secondary);
  line-height: var(--line-height-relaxed);
}

[data-theme='light'] .auth-shell {
  background: color-mix(in srgb, var(--color-highlight) var(--alpha-70), transparent);
  border-color: color-mix(in srgb, var(--color-surface) var(--alpha-08), transparent);
}

[data-theme='light'] .brand-panel {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--color-surface-raised) var(--alpha-full), transparent),
    color-mix(in srgb, var(--color-surface-raised) var(--alpha-80), transparent)
  );
}

[data-theme='light'] .form-panel {
  background: color-mix(in srgb, var(--color-highlight) var(--alpha-70), transparent);
}

@media (max-width: 920px) {
  .auth-page {
    padding-top: var(--space-32);
  }

  .auth-shell {
    grid-template-columns: 1fr;
  }

  .brand-panel {
    border-right: none;
    border-bottom: 1px solid color-mix(in srgb, var(--color-accent-primary) var(--alpha-12), transparent);
  }
}

@media (max-width: 640px) {
  .auth-page {
    padding-top: var(--space-24);
  }

  .auth-shell {
    border-radius: var(--radius-xl);
  }

  .brand-panel,
  .form-panel {
    padding-left: var(--space-5);
    padding-right: var(--space-5);
  }
}
</style>
