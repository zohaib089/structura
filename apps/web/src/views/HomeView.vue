<script setup lang="ts">
/**
 * HomeView - the advanced marketing landing (design: landing-advanced.md, D10).
 * Marketing route only: full-bleed bands, Nucleus brand, radial sample graph as the signature.
 */
import { onBeforeUnmount, onMounted, watch } from 'vue'
import LandingClosing from '../components/landing/LandingClosing.vue'
import LandingConnections from '../components/landing/LandingConnections.vue'
import LandingCoverage from '../components/landing/LandingCoverage.vue'
import LandingFooter from '../components/landing/LandingFooter.vue'
import LandingHero from '../components/landing/LandingHero.vue'
import LandingHow from '../components/landing/LandingHow.vue'
import LandingNav from '../components/landing/LandingNav.vue'
import LandingProof from '../components/landing/LandingProof.vue'
import LandingSelfHost from '../components/landing/LandingSelfHost.vue'
import { useToast } from '../composables/useToast'
import { useLandingCopy } from '../composables/useLandingCopy'

const copy = useLandingCopy()
import '../styles/landing.css'

const toast = useToast()
let previousTitle = ''
let metaDescription: HTMLMetaElement | null = null
let createdMeta = false
let previousDescription: string | null = null
let sampleToastTimer: ReturnType<typeof setTimeout> | undefined
let sampleToastId: string | undefined

onMounted(() => {
  previousTitle = document.title
  document.title = copy.documentTitle
  metaDescription = document.querySelector<HTMLMetaElement>('meta[name="description"]')
  if (!metaDescription) {
    metaDescription = document.createElement('meta')
    metaDescription.name = 'description'
    document.head.appendChild(metaDescription)
    createdMeta = true
  }
  previousDescription = metaDescription.getAttribute('content')
  metaDescription.setAttribute('content', copy.metaDescription)

  // "Sample project loaded" once the hero graph has drawn (instantly when motion is reduced).
  const reduced = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  watch(() => [copy.documentTitle, copy.metaDescription] as const, ([title, description]) => {
    document.title = title
    metaDescription?.setAttribute('content', description)
  })

  sampleToastTimer = setTimeout(() => {
    sampleToastId = toast.success(copy.toasts.sampleLoaded)
  }, reduced ? 200 : 1600)
})

onBeforeUnmount(() => {
  document.title = previousTitle
  if (metaDescription) {
    if (createdMeta) metaDescription.remove()
    else if (previousDescription !== null) metaDescription.setAttribute('content', previousDescription)
  }
  if (sampleToastTimer !== undefined) clearTimeout(sampleToastTimer)
  if (sampleToastId) toast.dismiss(sampleToastId)
})
</script>

<template>
  <div class="landing-page">
    <a class="landing-skip" href="#main">{{ copy.skipLink }}</a>
    <LandingNav />
    <main id="main">
      <LandingHero />
      <LandingProof />
      <LandingHow />
      <LandingConnections />
      <LandingCoverage />
      <LandingSelfHost />
      <LandingClosing />
    </main>
    <LandingFooter />
  </div>
</template>
