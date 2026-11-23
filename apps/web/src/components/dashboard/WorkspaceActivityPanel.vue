<script setup lang="ts">
import { computed, ref, watch, type Component } from 'vue'
import {
  BadgeCheck,
  Crown,
  Lock,
  MailPlus,
  MailX,
  UserCheck,
  UserMinus
} from '@lucide/vue'
import { dashboardMessages } from '../../services/dashboard-messages'
import type { WebLocale } from '../../services/locale'
import {
  auditActionFilterLabel,
  auditActorName,
  auditNameLookup,
  formatAuditRelativeTime,
  formatAuditSentence
} from '../../services/workspace-audit'
import {
  listProjects,
  listWorkspaceAudit,
  listWorkspaceMembers,
  WORKSPACE_AUDIT_ACTIONS,
  WorkspaceApiError,
  type Project,
  type Workspace,
  type WorkspaceAuditAction,
  type WorkspaceAuditEvent,
  type WorkspaceMember
} from '../../services/workspaces'

const props = defineProps<{
  locale: WebLocale
  workspaceId: string
  workspaceName: string
  currentRole: Workspace['role']
}>()

const messages = computed(() => dashboardMessages(props.locale))
const loading = ref(false)
const loadingMore = ref(false)
const forbidden = ref(false)
const error = ref('')
const events = ref<WorkspaceAuditEvent[]>([])
const nextCursor = ref<string | null>(null)
const members = ref<WorkspaceMember[]>([])
const projects = ref<Project[]>([])
const actionFilter = ref<'' | WorkspaceAuditAction>('')
const projectFilter = ref('')
const now = ref(new Date())

const canView = computed(() => props.currentRole === 'owner' || props.currentRole === 'admin')
const names = computed(() => auditNameLookup(members.value, projects.value))

const actionOptions = computed(() =>
  WORKSPACE_AUDIT_ACTIONS.map(action => ({
    value: action,
    label: auditActionFilterLabel(action, messages.value)
  }))
)

type ActivityRow = {
  event: WorkspaceAuditEvent
  sentence: string
  actor: string
  relative: string
  exact: string
  timeLabel: string
  icon: Component
}

const actionIcons: Record<WorkspaceAuditAction, Component> = {
  'member.invited': MailPlus,
  'invite.revoked': MailX,
  'invite.accepted': UserCheck,
  'member.role_changed': BadgeCheck,
  'member.removed': UserMinus,
  'ownership.transferred': Crown,
  'project.access_changed': Lock
}

const rows = computed<ActivityRow[]>(() =>
  events.value.map(event => {
    const time = formatAuditRelativeTime(event.created_at, messages.value, props.locale, now.value)
    const action = event.action as WorkspaceAuditAction
    return {
      event,
      sentence: formatAuditSentence(event, messages.value, names.value),
      actor: auditActorName(event, messages.value, names.value),
      relative: time.relative,
      exact: time.exact,
      timeLabel: time.label,
      icon: actionIcons[action] ?? BadgeCheck
    }
  })
)

function friendlyError(cause: unknown) {
  if (cause instanceof WorkspaceApiError && cause.status === 403) {
    forbidden.value = true
    return messages.value.activityForbidden
  }
  return cause instanceof Error ? cause.message : messages.value.activityLoadError
}

