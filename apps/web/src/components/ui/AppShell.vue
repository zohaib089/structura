<script setup lang="ts">
import Sidebar, { type SidebarNavItem } from './Sidebar.vue'
import TopBar from './TopBar.vue'
import type { BreadcrumbItem } from './Breadcrumbs.vue'

defineProps<{
  workspaceName: string
  navItems: SidebarNavItem[]
  breadcrumbs: BreadcrumbItem[]
  appNavigationLabel: string
  workspaceLabel: string
  skipToContentLabel: string
  commandPaletteLabel: string
  commandPaletteHint: string
}>()
</script>

<template>
  <div class="app-shell">
    <a class="skip-link" href="#app-main-content">{{ skipToContentLabel }}</a>
    <Sidebar
      :workspace-name="workspaceName"
      :nav-items="navItems"
      :app-navigation-label="appNavigationLabel"
      :workspace-label="workspaceLabel"
      @open-workspace-menu="$emit('openWorkspaceMenu')"
    >
      <template #footer>
        <slot name="sidebar-footer" />
      </template>
    </Sidebar>

    <div class="shell-main">
      <TopBar
        :breadcrumbs="breadcrumbs"
        :command-palette-label="commandPaletteLabel"
        :command-palette-hint="commandPaletteHint"
      >
        <template #actions>
          <slot name="top-actions" />
        </template>
      </TopBar>
      <main id="app-main-content" class="shell-content" tabindex="-1">
        <slot />
      </main>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  emits: ['openWorkspaceMenu']
}
</script>

<style scoped>
.app-shell {
  display: grid;
  grid-template-columns: var(--shell-sidebar-width) minmax(0, 1fr);
  min-height: 100vh;
  background: var(--color-canvas);
  color: var(--color-text-primary);
}

.shell-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.shell-content {
  flex: 1;
  width: 100%;
  min-width: 0;
  padding: var(--space-5) var(--space-6);
}

.skip-link {
  position: absolute;
  inset-inline-start: var(--space-3);
  top: var(--space-3);
  z-index: var(--z-skip-link, 60);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--r-sm);
  background: var(--color-surface-raised);
  color: var(--color-text-primary);
  text-decoration: none;
  transform: translateY(-200%);
  transition: transform var(--dur-1) var(--easing-product);
}

.skip-link:focus {
  transform: translateY(0);
}
</style>
