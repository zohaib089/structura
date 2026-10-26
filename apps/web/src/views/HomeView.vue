<script setup lang="ts">
import Navbar from '../components/layout/Navbar.vue'
import FooterSection from '../components/layout/FooterSection.vue'
import HeroSection from '../components/landing/HeroSection.vue'
import QuickstartSection from '../components/landing/QuickstartSection.vue'
import HonestSection from '../components/landing/HonestSection.vue'
import CoverageSection from '../components/landing/CoverageSection.vue'
import DriftSection from '../components/landing/DriftSection.vue'
import HowItWorks from '../components/landing/HowItWorks.vue'
import LimitsSection from '../components/landing/LimitsSection.vue'

import { onMounted, onUnmounted, ref } from 'vue'

const motionReady = ref(false)
let revealObserver: IntersectionObserver | undefined

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return

  motionReady.value = true
  revealObserver = new IntersectionObserver((entries, observer) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      entry.target.classList.add('is-visible')
      observer.unobserve(entry.target)
    }
  }, { threshold: 0.12 })

  document.querySelectorAll<HTMLElement>('.landing-page > section:not(.hero)').forEach((section) => {
    revealObserver?.observe(section)
  })
})

onUnmounted(() => revealObserver?.disconnect())
</script>

<template>
  <div class="landing-page" :class="{ 'motion-ready': motionReady }">
    <Navbar />
    <HeroSection />
    <QuickstartSection />
    <HonestSection />
    <CoverageSection />
    <DriftSection />
    <HowItWorks />
    <LimitsSection />
    <FooterSection />
  </div>
</template>

<style scoped>
.landing-page.motion-ready > section:not(.hero) {
  opacity: 0;
  transform: translateY(24px);
  transition:
    opacity 700ms var(--easing-emphasized),
    transform 700ms var(--easing-emphasized);
}

.landing-page.motion-ready > section:not(.hero).is-visible {
  opacity: 1;
  transform: translateY(0);
}

.landing-page.motion-ready > section:not(.hero).is-visible :deep(.card) {
  animation: card-arrive 600ms var(--easing-emphasized) both;
}

.landing-page.motion-ready > section:not(.hero).is-visible :deep(.card:nth-child(2)) {
  animation-delay: 80ms;
}

.landing-page.motion-ready > section:not(.hero).is-visible :deep(.card:nth-child(3)) {
  animation-delay: 160ms;
}

.landing-page.motion-ready > section:not(.hero).is-visible :deep(.card:nth-child(4)) {
  animation-delay: 240ms;
}

@keyframes card-arrive {
  from {
    opacity: 0;
    transform: translateY(12px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .landing-page.motion-ready > section:not(.hero),
  .landing-page.motion-ready > section:not(.hero).is-visible :deep(.card) {
    animation: none;
    opacity: 1;
    transform: none;
    transition: none;
  }
}
</style>