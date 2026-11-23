<script setup lang="ts">
import { Code, Monitor, Tag, UserX } from '@lucide/vue'
import type { Component } from 'vue'
import { useLandingCopy } from '../../composables/useLandingCopy'

const copy = useLandingCopy()

const icons: Record<string, Component> = { monitor: Monitor, user: UserX, code: Code, tag: Tag }
</script>

<template>
  <section class="landing-proof" :aria-label="copy.proof.label">
    <ul class="landing-proof__grid">
      <li v-for="item in copy.proof.items" :key="item.title" class="landing-card">
        <span class="landing-proof__icon"><component :is="icons[item.icon]" :size="18" aria-hidden="true" /></span>
        <div>
          <b>{{ item.title }}</b>
          <span>{{ item.body }}</span>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.landing-proof {
  padding: clamp(28px, 3vw, 40px) var(--landing-pad);
  border-block-start: 1px solid var(--gray-4);
  background: var(--gray-1);
}
.landing-proof__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-4);
  max-inline-size: var(--landing-measure);
  margin: 0 auto;
  padding: 0;
  list-style: none;
}
li {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 18px 20px;
  border-radius: 12px;
}
.landing-proof__icon {
  display: grid;
  flex: none;
  place-items: center;
  inline-size: 36px;
  block-size: 36px;
  border: 1px solid color-mix(in srgb, var(--color-brand-amber-ui) 35%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--color-brand-amber-ui) 10%, transparent);
  color: var(--color-brand-amber-ui);
}
b {
  display: block;
  color: var(--gray-10);
  font-size: 15px;
  font-weight: var(--font-weight-semibold);
  line-height: 1.35;
}
span:not(.landing-proof__icon) {
  display: block;
  margin-block-start: 4px;
  color: var(--gray-8);
  font-size: var(--text-13);
  line-height: 1.5;
}

@media (max-width: 1100px) {
  .landing-proof__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 640px) {
  .landing-proof__grid {
    grid-template-columns: 1fr;
    gap: var(--space-3);
  }
  li {
    padding: 14px 16px;
  }
}
</style>
