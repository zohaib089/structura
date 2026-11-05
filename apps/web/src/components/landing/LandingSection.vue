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
  padding: clamp(64px, 9vw, 128px) var(--landing-pad);
  border-block-start: 1px solid var(--gray-4);
}
.landing-band--raised {
  background: var(--gray-1);
}
.landing-band--navy {
  background: var(--color-brand-navy);
  border-block-start-color: var(--landing-navy-line);
}
.landing-measure {
  max-inline-size: var(--landing-measure);
  margin-inline: auto;
}
</style>
