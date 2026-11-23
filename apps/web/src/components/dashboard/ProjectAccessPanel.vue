<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Button from '../ui/Button.vue'
import ErrorState from '../ui/ErrorState.vue'
import HexLoader from '../ui/HexLoader.vue'
import { useToast } from '../../composables/useToast'
import { dashboardMessages } from '../../services/dashboard-messages'
import type { WebLocale } from '../../services/locale'
import {
  getProject,
  getProjectAccess,
  listWorkspaceMembers,
  updateProjectAccess,
  WorkspaceApiError,
  type Project,
  type Workspace,
  type WorkspaceMember
} from '../../services/workspaces'

const props = defineProps<{
  locale: WebLocale
  workspaceId: string
  projectId: string
  projectName?: string
  currentRole: Workspace['role']
}>()

const messages = computed(() => dashboardMessages(props.locale))
const toast = useToast()
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const success = ref('')
const project = ref<Project | null>(null)
const members = ref<WorkspaceMember[]>([])
const restricted = ref(false)
const selectedIds = ref<string[]>([])
const savedRestricted = ref(false)
const savedSelectedIds = ref<string[]>([])

const canEdit = computed(() => props.currentRole === 'owner' || props.currentRole === 'admin')
const titleName = computed(() => project.value?.name || props.projectName || '')

function isAlwaysOn(member: WorkspaceMember) {
  return member.role === 'owner' || member.role === 'admin'
}

function selectableIds(list: WorkspaceMember[]) {
  return list.filter(member => !isAlwaysOn(member)).map(member => member.id)
}

function sameIds(left: string[], right: string[]) {
  if (left.length !== right.length) return false
  const rightSet = new Set(right)
  return left.every(id => rightSet.has(id))
}

const dirty = computed(() =>
  restricted.value !== savedRestricted.value || !sameIds(selectedIds.value, savedSelectedIds.value)
)

const listedMembers = computed(() => {
  const allowed = new Set(selectedIds.value)
  return members.value.filter(member => isAlwaysOn(member) || allowed.has(member.id))
})

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '·'
}

function roleLabel(role: Workspace['role']) {
  if (role === 'owner') return messages.value.roleOwner
  if (role === 'admin') return messages.value.roleAdmin
  return messages.value.roleMember
}

function isSelected(member: WorkspaceMember) {
  return isAlwaysOn(member) || selectedIds.value.includes(member.id)
}

function friendlyError(cause: unknown, fallback: string) {
  if (cause instanceof WorkspaceApiError) {
    if (cause.status === 403) return messages.value.projectAccessForbidden
    if (cause.status === 404) return messages.value.projectAccessNotFound
    return cause.message
  }
  return cause instanceof Error ? cause.message : fallback
}

function applyAccess(accessRestricted: boolean, accessMemberIds: string[]) {
  const allowed = new Set(accessMemberIds)
  restricted.value = accessRestricted
  selectedIds.value = selectableIds(members.value).filter(id => allowed.has(id))
  savedRestricted.value = accessRestricted
  savedSelectedIds.value = [...selectedIds.value]
}

async function loadAccess() {
  if (!props.workspaceId || !props.projectId) return
  loading.value = true
  error.value = ''
  success.value = ''
  try {
    const [loadedProject, access, loadedMembers] = await Promise.all([
      getProject(props.workspaceId, props.projectId),
      getProjectAccess(props.workspaceId, props.projectId),
      listWorkspaceMembers(props.workspaceId)
    ])
    project.value = loadedProject
    members.value = loadedMembers
    applyAccess(access.restricted, access.members.map(member => member.id))
  } catch (cause) {
    error.value = friendlyError(cause, messages.value.projectAccessLoadError)
  } finally {
    loading.value = false
  }
}

function toggleRestriction() {
  if (!canEdit.value || saving.value) return
  restricted.value = !restricted.value
  success.value = ''
}

function toggleMember(member: WorkspaceMember) {
  if (!canEdit.value || saving.value || isAlwaysOn(member) || !restricted.value) return
  success.value = ''
  if (selectedIds.value.includes(member.id)) {
    selectedIds.value = selectedIds.value.filter(id => id !== member.id)
  } else {
    selectedIds.value = [...selectedIds.value, member.id]
  }
}

