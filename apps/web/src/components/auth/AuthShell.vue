<script setup lang="ts">
import type { PropType } from 'vue';
import { BrainCircuit, GitBranch, ShieldCheck, Sparkles } from '@lucide/vue'
import type { AuthCoreMessages } from '../../services/auth-core-messages'

type AccountType = 'individual' | 'enterprise'
type AuthPromoMessages = Pick<
  AuthCoreMessages,
  | 'individualAccess'
  | 'enterpriseAccess'
  | 'promoTitle'
  | 'promoDescription'
  | 'mapFeatureTitle'
  | 'mapFeatureDescription'
  | 'onboardingFeatureTitle'
  | 'onboardingFeatureDescription'
  | 'contextFeatureTitle'
  | 'contextFeatureDescription'
>

defineProps({
  accountType: {
    type: String as PropType<AccountType>,
    default: 'individual'
  },
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
  },
  promoMessages: {
    type: Object as PropType<AuthPromoMessages>,
    default: () => ({
      individualAccess: 'Individual access',
      enterpriseAccess: 'Enterprise access',
      promoTitle: 'Ship faster with architecture clarity.',
      promoDescription: 'Map dependencies, understand system impact, and give every teammate shared context before they touch production.',
      mapFeatureTitle: 'Real-time system maps',
      mapFeatureDescription: 'Live dependency understanding for even the most complex stacks.',
      onboardingFeatureTitle: 'Secure team onboarding',
      onboardingFeatureDescription: 'Verification and sign-in codes delivered securely to your inbox.',
      contextFeatureTitle: 'AI-powered context',
      contextFeatureDescription: 'Ask questions and get answers grounded in your codebase.'
    })
  }
})
</script>

<template>
  <div class="auth-page">
    <div class="auth-shell">
      <aside class="promo-panel">
        <div class="promo-mark" aria-hidden="true"><GitBranch :size="22" :stroke-width="1.8" /></div>
        <div class="promo-badge"><Sparkles :size="14" />{{ accountType === 'enterprise' ? promoMessages.enterpriseAccess : promoMessages.individualAccess }}</div>
        <h2>{{ promoMessages.promoTitle }}</h2>
        <p>
          {{ promoMessages.promoDescription }}
        </p>

        <div class="feature-list">
          <div class="feature-item">
            <span class="feature-icon"><GitBranch :size="18" /></span>
            <div>
              <strong>{{ promoMessages.mapFeatureTitle }}</strong>
              <small>{{ promoMessages.mapFeatureDescription }}</small>
            </div>
          </div>
          <div class="feature-item">
            <span class="feature-icon"><ShieldCheck :size="18" /></span>
            <div>
              <strong>{{ promoMessages.onboardingFeatureTitle }}</strong>
              <small>{{ promoMessages.onboardingFeatureDescription }}</small>
            </div>
          </div>
          <div class="feature-item">
            <span class="feature-icon"><BrainCircuit :size="18" /></span>
            <div>
              <strong>{{ promoMessages.contextFeatureTitle }}</strong>
              <small>{{ promoMessages.contextFeatureDescription }}</small>
            </div>
          </div>
        </div>
      </aside>

      <main class="form-panel">
        <div class="form-topline">
          <span class="eyebrow"><Sparkles :size="14" />{{ eyebrow }}</span>
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
  grid-template-columns: 1.05fr 1.35fr;
  width: min(1180px, 100%);
  margin: 0 auto;
  border-radius: var(--radius-2xl);
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--color-accent-primary) var(--alpha-16), transparent);
  background: color-mix(in srgb, var(--color-surface) var(--alpha-80), transparent);
  box-shadow: var(--shadow-lg), var(--shadow-accent-glow);
  backdrop-filter: blur(24px);
  animation: auth-arrive var(--duration-entrance) var(--easing-emphasized) both;
}

