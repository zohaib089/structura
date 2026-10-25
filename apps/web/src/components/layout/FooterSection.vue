<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { getCurrentSession } from '../../services/auth'

const route = useRoute()
const isAuthenticated = computed(() => Boolean(route.fullPath) && getCurrentSession() !== null)
</script>

<template>
  <footer class="footer">
    <div class="container">
      <div class="top">
        <div class="brand-block">
          <div class="logo">
            <div class="logo-mark" aria-hidden="true"></div>
            <span>Structura</span>
          </div>
          <p>See your code architecture clearly and help every team move with confidence.</p>
          <div v-if="!isAuthenticated" class="cta-row">
            <RouterLink to="/auth/signup?plan=enterprise" class="cta-btn">Request access</RouterLink>
          </div>
        </div>

        <div class="links">
          <div class="col">
            <h4>Product</h4>
            <a href="#what">What is it</a>
            <a href="#how">How it works</a>
            <a href="#services">Services</a>
            <a href="#reviews">Reviews</a>
          </div>
          <div class="col">
            <h4>Company</h4>
            <a href="#contact">Contact</a>
            <template v-if="!isAuthenticated">
              <RouterLink to="/auth/login">Log in</RouterLink>
              <RouterLink to="/auth/signup">Sign up</RouterLink>
              <RouterLink to="/auth/verify-email">Verify email</RouterLink>
            </template>
          </div>
          <div class="col">
            <h4>Resources</h4>
            <a href="#">Documentation</a>
            <a href="#">Security</a>
            <a href="#">Privacy</a>
            <a href="#">Status</a>
          </div>
        </div>
      </div>

      <div class="bottom">
        <p>© 2026 Structura. Built for teams shipping complex software.</p>
        <div class="meta-links">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Support</a>
        </div>
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