<template>
  <section id="reviews" class="section">
    <div class="container">
      <div class="badge">What people say</div>
      <h2>Loved by teams building at scale</h2>

      <div class="reviews">
        <div class="review">
          <p>“Structura finally made our large monorepo understandable. Onboarding new engineers is dramatically faster, and we catch design issues before they hit production.”</p>
          <div class="author">
            <strong>Sarah Chen</strong>
            <span>Lead Engineer • NovaTech</span>
          </div>
        </div>

        <div class="review">
          <p>“The impact analysis feature alone has saved us from several risky changes. It gives us a clear view of exactly what we’re touching, before we touch it.”</p>
          <div class="author">
            <strong>Marcus Reid</strong>
            <span>Senior Frontend Developer</span>
          </div>
        </div>

        <div class="review">
          <p>“It feels like having an architecture expert next to every teammate. Clean, insightful, and genuinely useful from day one.”</p>
          <div class="author">
            <strong>Elena Voss</strong>
            <span>CTO • PixelForge</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.section {
  position: relative;
  padding: var(--space-32) var(--space-6);
  background: linear-gradient(180deg, color-mix(in srgb, var(--color-surface) var(--alpha-40), transparent), color-mix(in srgb, var(--color-surface) var(--alpha-70), transparent));
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

.reviews {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--space-6);
  text-align: left;
}

.review {
  position: relative;
  overflow: hidden;
  padding: var(--space-8) var(--space-6);
  border-radius: var(--radius-xl);
  border: 1px solid color-mix(in srgb, var(--color-accent-primary) var(--alpha-16), transparent);
  background: linear-gradient(180deg, color-mix(in srgb, var(--color-surface) var(--alpha-full), transparent), color-mix(in srgb, var(--color-surface) var(--alpha-90), transparent));
  box-shadow: var(--shadow-md);
}

.review::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-accent-primary) var(--alpha-70), transparent), transparent);
}

.review p {
  margin-bottom: var(--space-5);
  color: var(--color-text-primary);
  font-size: var(--font-size-md);
  line-height: var(--line-height-relaxed);
}

.author strong {
  display: block;
  margin-bottom: var(--space-1);
  font-size: var(--font-size-md);
}

.author span {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}

[data-theme='light'] .section {
  background: linear-gradient(180deg, color-mix(in srgb, var(--color-surface-raised) var(--alpha-40), transparent), color-mix(in srgb, var(--color-highlight) var(--alpha-32), transparent));
}

[data-theme='light'] .review {
  background: linear-gradient(180deg, color-mix(in srgb, var(--color-highlight) var(--alpha-full), transparent), color-mix(in srgb, var(--color-surface-raised) var(--alpha-90), transparent));
  border-color: color-mix(in srgb, var(--color-accent-primary) var(--alpha-16), transparent);
  box-shadow: var(--shadow-accent-glow);
}
</style>