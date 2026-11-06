<script setup lang="ts">
import BrandMark from '../brand/BrandMark.vue'
import { BRAND } from '../../../../../packages/brand/src/brand'

export interface SidebarNavItem {
  id: string
  label: string
  to: string
  active: boolean
}

defineProps<{
  workspaceName: string
  navItems: SidebarNavItem[]
  appNavigationLabel: string
  workspaceLabel: string
}>()

defineEmits<{
  openWorkspaceMenu: []
}>()
</script>

<template>
  <aside class="sidebar">
    <div class="brand-row">
      <BrandMark :size="22" />
      <div class="brand-copy">
        <span class="product-name">{{ BRAND.name }}</span>
        <button type="button" class="workspace-trigger" @click="$emit('openWorkspaceMenu')">
          <span class="workspace-label">{{ workspaceLabel }}</span>
          <span class="workspace-name" role="heading" aria-level="2">{{ workspaceName }}</span>
        </button>
      </div>
    </div>

    <nav class="sidebar-nav" :aria-label="appNavigationLabel">
      <RouterLink
        v-for="item in navItems"
        :key="item.id"
        :to="item.to"
        class="nav-link"
        :class="{ active: item.active }"
        :aria-current="item.active ? 'page' : undefined"
      >
        {{ item.label }}
      </RouterLink>
    </nav>

    <div class="sidebar-footer">
      <slot name="footer" />
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  max-width: var(--shell-sidebar-width);
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding: var(--space-4) var(--space-3);
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
}

.brand-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
}

.brand-copy {
  display: grid;
  gap: var(--space-1);
  min-width: 0;
}

.product-name {
  font-size: var(--text-14);
  line-height: var(--text-14-lh);
  font-weight: var(--font-weight-semibold);
  letter-spacing: -0.01em;
}

.workspace-trigger {
  display: grid;
  gap: 0;
  padding: var(--space-1) var(--space-2);
  margin-inline-start: calc(-1 * var(--space-2));
  border: 0;
  border-radius: var(--r-sm);
  background: transparent;
  color: inherit;
  text-align: start;
  cursor: pointer;
}

.workspace-trigger:hover {
  background: var(--gray-3);
}

.workspace-label {
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
  color: var(--color-text-muted);
}

.workspace-name {
  font-size: var(--text-13);
  line-height: var(--text-13-lh);
  font-weight: var(--font-weight-medium);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-nav {
  display: grid;
  gap: var(--space-1);
}

.nav-link {
  position: relative;
  display: block;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--r-sm);
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: var(--text-14);
  line-height: var(--text-14-lh);
  font-weight: var(--font-weight-medium);
}

.nav-link:hover {
  background: var(--gray-3);
  color: var(--color-text-primary);
}

.nav-link.active {
  background: var(--gray-3);
  color: var(--color-text-primary);
}

.nav-link.active::before {
  content: '';
  position: absolute;
  inset-block: var(--space-1);
  inset-inline-start: 0;
  width: 2px;
  border-radius: var(--r-full);
  background: var(--color-brand-amber-ui);
}

.sidebar-footer {
  margin-top: auto;
  padding-top: var(--space-4);
  display: grid;
  gap: var(--space-2);
}
</style>
