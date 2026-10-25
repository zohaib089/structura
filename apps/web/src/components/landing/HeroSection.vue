<script setup lang="ts">
import { ArrowRight, Sparkles } from '@lucide/vue'
import { onMounted, ref } from 'vue'
import { checkBackend } from '../../services/api'

const isBackendOnline = ref(false)
const isLoaded = ref(false)

onMounted(async () => {
  setTimeout(() => {
    isLoaded.value = true
  }, 100)

  const data = await checkBackend()
  isBackendOnline.value = !!data
})
</script>

<template>
  <section class="hero" :class="{ loaded: isLoaded }">
    <div class="hero-grid"></div>
    <div class="glow glow-1"></div>
    <div class="glow glow-2"></div>

    <div class="hero-inner">
      <div class="left">
        <div class="badge">
          <Sparkles :size="14" />
          <span>Unlock architecture clarity</span>
        </div>

        <h1>
          See the system behind the code.<br />
          <span class="gradient">Build with confidence.</span>
        </h1>

        <p class="subtitle">
          Structura turns sprawling repos into readable, living system maps. Understand dependencies,
          spot risks before they become breakages, and help every teammate move faster with shared context.
        </p>

        <div class="actions">
          <a href="#contact" class="btn primary">
            Get Early Access
            <ArrowRight :size="18" />
          </a>
          <a href="#how" class="btn secondary">See how it works</a>
        </div>

        <div class="meta-row">
          <div class="meta-card">
            <strong>2.1x</strong>
            <span>faster onboarding</span>
          </div>
          <div class="meta-card">
            <strong>92%</strong>
            <span>fewer blind spots</span>
          </div>
          <div class="meta-card">
            <strong>24/7</strong>
            <span>system intelligence</span>
          </div>
        </div>

        <div class="status" :class="{ online: isBackendOnline }">
          <span class="dot"></span>
          {{ isBackendOnline ? 'System Online' : 'System Offline' }}
        </div>
      </div>

      <div class="right">
        <div class="graph-container">
          <div class="center-node">
            <div class="center-core">Structura</div>
          </div>

          <div class="orbit-node node-1"><span>components</span></div>
          <div class="orbit-node node-2"><span>services</span></div>
          <div class="orbit-node node-3"><span>stores</span></div>
          <div class="orbit-node node-4"><span>views</span></div>
          <div class="orbit-node node-5"><span>utils</span></div>
          <div class="orbit-node node-6"><span>api</span></div>
          <div class="orbit-node node-7"><span>hooks</span></div>
          <div class="orbit-node node-8"><span>types</span></div>

          <div class="ring ring-1"></div>
          <div class="ring ring-2"></div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  padding: var(--space-36) var(--space-8) var(--space-24);
  overflow: hidden;
  opacity: 0;
  transform: translateY(18px);
  transition: all var(--duration-entrance) var(--easing-emphasized);
}

.hero.loaded {
  opacity: 1;
  transform: translateY(0);
}

.hero-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(color-mix(in srgb, var(--color-accent-primary) var(--alpha-04), transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--color-accent-primary) var(--alpha-04), transparent) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: radial-gradient(circle at center, black 45%, transparent 100%);
  opacity: 0.5;
}

.glow {
  position: absolute;
  border-radius: var(--radius-full);
  filter: blur(110px);
  pointer-events: none;
}

.glow-1 {
  width: 600px;
  height: 600px;
  right: -40px;
  top: -120px;
  background: color-mix(in srgb, var(--color-accent-primary) var(--alpha-20), transparent);
}

.glow-2 {
  width: 420px;
  height: 420px;
  left: -80px;
  bottom: -30px;
  background: color-mix(in srgb, var(--color-accent-secondary) var(--alpha-16), transparent);
}

.hero-inner {
  position: relative;
  z-index: 1;
  max-width: var(--content-width-wide);
  margin: 0 auto;
  width: 100%;
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: var(--space-16);
  align-items: center;
}

.left {
  max-width: var(--content-width-narrow);
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--color-accent-primary) var(--alpha-08), transparent);
  border: 1px solid color-mix(in srgb, var(--color-accent-primary) var(--alpha-16), transparent);
  color: var(--color-accent-primary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
  margin-bottom: var(--space-6);
  box-shadow: var(--shadow-md);
}

[data-theme='light'] .badge {
  background: color-mix(in srgb, var(--color-accent-primary) var(--alpha-08), transparent);
  border-color: color-mix(in srgb, var(--color-accent-primary) var(--alpha-20), transparent);
  box-shadow: var(--shadow-md);
}

