<script setup lang="ts">
import Sidebar, { type SidebarNavItem } from './Sidebar.vue'
import TopBar from './TopBar.vue'
import type { BreadcrumbItem } from './Breadcrumbs.vue'

withDefaults(
  defineProps<{
    workspaceName: string
    navItems: SidebarNavItem[]
    breadcrumbs: BreadcrumbItem[]
    appNavigationLabel: string
    workspaceLabel: string
    skipToContentLabel: string
    commandPaletteLabel: string
    commandPaletteHint: string
    /** Graph routes fill the content pane edge-to-edge (mock `.content.flush`). */
    flushContent?: boolean
    /** Keep shell padding but lock the pane height so embedded graph can flex-fill. */
    fillContent?: boolean
  }>(),
  { flushContent: false, fillContent: false }
)
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
      <main
        id="app-main-content"
        class="shell-content"
        :class="{
          'shell-content--flush': flushContent,
          'shell-content--fill': fillContent && !flushContent
        }"
        tabindex="-1"
      >
        <div class="shell-content-body">
          <slot />
        </div>
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
  align-items: stretch;
  width: 100%;
  height: 100dvh;
  max-height: 100dvh;
  overflow: hidden;
  background: var(--color-canvas);
  color: var(--color-text-primary);
}

.shell-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.shell-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  width: 100%;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  padding: var(--space-5) var(--space-6);
}

.shell-content-body {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
}

.shell-content--flush {
  padding: 0;
  overflow: hidden;
}

.shell-content--fill {
  overflow: hidden;
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
