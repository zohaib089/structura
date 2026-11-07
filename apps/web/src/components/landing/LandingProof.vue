<script setup lang="ts">
import { Code, Monitor, Tag, UserX } from '@lucide/vue'
import type { Component } from 'vue'
import { useLandingCopy } from '../../composables/useLandingCopy'

const copy = useLandingCopy()

const icons: Record<string, Component> = { monitor: Monitor, user: UserX, code: Code, tag: Tag }
</script>

<template>
  <section class="landing-proof" :aria-label="copy.proof.label">
    <ul>
      <li v-for="item in copy.proof.items" :key="item.title">
        <component :is="icons[item.icon]" :size="22" aria-hidden="true" />
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
  border-block-start: 1px solid var(--gray-4);
  background: var(--gray-1);
}
ul {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  margin: 0;
  padding: 0;
  list-style: none;
}
li {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 26px var(--landing-pad);
  border-inline-start: 1px solid var(--gray-4);
}
li:first-child {
  border-inline-start: 0;
}
li > svg {
  flex: none;
  margin-block-start: 2px;
  color: var(--color-brand-amber-ui);
}
b {
  display: block;
  color: var(--gray-10);
  font-size: 15px;
  font-weight: var(--font-weight-semibold);
}
span {
  display: block;
  margin-block-start: 2px;
  color: var(--gray-8);
  font-size: var(--text-13);
  line-height: 1.5;
}

@media (max-width: 1100px) {
  ul {
    grid-template-columns: repeat(2, 1fr);
  }
  li:nth-child(3) {
    border-inline-start: 0;
  }
  li:nth-child(n + 3) {
    border-block-start: 1px solid var(--gray-4);
  }
}
@media (max-width: 640px) {
  ul {
    grid-template-columns: 1fr;
  }
  li {
    border-inline-start: 0;
    border-block-start: 1px solid var(--gray-4);
  }
  li:first-child {
    border-block-start: 0;
  }
}
</style>
