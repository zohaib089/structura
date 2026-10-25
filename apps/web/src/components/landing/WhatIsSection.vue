<script setup lang="ts">
import { GitBranch, Map, Zap } from '@lucide/vue'
</script>

<template>
  <section id="what" class="section">
    <div class="container">
      <div class="badge">What is Structura</div>
      <h2>Your code has a structure.<br />Now you can finally see it.</h2>
      <p class="desc">
        Most teams lose time in hidden dependencies, scattered context, and the anxiety of changing one file
        without knowing the downstream impact. Structura gives every teammate a live, readable map of the system.
      </p>

      <div class="features">
        <div class="feature">
          <div class="icon"><Map :size="24" :stroke-width="1.8" /></div>
          <h3>Visual Map</h3>
          <p>Turn a sprawling repo into a navigable system graph with clear boundaries and relationships.</p>
        </div>
        <div class="feature">
          <div class="icon"><GitBranch :size="24" :stroke-width="1.8" /></div>
          <h3>Clear Connections</h3>
          <p>Instantly understand which modules, routes, services, and components depend on each other.</p>
        </div>
        <div class="feature">
          <div class="icon"><Zap :size="24" :stroke-width="1.8" /></div>
          <h3>Impact Preview</h3>
          <p>Before you merge, see which areas would be affected and reduce the risk of production surprises.</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.section {
  position: relative;
  z-index: 1;
  padding: var(--space-32) var(--space-6);
}

.section::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--color-accent-primary) var(--alpha-08), transparent), transparent 30%);
  pointer-events: none;
}

.container {
  position: relative;
  z-index: 1;
  max-width: var(--content-width);
  margin: 0 auto;
  text-align: center;
}

.badge {
  display: inline-block;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--color-accent-primary) var(--alpha-08), transparent);
  border: 1px solid color-mix(in srgb, var(--color-accent-primary) var(--alpha-16), transparent);
  color: var(--color-accent-primary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  margin-bottom: var(--space-5);
}

h2 {
  font-size: clamp(var(--font-size-4xl), 3vw, var(--font-size-6xl));
  line-height: var(--line-height-display);
  letter-spacing: var(--tracking-tighter);
  margin-bottom: var(--space-5);
}

.desc {
  max-width: var(--content-width-reading);
  margin: 0 auto var(--space-14);
  font-size: var(--font-size-lg);
  line-height: var(--line-height-relaxed);
  color: var(--color-text-secondary);
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--space-6);
}

.feature {
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, color-mix(in srgb, var(--color-surface) var(--alpha-90), transparent), color-mix(in srgb, var(--color-surface) var(--alpha-90), transparent));
  border: 1px solid color-mix(in srgb, var(--color-accent-primary) var(--alpha-16), transparent);
  border-radius: var(--radius-xl);
  padding: var(--space-8) var(--space-6);
  text-align: left;
  backdrop-filter: blur(18px);
  box-shadow: var(--shadow-md);
  transition: transform var(--duration-normal) ease, border-color var(--duration-normal) ease, box-shadow var(--duration-normal) ease;
}

.feature::before {
  content: '';
  position: absolute;
  inset: 0 auto auto 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-accent-primary) var(--alpha-70), transparent), transparent);
  opacity: 0;
  transition: opacity var(--duration-normal) ease;
}

.feature:hover {
  transform: translateY(-6px);
  border-color: color-mix(in srgb, var(--color-accent-primary) var(--alpha-32), transparent);
  box-shadow: var(--shadow-accent-glow);
}

.feature:hover::before {
  opacity: 1;
}

.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, color-mix(in srgb, var(--color-accent-primary) var(--alpha-12), transparent), color-mix(in srgb, var(--color-accent-secondary) var(--alpha-12), transparent));
  border: 1px solid color-mix(in srgb, var(--color-accent-primary) var(--alpha-16), transparent);
  font-size: var(--font-size-3xl);
  margin-bottom: var(--space-4);
}

.feature h3 {
  margin-bottom: var(--space-2);
  font-size: var(--font-size-xl);
  letter-spacing: var(--tracking-tight);
}

.feature p {
  color: var(--color-text-secondary);
  line-height: var(--line-height-relaxed);
  font-size: var(--font-size-md);
}

[data-theme='light'] .feature {
  background: linear-gradient(180deg, color-mix(in srgb, var(--color-highlight) var(--alpha-90), transparent), color-mix(in srgb, var(--color-surface-raised) var(--alpha-90), transparent));
  border-color: color-mix(in srgb, var(--color-accent-primary) var(--alpha-16), transparent);
  box-shadow: var(--shadow-accent-glow);
}
</style>