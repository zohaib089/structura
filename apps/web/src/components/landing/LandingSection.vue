<script setup lang="ts">
/**
 * LandingSection - a full-bleed band. Padding only; the inner `.landing-measure` keeps text at ~1120px.
 * Optional `tone`: default canvas, `raised` (gray-1 strip) or `navy` (self-host band).
 */
withDefaults(defineProps<{ labelledby: string; tone?: 'default' | 'raised' | 'navy' }>(), { tone: 'default' })
</script>

<template>
  <section class="landing-band" :class="`landing-band--${tone}`" :aria-labelledby="labelledby">
    <div class="landing-measure"><slot /></div>
  </section>
</template>

<style scoped>
.landing-band {
  position: relative;
  isolation: isolate;
  padding: clamp(72px, 8vw, 112px) var(--landing-pad);
  border-block-start: 1px solid var(--gray-4);
}
/* A soft navy wash at the top of each band, echoing the hero's glow without competing with it. */
.landing-band::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  z-index: -1;
  block-size: min(420px, 60%);
  pointer-events: none;
  background: radial-gradient(60% 100% at 50% 0%, color-mix(in srgb, var(--color-brand-navy) 22%, transparent) 0%, transparent 70%);
}
.landing-band--raised {
  background: var(--gray-1);
}
.landing-band--navy {
  background:
    radial-gradient(50% 80% at 85% 20%, color-mix(in srgb, var(--color-brand-amber-ui) 8%, transparent) 0%, transparent 70%),
    linear-gradient(170deg, var(--color-brand-navy) 0%, var(--landing-navy-deep) 100%);
  border-block-start-color: var(--landing-navy-line);
}
.landing-band--navy::before {
  display: none;
}
.landing-measure {
  max-inline-size: var(--landing-measure);
  margin-inline: auto;
}
</style>