h1 {
  margin: 0 0 var(--space-5);
  font-size: clamp(var(--font-size-5xl), 5vw, var(--font-size-7xl));
  line-height: var(--line-height-display);
  letter-spacing: var(--tracking-display);
  font-weight: var(--font-weight-extrabold);
}

.gradient {
  display: inline-block;
  background: var(--color-accent-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  max-width: var(--content-width-copy);
  font-size: var(--font-size-md);
  line-height: var(--line-height-relaxed);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-8);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-6);
  border-radius: var(--radius-full);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-bold);
  transition: transform var(--duration-normal) ease, box-shadow var(--duration-normal) ease, border-color var(--duration-normal) ease;
}

.btn.primary {
  background: var(--color-accent-gradient-soft);
  color: var(--color-text-on-accent);
  box-shadow: var(--shadow-accent-glow);
}

.btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-secondary-glow);
}

.btn.secondary {
  background: color-mix(in srgb, var(--color-surface) var(--alpha-40), transparent);
  border: 1px solid color-mix(in srgb, var(--color-accent-primary) var(--alpha-20), transparent);
  color: var(--color-text-primary);
}

.btn.secondary:hover {
  border-color: color-mix(in srgb, var(--color-accent-primary) var(--alpha-40), transparent);
  transform: translateY(-2px);
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
}

.meta-card {
  min-width: 150px;
  padding: var(--space-3) var(--space-3);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--color-surface) var(--alpha-40), transparent);
  border: 1px solid color-mix(in srgb, var(--color-accent-primary) var(--alpha-12), transparent);
  box-shadow: var(--shadow-md);
}

[data-theme='light'] .meta-card,
[data-theme='light'] .status,
[data-theme='light'] .btn.secondary {
  background: color-mix(in srgb, var(--color-highlight) var(--alpha-80), transparent);
  border-color: color-mix(in srgb, var(--color-surface) var(--alpha-08), transparent);
  box-shadow: var(--shadow-accent-glow);
}

[data-theme='light'] .status,
[data-theme='light'] .meta-card span,
[data-theme='light'] .btn.secondary {
  color: var(--color-text-primary);
}

.meta-card strong {
  display: block;
  color: var(--color-text-primary);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-extrabold);
  margin-bottom: var(--space-1);
}

.meta-card span {
  display: block;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  letter-spacing: var(--tracking-wide);
}

.status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--color-surface) var(--alpha-40), transparent);
  border: 1px solid color-mix(in srgb, var(--color-accent-primary) var(--alpha-16), transparent);
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-xs);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-danger);
  box-shadow: var(--shadow-danger-glow);
}

.status.online .dot {
  background: var(--color-success);
  box-shadow: var(--shadow-success-glow);
  animation: pulse var(--duration-pulse) infinite;
}

.right {
  display: flex;
  justify-content: center;
}

.graph-container {
  position: relative;
  width: 440px;
  height: 440px;
  border-radius: 50%;
  background: radial-gradient(circle at center, color-mix(in srgb, var(--color-surface) var(--alpha-90), transparent), color-mix(in srgb, var(--color-surface) var(--alpha-70), transparent) 55%, color-mix(in srgb, var(--color-surface) var(--alpha-90), transparent));
  border: 1px solid color-mix(in srgb, var(--color-accent-primary) var(--alpha-12), transparent);
  box-shadow: var(--shadow-accent-glow);
}

[data-theme='light'] .graph-container {
  background: radial-gradient(circle at center, color-mix(in srgb, var(--color-highlight) var(--alpha-full), transparent), color-mix(in srgb, var(--color-surface-raised) var(--alpha-90), transparent) 54%, color-mix(in srgb, var(--color-accent-primary) var(--alpha-90), transparent));
  border-color: color-mix(in srgb, var(--color-accent-primary) var(--alpha-16), transparent);
  box-shadow: var(--shadow-accent-glow);
}

