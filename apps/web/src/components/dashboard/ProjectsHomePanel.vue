<script setup lang="ts">
/**
 * Projects home — edge-to-edge table + workspace-scoped recent scans strip.
 * Projects are workspace labels; workspace_scans have no project_id, so this UI
 * never invents per-project scan/finding columns.
 */
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ChevronRight } from '@lucide/vue'
import type { Project } from '../../services/workspaces'
import { listScans, type Scan } from '../../api/scans'
import { dashboardMessages } from '../../services/dashboard-messages'
import { scanMessages } from '../../services/scan-messages'
import type { WebLocale } from '../../services/locale'
import {
  openProjectPath,
  projectGraphPath,
  scanReportPath,
  workspaceScansPath
} from '../../services/dashboard-routes'
import Button from '../ui/Button.vue'
import EmptyState from '../ui/EmptyState.vue'
import ErrorState from '../ui/ErrorState.vue'
import StatusPill from '../ui/StatusPill.vue'
import Table from '../ui/Table.vue'
import SkeletonTableRows from '../ui/skeleton/SkeletonTableRows.vue'

const props = defineProps<{
  locale: WebLocale
  workspaceId: string
  workspaceName: string
  projects: Project[]
  loading: boolean
  error: string
  canCreate: boolean
  search: string
  projectName: string
  projectDescription: string
  submitting: boolean
}>()

const emit = defineEmits<{
  'update:search': [value: string]
  'update:projectName': [value: string]
  'update:projectDescription': [value: string]
  retry: []
  create: []
}>()

const messages = computed(() => dashboardMessages(props.locale))
const scanCopy = computed(() => scanMessages(props.locale))
const createOpen = ref(false)
const recentScans = ref<Scan[]>([])
const recentLoading = ref(false)
const recentError = ref('')

const filteredProjects = computed(() => {
  const q = props.search.trim().toLocaleLowerCase(props.locale)
  if (!q) return props.projects
  return props.projects.filter(project => {
    const hay = `${project.name}\n${project.description}`.toLocaleLowerCase(props.locale)
    return hay.includes(q)
  })
})

function formatDate(value: string) {
  return new Intl.DateTimeFormat(props.locale, { dateStyle: 'medium' }).format(new Date(value))
}

function formatScanWhen(value: string) {
  return new Intl.DateTimeFormat(props.locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value)
  )
}

async function loadRecentScans() {
  if (!props.workspaceId) return
  recentLoading.value = true
  recentError.value = ''
  try {
    const scans = await listScans(props.workspaceId)
    recentScans.value = [...scans]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 5)
  } catch (cause) {
    recentError.value = cause instanceof Error ? cause.message : scanCopy.value.loadScansError
  } finally {
    recentLoading.value = false
  }
}

onMounted(() => {
  void loadRecentScans()
})
</script>