async function saveAccess() {
  if (!canEdit.value || !dirty.value || saving.value) return
  saving.value = true
  error.value = ''
  success.value = ''
  try {
    const access = await updateProjectAccess(props.workspaceId, props.projectId, {
      restricted: restricted.value,
      member_ids: selectedIds.value
    })
    applyAccess(access.restricted, access.members.map(member => member.id))
    success.value = messages.value.projectAccessSaved
    toast.success(messages.value.projectAccessSaved, { dismissLabel: messages.value.dismissNotification })
  } catch (cause) {
    error.value = friendlyError(cause, messages.value.projectAccessSaveError)
  } finally {
    saving.value = false
  }
}

watch(
  () => [props.workspaceId, props.projectId],
  () => {
    void loadAccess()
  },
  { immediate: true }
)
</script>

<template>
  <section class="access-page" data-testid="project-access-page">
    <header class="access-header">
      <p v-if="titleName" class="eyebrow">{{ titleName }}</p>
      <p class="access-copy">{{ messages.projectAccessDescription }}</p>
    </header>

    <ErrorState
      v-if="error && !members.length && !loading"
      :message="error"
      :retry-label="messages.retry"
      data-testid="project-access-error"
      @retry="loadAccess"
    />
    <div v-else-if="loading" class="state-card" role="status">
      <HexLoader size="sm" :label="messages.loadingWorkspaces" inline />
      {{ messages.loadingWorkspaces }}
    </div>

    <div v-else class="access-body">
      <p v-if="error" class="access-alert" role="alert">{{ error }}</p>

      <template v-if="canEdit">
        <div class="access-card">
          <button
            type="button"
            class="access-switch"
            role="switch"
            data-testid="project-access-toggle"
            :aria-checked="restricted"
            :aria-label="messages.projectAccessRestrictLabel"
            :disabled="saving"
            @click="toggleRestriction"
          >
            <span class="access-switch__track" aria-hidden="true">
              <span class="access-switch__thumb" />
            </span>
            <span class="access-switch__label">{{ messages.projectAccessRestrictLabel }}</span>
          </button>
          <p class="access-hint">
            {{ restricted ? messages.projectAccessRestrictedHint : messages.projectAccessOpenHint }}
          </p>
        </div>

        <section v-if="restricted" class="access-card" aria-labelledby="access-members-heading">
          <header class="access-card__header">
            <h3 id="access-members-heading">{{ messages.projectAccessMembersHeading }}</h3>
          </header>
          <ul class="team-list" data-testid="project-access-list">
            <li v-for="member in members" :key="member.id" class="team-item">
              <label class="member-card" :class="{ 'member-card--disabled': isAlwaysOn(member) }">
                <input
                  type="checkbox"
                  :checked="isSelected(member)"
                  :disabled="saving || isAlwaysOn(member)"
                  :aria-label="messages.projectAccessMemberLabel(member.full_name)"
                  @change="toggleMember(member)"
                >
                <span class="member-avatar" aria-hidden="true">{{ initials(member.full_name) }}</span>
                <span class="member-copy">
                  <strong>{{ member.full_name }}</strong>
                  <span>{{ member.email }}</span>
                  <span v-if="isAlwaysOn(member)" class="member-reason">{{ messages.projectAccessAlwaysOnReason }}</span>
                </span>
                <span class="member-role">{{ roleLabel(member.role) }}</span>
              </label>
            </li>
          </ul>
        </section>

        <div class="access-actions">
          <Button
            class="access-save"
            variant="primary"
            type="button"
            data-testid="project-access-save"
            :disabled="!dirty || saving"
            :loading="saving"
            @click="saveAccess"
          >
            {{ messages.projectAccessSave }}
          </Button>
          <p v-if="success" class="access-success" data-testid="project-access-success" role="status">
            {{ success }}
          </p>
        </div>
      </template>

      <template v-else>
        <div class="access-card access-card--readonly">
          <p class="access-copy">
            {{ restricted ? messages.projectAccessReadOnlyRestricted : messages.projectAccessReadOnlyOpen }}
          </p>
          <ul
            v-if="restricted"
            class="team-list"
            data-testid="project-access-list"
          >
            <li v-for="member in listedMembers" :key="member.id" class="team-item">
              <div class="member-card member-card--readonly">
                <span class="member-avatar" aria-hidden="true">{{ initials(member.full_name) }}</span>
                <span class="member-copy">
                  <strong>{{ member.full_name }}</strong>
                  <span>{{ member.email }}</span>
                  <span v-if="isAlwaysOn(member)" class="member-reason">{{ messages.projectAccessAlwaysOnReason }}</span>
                </span>
                <span class="member-role">{{ roleLabel(member.role) }}</span>
              </div>
            </li>
          </ul>
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped>
.access-page {
  display: grid;
  gap: var(--space-4);
  align-content: start;
}