async function loadPage(reset: boolean) {
  if (!props.workspaceId) return
  if (!canView.value) {
    events.value = []
    nextCursor.value = null
    forbidden.value = true
    error.value = ''
    loading.value = false
    loadingMore.value = false
    return
  }

  forbidden.value = false
  error.value = ''
  if (reset) {
    loading.value = true
    events.value = []
    nextCursor.value = null
  } else {
    loadingMore.value = true
  }

  try {
    const [page, memberList, projectList] = await Promise.all([
      listWorkspaceAudit(props.workspaceId, {
        limit: 50,
        cursor: reset ? undefined : nextCursor.value ?? undefined,
        action: actionFilter.value || undefined,
        project: projectFilter.value || undefined
      }),
      reset || members.value.length === 0
        ? listWorkspaceMembers(props.workspaceId).catch(() => members.value)
        : Promise.resolve(members.value),
      reset || projects.value.length === 0
        ? listProjects(props.workspaceId).catch(() => projects.value)
        : Promise.resolve(projects.value)
    ])
    members.value = memberList
    projects.value = projectList
    now.value = new Date()
    if (reset) {
      events.value = page.events
    } else {
      const seen = new Set(events.value.map(event => event.id))
      events.value = [...events.value, ...page.events.filter(event => !seen.has(event.id))]
    }
    nextCursor.value = page.next_cursor
  } catch (cause) {
    error.value = friendlyError(cause)
    if (reset) events.value = []
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function onActionFilter(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  actionFilter.value = (WORKSPACE_AUDIT_ACTIONS as readonly string[]).includes(value)
    ? (value as WorkspaceAuditAction)
    : ''
}

function onProjectFilter(event: Event) {
  projectFilter.value = (event.target as HTMLSelectElement).value
}

watch(
  () => [props.workspaceId, props.currentRole, actionFilter.value, projectFilter.value] as const,
  () => {
    void loadPage(true)
  },
  { immediate: true }
)
</script>

<template>
  <section class="activity-page" data-testid="activity-page">
    <header class="activity-header">
      <div class="activity-intro">
        <p class="eyebrow">{{ workspaceName }}</p>
        <p class="activity-copy">{{ messages.activityDescription }}</p>
      </div>

      <div
        v-if="canView && !forbidden"
        class="activity-filters"
        data-testid="activity-filters"
      >
        <label class="filter-field">
          <span>{{ messages.activityFilterAction }}</span>
          <select
            data-testid="activity-action-filter"
            :value="actionFilter"
            :disabled="loading || loadingMore"
            @change="onActionFilter"
          >
            <option value="">{{ messages.activityFilterAllActions }}</option>
            <option v-for="option in actionOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
        <label class="filter-field">
          <span>{{ messages.activityFilterProject }}</span>
          <select
            data-testid="activity-project-filter"
            :value="projectFilter"
            :disabled="loading || loadingMore"
            @change="onProjectFilter"
          >
            <option value="">{{ messages.activityFilterAllProjects }}</option>
            <option v-for="project in projects" :key="project.id" :value="project.id">
              {{ project.name }}
            </option>
          </select>
        </label>
      </div>
    </header>

    <div
      v-if="forbidden"
      class="state-card"
      role="status"
      data-testid="activity-forbidden"
    >
      <p>{{ messages.activityForbidden }}</p>
    </div>
    <div v-else-if="error" class="state-card error-state" role="alert" data-testid="activity-error">
      <p>{{ error }}</p>
      <button class="primary-button" type="button" @click="loadPage(true)">{{ messages.retry }}</button>
    </div>
    <div
      v-else-if="loading"
      class="state-card"
      role="status"
      data-testid="activity-loading"
    >
      {{ messages.activityLoading }}
    </div>
    <section v-else class="activity-card" :aria-label="messages.activityNav">
      <p
        v-if="rows.length === 0"
        class="activity-card__empty"
        data-testid="activity-empty"
      >
        {{ actionFilter || projectFilter ? messages.activityEmptyFiltered : messages.activityEmpty }}
      </p>
      <ol v-else class="activity-list" data-testid="activity-list">
        <li
          v-for="row in rows"
          :key="row.event.id"
          class="activity-row"
          data-testid="activity-row"
        >
          <span class="activity-icon" aria-hidden="true">
            <component :is="row.icon" :size="16" />
          </span>
          <div class="activity-body">
            <p class="activity-sentence">{{ row.sentence }}</p>
            <p class="activity-meta">
              <span data-testid="activity-actor">{{ row.actor }}</span>
              <span aria-hidden="true"> · </span>
              <time
                :datetime="row.event.created_at"
                :title="row.exact"
                :aria-label="row.timeLabel"
              >
                {{ row.relative }}
              </time>
            </p>
          </div>
        </li>
      </ol>
      <div v-if="nextCursor" class="activity-footer">
        <button
          class="primary-button"
          type="button"
          data-testid="activity-load-more"
          :disabled="loadingMore"
          @click="loadPage(false)"
        >
          {{ messages.activityLoadMore }}
        </button>
      </div>
    </section>
  </section>
</template>

<style scoped>
.activity-page {
  display: grid;
  gap: var(--space-4);
  align-content: start;
}

.activity-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-4);
}