<template>
  <section class="projects-home" data-testid="projects-home" :aria-label="messages.projects">
    <header class="projects-home__header">
      <div class="projects-home__titles">
        <p class="eyebrow">{{ messages.workspaceOverview }}</p>
        <h1>{{ messages.projects }}</h1>
        <p class="projects-home__blurb">{{ messages.projectsBlurb }}</p>
      </div>
      <div class="projects-home__actions">
        <RouterLink
          class="projects-home__cta"
          :to="openProjectPath(locale, workspaceId)"
          data-testid="projects-open-cta"
        >
          {{ messages.scanAProject }}
        </RouterLink>
      </div>
    </header>

    <p class="projects-home__tip" role="note">{{ messages.projectsTip }}</p>

    <label class="projects-home__search">
      <span class="sr-only">{{ messages.searchProjects }}</span>
      <input
        :value="search"
        type="search"
        :placeholder="messages.searchProjects"
        @input="emit('update:search', ($event.target as HTMLInputElement).value)"
      >
    </label>

    <ErrorState
      v-if="error"
      :message="error"
      :retry-label="messages.retry"
      data-testid="projects-error"
      @retry="emit('retry')"
    />
    <SkeletonTableRows
      v-else-if="loading"
      :rows="6"
      :label="messages.loadingWorkspaces"
    />
    <EmptyState
      v-else-if="projects.length === 0"
      :title="messages.projectsEmptyTitle"
      :description="messages.projectsEmptyBody"
      data-testid="projects-empty"
    >
      <template #action>
        <RouterLink class="projects-home__cta" :to="openProjectPath(locale, workspaceId)">
          {{ messages.scanAProject }}
        </RouterLink>
      </template>
    </EmptyState>
    <EmptyState
      v-else-if="filteredProjects.length === 0"
      :title="messages.noMatchingProjects"
      data-testid="projects-no-match"
    />
    <Table
      v-else
      :caption="messages.projectsTableCaption"
      data-testid="projects-table"
    >
      <thead>
        <tr>
          <th scope="col">{{ messages.projectsColName }}</th>
          <th scope="col">{{ messages.projectsColDescription }}</th>
          <th scope="col">{{ messages.projectsColUpdated }}</th>
          <th scope="col"><span class="sr-only">{{ messages.projectsOpen }}</span></th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="project in filteredProjects"
          :key="project.id"
          class="projects-home__row"
          tabindex="0"
          @click="($event.currentTarget as HTMLElement).querySelector('a')?.click()"
          @keydown.enter="($event.currentTarget as HTMLElement).querySelector('a')?.click()"
        >
          <td>
            <h3 class="projects-home__name">
              <RouterLink
                :to="projectGraphPath(locale, workspaceId, project.id)"
                data-testid="project-open-link"
              >
                {{ project.name }}
              </RouterLink>
            </h3>
          </td>
          <td class="projects-home__desc">
            {{ project.description || messages.noDescription }}
          </td>
          <td>
            <time :datetime="project.updated_at">{{ messages.lastUpdated }} · {{ formatDate(project.updated_at) }}</time>
          </td>
          <td class="projects-home__chevron" aria-hidden="true">
            <ChevronRight :size="16" />
          </td>
        </tr>
      </tbody>
    </Table>

    <div v-if="canCreate" class="projects-home__create">
      <Button
        variant="secondary"
        size="sm"
        type="button"
        :aria-expanded="createOpen"
        data-testid="projects-create-toggle"
        @click="createOpen = !createOpen"
      >
        {{ createOpen ? messages.projectsCreateHide : messages.projectsCreateToggle }}
      </Button>
      <form
        v-if="createOpen"
        class="projects-home__form"
        data-testid="projects-create-form"
        @submit.prevent="emit('create')"
      >
        <h2>{{ messages.createProject }}</h2>
        <label>
          {{ messages.projectName }}
          <input
            :value="projectName"
            maxlength="120"
            required
            @input="emit('update:projectName', ($event.target as HTMLInputElement).value)"
          >
        </label>
        <label>
          {{ messages.description }}
          <span class="optional">{{ messages.optional }}</span>
          <textarea
            :value="projectDescription"
            maxlength="2000"
            rows="3"
            @input="emit('update:projectDescription', ($event.target as HTMLTextAreaElement).value)"
          />
        </label>
        <Button variant="primary" type="submit" :disabled="submitting" :loading="submitting">
          {{ submitting ? messages.creating : messages.createProject }}
        </Button>
      </form>
    </div>

    <section class="projects-home__recent" :aria-label="messages.recentWorkspaceScans" data-testid="recent-workspace-scans">
      <div class="projects-home__recent-head">
        <div>
          <h2>{{ messages.recentWorkspaceScans }}</h2>
          <p class="projects-home__recent-blurb">{{ messages.recentScansBlurb }}</p>
        </div>
        <RouterLink class="projects-home__ghost" :to="workspaceScansPath(locale, workspaceId)">
          {{ messages.viewAllScans }}
        </RouterLink>
      </div>

      <ErrorState
        v-if="recentError"
        :message="recentError"
        :retry-label="messages.retry"
        @retry="loadRecentScans"
      />
      <SkeletonTableRows v-else-if="recentLoading" :rows="3" :label="scanCopy.refreshScans" />
      <EmptyState
        v-else-if="recentScans.length === 0"
        :title="messages.recentScansEmpty"
        :description="messages.recentScansEmptyBody"
      >
        <template #action>
          <RouterLink class="projects-home__cta" :to="openProjectPath(locale, workspaceId)">
            {{ messages.scanAProject }}
          </RouterLink>
        </template>
      </EmptyState>
      <ul v-else class="projects-home__strip">
        <li v-for="scan in recentScans" :key="scan.id">
          <RouterLink
            class="projects-home__strip-item"
            :to="scanReportPath(locale, workspaceId, 'default', scan.id)"
          >
            <span class="projects-home__strip-title">{{ scanCopy.scanSourceLabel(scan) }}</span>
            <span class="projects-home__strip-meta">
              <StatusPill :status="scan.status" :label="scanCopy.scanStatus(scan.status)" />
              <time :datetime="scan.createdAt">{{ formatScanWhen(scan.createdAt) }}</time>
            </span>
          </RouterLink>
        </li>
      </ul>
    </section>
  </section>