@keyframes auth-arrive {
  from {
    opacity: 0;
    transform: translateY(18px) scale(0.99);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 920px) {
  .auth-page {
    padding-top: var(--space-32);
  }
}

.promo-panel {
  position: relative;
  overflow: hidden;
  padding: var(--space-10) var(--space-8);
  background: linear-gradient(180deg, color-mix(in srgb, var(--color-surface) var(--alpha-full), transparent), color-mix(in srgb, var(--color-surface) var(--alpha-80), transparent));
  border-right: 1px solid color-mix(in srgb, var(--color-accent-primary) var(--alpha-12), transparent);
}

.promo-panel::after {
  position: absolute;
  right: -6rem;
  bottom: -7rem;
  width: 20rem;
  aspect-ratio: 1;
  border: 1px solid color-mix(in srgb, var(--color-accent-primary) var(--alpha-12), transparent);
  border-radius: 50%;
  box-shadow: 0 0 0 2rem color-mix(in srgb, var(--color-accent-primary) var(--alpha-04), transparent), 0 0 0 4rem color-mix(in srgb, var(--color-accent-secondary) var(--alpha-04), transparent);
  content: '';
  pointer-events: none;
}

.promo-mark {
  display: grid;
  width: 46px;
  height: 46px;
  margin-bottom: var(--space-5);
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--color-accent-primary) var(--alpha-24), transparent);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--color-accent-primary) var(--alpha-08), transparent);
  color: var(--color-accent-primary);
  box-shadow: var(--shadow-accent-glow);
  animation: mark-float var(--duration-float) ease-in-out infinite;
}

@keyframes mark-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

.promo-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-extrabold);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  background: color-mix(in srgb, var(--color-accent-primary) var(--alpha-08), transparent);
  border: 1px solid color-mix(in srgb, var(--color-accent-primary) var(--alpha-16), transparent);
  color: var(--color-accent-primary);
}

.promo-panel h2 {
  margin: var(--space-5) 0 var(--space-3);
  font-size: clamp(var(--font-size-3xl), 3vw, var(--font-size-5xl));
  line-height: var(--line-height-display);
  letter-spacing: var(--tracking-tighter);
}

.promo-panel p {
  color: var(--color-text-secondary);
  line-height: var(--line-height-relaxed);
  margin-bottom: var(--space-6);
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.feature-item {
  position: relative;
  z-index: 1;
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
  padding: var(--space-3) var(--space-4);
  border: 1px solid color-mix(in srgb, var(--color-accent-primary) var(--alpha-08), transparent);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--color-accent-primary) var(--alpha-04), transparent);
  transition: transform var(--duration-normal) var(--easing-emphasized), border-color var(--duration-normal) ease, background var(--duration-normal) ease;
}

.feature-item:hover {
  transform: translateX(4px);
  border-color: color-mix(in srgb, var(--color-accent-primary) var(--alpha-24), transparent);
  background: color-mix(in srgb, var(--color-accent-primary) var(--alpha-08), transparent);
}

.feature-icon {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--color-accent-primary) var(--alpha-16), transparent);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-accent-primary) var(--alpha-08), transparent);
  color: var(--color-accent-primary);
}

.feature-item strong {
  display: block;
  margin-bottom: var(--space-1);
  font-size: var(--font-size-md);
}

.feature-item small {
  display: block;
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

.form-topline .eyebrow :deep(svg) {
  color: var(--color-accent-secondary);
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
  box-shadow: var(--shadow-accent-glow);
}

[data-theme='light'] .promo-panel {
  background: linear-gradient(180deg, color-mix(in srgb, var(--color-surface-raised) var(--alpha-full), transparent), color-mix(in srgb, var(--color-surface-raised) var(--alpha-80), transparent));
}

[data-theme='light'] .form-panel {
  background: color-mix(in srgb, var(--color-highlight) var(--alpha-70), transparent);
}

[data-theme='light'] .feature-item {
  background: color-mix(in srgb, var(--color-highlight) var(--alpha-60), transparent);
  border-color: color-mix(in srgb, var(--color-surface) var(--alpha-04), transparent);
}

@media (max-width: 920px) {
  .auth-shell {
    grid-template-columns: 1fr;
  }

  .promo-panel {
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

  .promo-panel,
  .form-panel {
    padding-left: var(--space-5);
    padding-right: var(--space-5);
  }

  .promo-panel {
    padding-top: var(--space-6);
    padding-bottom: var(--space-6);
  }
}

@media (prefers-reduced-motion: reduce) {
  .auth-shell,
  .promo-mark {
    animation: none;
  }

  .feature-item {
    transition: none;
  }
}
</style>