.access-header,
.access-body {
  display: grid;
  gap: var(--space-4);
  align-content: start;
}

.access-header {
  gap: var(--space-2);
}

.access-header > * {
  margin: 0;
}

.eyebrow {
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.access-copy,
.access-hint,
.member-reason {
  color: var(--color-text-secondary);
  font-size: var(--text-14);
  line-height: var(--text-14-lh);
  max-inline-size: 42rem;
}

.access-card {
  min-width: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--r-md);
  background: var(--color-surface);
  overflow: hidden;
}

.access-card:not(:has(.team-list)) {
  padding: var(--space-4);
  display: grid;
  gap: var(--space-3);
}

.access-card__header {
  padding: var(--space-3) var(--space-4);
  border-block-end: 1px solid var(--color-border);
}

.access-card__header h3 {
  margin: 0;
  font-size: var(--text-16);
  line-height: var(--text-16-lh);
}

.access-switch {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;
}

.access-switch:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.access-switch:focus-visible {
  outline: none;
}

.access-switch:focus-visible .access-switch__track {
  box-shadow: var(--focus-ring);
}

.access-switch__track {
  position: relative;
  flex: none;
  inline-size: 2.5rem;
  block-size: 1.5rem;
  margin-block: 0.1rem;
  border-radius: var(--r-full);
  background: var(--color-surface-raised);
  box-shadow: inset 0 0 0 1px var(--color-border-strong);
  transition:
    background var(--dur-1) var(--easing-product),
    box-shadow var(--dur-1) var(--easing-product);
}

.access-switch[aria-checked='true'] .access-switch__track {
  background: var(--color-brand-amber-ui);
  box-shadow: inset 0 0 0 1px transparent;
}

.access-switch__thumb {
  position: absolute;
  inset-block-start: 0.15rem;
  inset-inline-start: 0.15rem;
  inline-size: 1.2rem;
  block-size: 1.2rem;
  border-radius: var(--r-full);
  background: #fff;
  box-shadow: 0 1px 2px color-mix(in srgb, #000 24%, transparent);
  transition: inset-inline-start var(--dur-1) var(--easing-product);
}

.access-switch[aria-checked='true'] .access-switch__thumb {
  inset-inline-start: 1.15rem;
}

.access-switch__label {
  font-size: var(--text-16);
  line-height: var(--text-16-lh);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.access-hint {
  margin: 0;
}

.team-list {
  display: grid;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.team-item {
  border-block-end: 1px solid var(--color-border);
}

.team-item:last-child {
  border-block-end: 0;
}

.member-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  cursor: pointer;
}

.member-card--readonly {
  cursor: default;
}

.member-card--disabled {
  cursor: default;
}

.member-card input[type='checkbox'] {
  flex: none;
  inline-size: 1.1rem;
  block-size: 1.1rem;
  accent-color: var(--color-brand-amber-ui);
}

.member-card input[type='checkbox']:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
  border-radius: 2px;
}

.member-avatar {
  display: inline-grid;
  place-items: center;
  flex: none;
  inline-size: 2rem;
  block-size: 2rem;
  border-radius: var(--r-sm);
  background: #12264a;
  color: #fff;
  font-size: var(--text-12);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.02em;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-brand-amber-ui) 60%, transparent);
}

.member-copy {
  display: grid;
  gap: var(--space-1);
  min-width: 0;
  flex: 1 1 auto;
}

.member-copy span {
  color: var(--color-text-secondary);
  overflow-wrap: anywhere;
}

.member-role {
  flex: 0 0 auto;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--r-full);
  border: 1px solid var(--color-border);
  background: var(--color-surface-raised);
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
}

.access-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
}

.access-save.ui-button--primary {
  background: var(--color-brand-amber-ui);
  color: var(--color-on-brand-amber);
  border-color: transparent;
}

.access-save.ui-button--primary:not(:disabled):hover {
  background: color-mix(in srgb, var(--color-brand-amber-ui) 88%, var(--color-text-primary));
}

.access-success {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--text-14);
  line-height: var(--text-14-lh);
}

.access-alert,
.state-card {
  margin: 0;
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--r-md);
  background: var(--color-surface);
  color: var(--color-text-secondary);
}

.access-alert {
  border-color: color-mix(in srgb, var(--color-danger) var(--alpha-40), var(--color-border));
  color: var(--color-text-primary);
}

.state-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

@media (max-width: 720px) {
  .member-card {
    align-items: flex-start;
  }

  .member-role {
    margin-block-start: 0.15rem;
  }
}
</style>