</template>

<style scoped>
.projects-home {
  display: grid;
  gap: var(--space-5);
  min-width: 0;
}

.projects-home__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
}

.projects-home__titles {
  display: grid;
  gap: var(--space-2);
  min-width: 0;
}

.eyebrow {
  margin: 0;
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
  letter-spacing: var(--tracking-caps, 0.04em);
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.projects-home__titles h1 {
  margin: 0;
  font-size: var(--text-28, var(--text-24));
  line-height: var(--text-28-lh, 1.2);
  font-weight: var(--font-weight-semibold);
  letter-spacing: -0.02em;
}

.projects-home__blurb,
.projects-home__tip,
.projects-home__recent-blurb {
  margin: 0;
  max-inline-size: 48rem;
  font-size: var(--text-14);
  line-height: var(--text-14-lh);
  color: var(--color-text-secondary);
}

.projects-home__tip {
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--r-md);
  background: var(--color-surface);
}

.projects-home__search input,
.projects-home__form input,
.projects-home__form textarea {
  width: 100%;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--r-md);
  padding: var(--space-3);
  background: var(--color-surface-raised);
  color: var(--color-text-primary);
  font: inherit;
}

.projects-home__search {
  display: block;
  max-inline-size: 28rem;
}

.projects-home__row {
  cursor: pointer;
}

.projects-home__name {
  margin: 0;
  font-size: inherit;
  line-height: inherit;
  font-weight: var(--font-weight-semibold);
}

.projects-home__name a {
  color: var(--color-text-primary);
  font-weight: inherit;
  text-decoration: none;
}

.projects-home__name a:hover {
  color: var(--color-brand-amber-ui);
}

.projects-home__desc {
  color: var(--color-text-secondary);
  overflow-wrap: anywhere;
}

.projects-home__chevron {
  width: 1.5rem;
  color: var(--color-text-muted);
  text-align: end;
}

.projects-home__create {
  display: grid;
  gap: var(--space-3);
  justify-items: start;
}

.projects-home__form {
  display: grid;
  gap: var(--space-3);
  width: min(100%, 36rem);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--r-md);
  background: var(--color-surface);
}

.projects-home__form h2 {
  margin: 0;
  font-size: var(--text-16);
  line-height: var(--text-16-lh);
}

.projects-home__form label {
  display: grid;
  gap: var(--space-2);
  font-size: var(--text-13);
  color: var(--color-text-secondary);
}

.optional {
  color: var(--color-text-muted);
}

.projects-home__recent {
  display: grid;
  gap: var(--space-3);
}

.projects-home__recent-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

.projects-home__recent h2 {
  margin: 0 0 var(--space-1);
  font-size: var(--text-18, var(--text-16));
  line-height: 1.3;
}

.projects-home__strip {
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.projects-home__strip-item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--r-md);
  background: var(--color-surface);
  color: inherit;
  text-decoration: none;
}

.projects-home__strip-item:hover {
  background: var(--gray-3);
}

.projects-home__strip-title {
  font-weight: var(--font-weight-medium);
  overflow-wrap: anywhere;
}

.projects-home__strip-meta {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
  color: var(--color-text-secondary);
  font-size: var(--text-12);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

@media (max-width: 720px) {
  .projects-home__desc {
    display: none;
  }
}

.projects-home__cta,
.projects-home__ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-block-size: 1.75rem;
  padding-inline: var(--space-3);
  border-radius: var(--r-sm);
  font-size: var(--text-14);
  line-height: var(--text-14-lh);
  font-weight: var(--font-weight-medium);
  text-decoration: none;
}

.projects-home__cta {
  border: 1px solid var(--button-primary-border);
  background: var(--button-primary-bg);
  color: var(--button-primary-fg);
}

.projects-home__cta:hover {
  background: var(--button-primary-hover-bg);
}

.projects-home__ghost {
  border: 1px solid transparent;
  color: var(--color-text-secondary);
}

.projects-home__ghost:hover {
  background: var(--gray-3);
  color: var(--color-text-primary);
}
</style>
