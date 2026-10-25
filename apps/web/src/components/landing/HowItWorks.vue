<template>
  <section id="how" class="section">
    <div class="container">
      <div class="badge">How it works</div>
      <h2>Simple workflow. Powerful outcomes.</h2>
      <p class="desc">
        Structura helps your team move from uncertainty to clarity without adding more ceremony.
      </p>

      <div class="steps">
        <div class="step">
          <div class="number">1</div>
          <h3>Connect your project</h3>
          <p>Bring in your repo or workspace and let Structura map your app structure across files, modules, and teams.</p>
        </div>

        <div class="step">
          <div class="number">2</div>
          <h3>Analyze the architecture</h3>
          <p>It detects patterns, dependencies, key pathways, and risk points automatically so you can get context quickly.</p>
        </div>

        <div class="step">
          <div class="number">3</div>
          <h3>Act with confidence</h3>
          <p>Explore a live, visual system map, trace impact before changes, and help everyone understand the codebase.</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.section {
  position: relative;
  padding: var(--space-32) var(--space-6);
  background: linear-gradient(180deg, color-mix(in srgb, var(--color-surface) var(--alpha-60), transparent), color-mix(in srgb, var(--color-surface) var(--alpha-32), transparent));
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
  margin-bottom: var(--space-3);
}

.desc {
  color: var(--color-text-secondary);
  font-size: var(--font-size-lg);
  line-height: var(--line-height-relaxed);
  margin-bottom: var(--space-14);
}

.steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-6);
  text-align: left;
}

.step {
  position: relative;
  padding: var(--space-8) var(--space-6) var(--space-6);
  border-radius: var(--radius-xl);
  border: 1px solid color-mix(in srgb, var(--color-accent-primary) var(--alpha-16), transparent);
  background: linear-gradient(180deg, color-mix(in srgb, var(--color-surface) var(--alpha-full), transparent), color-mix(in srgb, var(--color-surface) var(--alpha-90), transparent));
  backdrop-filter: blur(16px);
  box-shadow: var(--shadow-md);
  transition: transform var(--duration-normal) ease, border-color var(--duration-normal) ease;
}

.step:hover {
  transform: translateY(-4px);
  border-color: color-mix(in srgb, var(--color-accent-primary) var(--alpha-24), transparent);
}

.number {
  width: 46px;
  height: 46px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-4);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-extrabold);
  background: var(--color-accent-gradient);
  color: var(--color-text-on-accent);
  box-shadow: var(--shadow-accent-glow);
}

.step h3 {
  margin-bottom: var(--space-2);
  font-size: var(--font-size-xl);
  letter-spacing: var(--tracking-tight);
}

.step p {
  color: var(--color-text-secondary);
  font-size: var(--font-size-md);
  line-height: var(--line-height-relaxed);
}

[data-theme='light'] .section {
  background: linear-gradient(180deg, color-mix(in srgb, var(--color-surface-raised) var(--alpha-50), transparent), color-mix(in srgb, var(--color-highlight) var(--alpha-32), transparent));
}

[data-theme='light'] .step {
  background: linear-gradient(180deg, color-mix(in srgb, var(--color-highlight) var(--alpha-90), transparent), color-mix(in srgb, var(--color-surface-raised) var(--alpha-90), transparent));
  border-color: color-mix(in srgb, var(--color-accent-primary) var(--alpha-16), transparent);
  box-shadow: var(--shadow-accent-glow);
}
</style>