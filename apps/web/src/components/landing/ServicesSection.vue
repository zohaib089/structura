<script setup lang="ts">
import { BrainCircuit, GitBranch, Network, ShieldCheck, Sparkles, Workflow } from '@lucide/vue'
</script>

<template>
  <section id="services" class="section">
    <div class="container">
      <div class="badge">What you get</div>
      <h2>Everything needed to navigate a modern codebase</h2>

      <div class="grid">
        <div class="card">
          <span class="service-icon"><Network :size="22" :stroke-width="1.8" /></span>
          <h3>Architecture Graph</h3>
          <p>Explore a live map of modules, flows, and responsibilities without losing the big picture.</p>
        </div>
        <div class="card">
          <span class="service-icon"><GitBranch :size="22" :stroke-width="1.8" /></span>
          <h3>Dependency Tracking</h3>
          <p>See who depends on what and where hidden coupling is creating risk across the system.</p>
        </div>
        <div class="card">
          <span class="service-icon"><Workflow :size="22" :stroke-width="1.8" /></span>
          <h3>Change Impact Analysis</h3>
          <p>Before you edit, understand the blast radius and reduce accidental regressions with confidence.</p>
        </div>
        <div class="card">
          <span class="service-icon"><ShieldCheck :size="22" :stroke-width="1.8" /></span>
          <h3>Code Quality Signals</h3>
          <p>Identify patterns that create technical debt and surface opportunities to simplify software design.</p>
        </div>
        <div class="card">
          <span class="service-icon"><BrainCircuit :size="22" :stroke-width="1.8" /></span>
          <h3>AI-powered Explanations</h3>
          <p>Ask plain-language questions and get a grounded understanding of architecture, flows, and intent.</p>
        </div>
        <div class="card">
          <span class="service-icon"><Sparkles :size="22" :stroke-width="1.8" /></span>
          <h3>Knowledge Base</h3>
          <p>Keep architecture decisions, diagrams, and useful context attached to the parts of the system they describe.</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.section {
  position: relative;
  padding: var(--space-32) var(--space-6);
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
  margin-bottom: var(--space-4);
}

h2 {
  font-size: clamp(var(--font-size-4xl), 3vw, var(--font-size-6xl));
  line-height: var(--line-height-display);
  letter-spacing: var(--tracking-tighter);
  margin-bottom: var(--space-14);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
  gap: var(--space-6);
  text-align: left;
}

.card {
  position: relative;
  overflow: hidden;
  padding: var(--space-6) var(--space-6) var(--space-6);
  border-radius: var(--radius-xl);
  background: linear-gradient(180deg, color-mix(in srgb, var(--color-surface) var(--alpha-full), transparent), color-mix(in srgb, var(--color-surface) var(--alpha-90), transparent));
  border: 1px solid color-mix(in srgb, var(--color-accent-primary) var(--alpha-16), transparent);
  box-shadow: var(--shadow-md);
  transition: transform var(--duration-normal) ease, border-color var(--duration-normal) ease;
}

.card::before {
  content: '';
  position: absolute;
  inset: 0 auto auto 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, color-mix(in srgb, var(--color-accent-primary) var(--alpha-08), transparent), transparent 40%, color-mix(in srgb, var(--color-accent-secondary) var(--alpha-08), transparent));
  pointer-events: none;
}

.card:hover {
  transform: translateY(-5px);
  border-color: color-mix(in srgb, var(--color-accent-primary) var(--alpha-24), transparent);
}

.service-icon {
  position: relative;
  z-index: 1;
  display: inline-grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--color-accent-primary) var(--alpha-20), transparent);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--color-accent-primary) var(--alpha-08), transparent);
  color: var(--color-accent-primary);
  margin-bottom: var(--space-4);
}

.card h3 {
  position: relative;
  z-index: 1;
  margin-bottom: var(--space-3);
  font-size: var(--font-size-xl);
  letter-spacing: var(--tracking-tight);
}

.card p {
  position: relative;
  z-index: 1;
  color: var(--color-text-secondary);
  line-height: var(--line-height-relaxed);
  font-size: var(--font-size-md);
}

[data-theme='light'] .card {
  background: linear-gradient(180deg, color-mix(in srgb, var(--color-highlight) var(--alpha-full), transparent), color-mix(in srgb, var(--color-surface-raised) var(--alpha-90), transparent));
  border-color: color-mix(in srgb, var(--color-accent-primary) var(--alpha-16), transparent);
  box-shadow: var(--shadow-accent-glow);
}

[data-theme='light'] .card::before {
  background: linear-gradient(135deg, color-mix(in srgb, var(--color-accent-primary) var(--alpha-12), transparent), transparent 40%, color-mix(in srgb, var(--color-accent-secondary) var(--alpha-12), transparent));
}
</style>