.center-node {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 196px;
  height: 196px;
  border-radius: 50%;
  background: radial-gradient(circle at center, color-mix(in srgb, var(--color-accent-primary) var(--alpha-20), transparent), color-mix(in srgb, var(--color-accent-secondary) var(--alpha-16), transparent) 28%, color-mix(in srgb, var(--color-surface) var(--alpha-90), transparent) 72%);
  border: 1px solid color-mix(in srgb, var(--color-accent-primary) var(--alpha-32), transparent);
  box-shadow: var(--shadow-accent-glow);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

[data-theme='light'] .center-node {
  background: radial-gradient(circle at center, color-mix(in srgb, var(--color-accent-primary) var(--alpha-12), transparent), color-mix(in srgb, var(--color-accent-secondary) var(--alpha-12), transparent) 30%, color-mix(in srgb, var(--color-highlight) var(--alpha-full), transparent) 75%);
  border-color: color-mix(in srgb, var(--color-accent-primary) var(--alpha-20), transparent);
  box-shadow: var(--shadow-accent-glow);
}

.center-core {
  width: 128px;
  height: 128px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  background: color-mix(in srgb, var(--color-surface) var(--alpha-90), transparent);
  border: 1px solid color-mix(in srgb, var(--color-accent-primary) var(--alpha-16), transparent);
  color: var(--color-text-primary);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-extrabold);
  letter-spacing: var(--tracking-tighter);
  box-shadow: var(--shadow-md);
}

[data-theme='light'] .center-core {
  background: color-mix(in srgb, var(--color-highlight) var(--alpha-full), transparent);
  border-color: color-mix(in srgb, var(--color-surface) var(--alpha-08), transparent);
  color: var(--color-text-primary);
  box-shadow: var(--shadow-md);
}

.orbit-node {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 82px;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--color-surface) var(--alpha-80), transparent);
  border: 1px solid color-mix(in srgb, var(--color-accent-primary) var(--alpha-12), transparent);
  box-shadow: var(--shadow-md);
  color: var(--color-text-primary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  text-transform: lowercase;
  letter-spacing: var(--tracking-wider);
  backdrop-filter: blur(12px);
  animation: float var(--duration-float) ease-in-out infinite;
}

[data-theme='light'] .orbit-node {
  background: color-mix(in srgb, var(--color-highlight) var(--alpha-80), transparent);
  border-color: color-mix(in srgb, var(--color-accent-primary) var(--alpha-16), transparent);
  color: var(--color-text-primary);
  box-shadow: var(--shadow-accent-glow);
}

.node-1 { top: 12%; left: 18%; }
.node-2 { top: 10%; right: 18%; animation-delay: var(--delay-400ms); }
.node-3 { top: 32%; right: 6%; animation-delay: var(--delay-1000ms); }
.node-4 { bottom: 18%; right: 10%; animation-delay: var(--delay-1500ms); }
.node-5 { bottom: 8%; left: 18%; animation-delay: var(--delay-800ms); }
.node-6 { left: 8%; bottom: 30%; animation-delay: var(--delay-1300ms); }
.node-7 { top: 48%; left: 2%; animation-delay: var(--delay-1800ms); }
.node-8 { top: 50%; right: 2%; animation-delay: var(--delay-300ms); }

.ring {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--color-accent-primary) var(--alpha-20), transparent);
  box-shadow: var(--shadow-accent-glow);
}

[data-theme='light'] .ring {
  border-color: color-mix(in srgb, var(--color-accent-primary) var(--alpha-24), transparent);
  box-shadow: var(--shadow-accent-glow);
}

.ring-1 {
  width: 330px;
  height: 330px;
  animation: rotate var(--duration-orbit) linear infinite;
}

.ring-2 {
  width: 260px;
  height: 260px;
  border-color: color-mix(in srgb, var(--color-accent-secondary) var(--alpha-20), transparent);
  animation: rotateReverse var(--duration-orbit-reverse) linear infinite;
}

@keyframes rotate {
  0% { transform: translate(-50%, -50%) rotate(0deg); }
  100% { transform: translate(-50%, -50%) rotate(360deg); }
}

@keyframes rotateReverse {
  0% { transform: translate(-50%, -50%) rotate(360deg); }
  100% { transform: translate(-50%, -50%) rotate(0deg); }
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.18); }
}

@media (max-width: 980px) {
  .hero {
    padding-top: var(--space-32);
  }

  .hero-inner {
    grid-template-columns: 1fr;
    gap: var(--space-8);
  }

  .left {
    max-width: 100%;
  }

  .graph-container {
    width: 360px;
    height: 360px;
  }
}

@media (max-width: 640px) {
  .hero {
    padding: var(--space-32) var(--space-4) var(--space-16);
  }

  .actions {
    flex-direction: column;
    align-items: stretch;
  }

  .btn {
    width: 100%;
  }

  .graph-container {
    width: 300px;
    height: 300px;
  }

  .center-node {
    width: 160px;
    height: 160px;
  }

  .center-core {
    width: 102px;
    height: 102px;
    font-size: var(--font-size-md);
  }
}
</style>