.activity-intro {
  display: grid;
  gap: var(--space-2);
  min-width: 0;
}

.activity-intro > p,
.activity-sentence,
.activity-meta,
.state-card p {
  margin: 0;
}

.eyebrow {
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.activity-copy {
  color: var(--color-text-secondary);
  max-inline-size: 42rem;
  font-size: var(--text-14);
  line-height: var(--text-14-lh);
}

.activity-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--space-3);
}

.filter-field {
  display: grid;
  gap: var(--space-1);
  margin: 0;
  min-inline-size: 12rem;
}

.filter-field span {
  font-size: var(--text-13);
  line-height: var(--text-14-lh);
  color: var(--color-text-secondary);
}

.filter-field select {
  min-inline-size: 12rem;
  width: auto;
  min-block-size: 2.5rem;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--r-md);
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface-raised);
  color: var(--color-text-primary);
  font: inherit;
}

.filter-field select:focus-visible {
  outline: none;
  border-color: var(--color-brand-amber-ui);
  box-shadow: var(--focus-ring);
}

.activity-card,
.state-card {
  min-width: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--r-md);
  background: var(--color-surface);
  overflow: hidden;
}

.activity-card__empty,
.state-card {
  padding: var(--space-4);
  color: var(--color-text-secondary);
}

.state-card p {
  margin: 0 0 var(--space-3);
  color: var(--color-text-secondary);
}

.state-card p:last-child {
  margin-bottom: 0;
}

.error-state {
  border-color: color-mix(in srgb, var(--color-danger) var(--alpha-40), var(--color-border));
}

.activity-list {
  display: grid;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.activity-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-block-end: 1px solid var(--color-border);
}

.activity-row:last-child {
  border-block-end: 0;
}

.activity-icon {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: var(--r-full);
  border: 1px solid var(--color-border);
  background: var(--surface-brand-soft);
  color: var(--color-brand-amber-ui);
}

.activity-body {
  display: grid;
  gap: var(--space-1);
  min-width: 0;
}

.activity-sentence {
  color: var(--color-text-primary);
  font-size: var(--text-14);
  line-height: var(--text-14-lh);
  font-weight: var(--font-weight-medium);
}

.activity-meta {
  color: var(--color-text-secondary);
  font-size: var(--text-13);
  line-height: var(--text-14-lh);
}

.activity-footer {
  display: flex;
  justify-content: flex-start;
  padding: var(--space-3) var(--space-4);
  border-block-start: 1px solid var(--color-border);
}

.primary-button {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  min-block-size: 2.5rem;
  padding-inline: var(--space-4);
  border: 1px solid transparent;
  border-radius: var(--r-sm);
  background: var(--color-brand-amber-ui);
  color: var(--color-on-brand-amber);
  font-size: var(--text-14);
  line-height: var(--text-14-lh);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
  cursor: pointer;
}

.primary-button:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-brand-amber-ui) 88%, var(--color-text-primary));
}

.primary-button:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.primary-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 720px) {
  .activity-header {
    align-items: stretch;
    flex-direction: column;
    gap: var(--space-2);
  }

  .activity-intro {
    gap: var(--space-1);
  }

  .activity-filters,
  .filter-field,
  .filter-field select {
    width: 100%;
    min-inline-size: 0;
  }

  .activity-filters {
    gap: var(--space-2);
  }

  .activity-page {
    gap: var(--space-2);
  }

  .activity-row {
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
  }

  .activity-footer {
    padding: var(--space-2) var(--space-3);
  }
}
</style>
