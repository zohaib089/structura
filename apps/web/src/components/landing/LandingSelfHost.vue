<script setup lang="ts">
import { Check } from '@lucide/vue'
import { useLandingLinks } from '../../composables/useLandingLinks'
import { useLandingCopy } from '../../composables/useLandingCopy'
import GithubMark from './GithubMark.vue'
import LandingCta from './LandingCta.vue'
import LandingSection from './LandingSection.vue'

const copy = useLandingCopy()

const links = useLandingLinks()
</script>

<template>
  <LandingSection id="self-host" labelledby="landing-sh-h" tone="navy">
    <div class="sh">
      <div>
        <p class="landing-kicker">{{ copy.selfHost.kicker }}</p>
        <h2 id="landing-sh-h" class="landing-h2">{{ copy.selfHost.title }}</h2>
        <p class="landing-lead">{{ copy.selfHost.lead }}</p>
        <ul class="sh__list">
          <li v-for="bullet in copy.selfHost.bullets" :key="bullet"><Check :size="20" aria-hidden="true" />{{ bullet }}</li>
        </ul>
        <div class="sh__ctas">
          <LandingCta :to="links.selfHostDocs" variant="neutral" size="lg">{{ copy.cta.selfHostGuide }}</LandingCta>
          <LandingCta :to="links.repo" variant="ghost" size="lg"><GithubMark />{{ copy.cta.github }}</LandingCta>
        </div>
      </div>
      <div class="sh__term" role="group" :aria-label="copy.selfHost.terminalLabel">
        <div class="sh__term-head"><span>{{ copy.selfHost.terminalBadge }}</span><span>{{ copy.selfHost.terminalTitle }}</span></div>
        <pre><span v-for="line in copy.selfHost.terminalLines" :key="line.comment" class="sh__group"><span class="sh__comment">{{ line.comment }}</span><span class="sh__command">{{ line.command }}</span></span></pre>
      </div>
    </div>
  </LandingSection>
</template>

<style scoped>
.sh {
  display: grid;
  grid-template-columns: 6fr 5fr;
  gap: clamp(32px, 6vw, 96px);
  align-items: center;
}
.sh__list {
  display: grid;
  gap: var(--space-3);
  margin: 28px 0 32px;
  padding: 0;
  list-style: none;
}
.sh__list li {
  display: flex;
  gap: var(--space-3);
  color: var(--landing-navy-text);
  font-size: var(--text-16);
}
.sh__list svg {
  flex: none;
  margin-block-start: 2px;
  color: var(--color-brand-amber-ui);
}
.sh__ctas {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}
.sh__ctas :deep(.landing-cta--ghost) {
  border-color: var(--landing-navy-ring);
  color: #fff;
}
.sh__ctas :deep(.landing-cta--ghost:hover) {
  background: rgb(255 255 255 / 0.08);
  border-color: var(--landing-navy-accent);
}
.sh__term {
  overflow: hidden;
  border: 1px solid var(--landing-navy-line);
  border-radius: 10px;
  background: var(--landing-navy-deep);
}
.sh__term-head {
  display: flex;
  justify-content: space-between;
  padding: 10px 14px;
  border-block-end: 1px solid var(--landing-navy-line);
  color: var(--landing-navy-accent);
  font: 500 11px var(--landing-font-mono);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
pre {
  margin: 0;
  padding: 16px 18px;
  overflow-x: auto;
  color: var(--gray-10);
  font: 400 13.5px/1.8 var(--landing-font-mono);
}
.sh__group,
.sh__comment,
.sh__command {
  display: block;
}
.sh__group + .sh__group {
  margin-block-start: 1.8em;
}
.sh__comment {
  color: var(--landing-navy-comment);
}

@media (max-width: 900px) {
  .sh {
    grid-template-columns: 1fr;
  }
}
</style>
