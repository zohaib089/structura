<template>
  <section class="section">
    <div class="container">
      <p class="label">Trusted by forward-thinking teams</p>
      <div class="logos">
        <div class="logo">NovaTech</div>
        <div class="logo">PixelForge</div>
        <div class="logo">CloudSpire</div>
        <div class="logo">ByteLab</div>
        <div class="logo">Aether Systems</div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.section {
  padding: var(--space-20) var(--space-6);
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

.container {
  max-width: var(--content-width-compact);
  margin: 0 auto;
  text-align: center;
}

.label {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  margin-bottom: var(--space-8);
}

.logos {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-12);
}

.logo {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
  opacity: 0.7;
  letter-spacing: var(--tracking-wide);
}
</style>