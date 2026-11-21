<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import HexLoader from '../ui/HexLoader.vue'
import ConfirmDialog from '../ui/ConfirmDialog.vue'
import { useToast } from '../../composables/useToast'
import { dashboardMessages } from '../../services/dashboard-messages'
import type { WebLocale } from '../../services/locale'
import { isLastOwnerRefusal, canManageWorkspaceMember, roleOptionsFor } from '../../services/workspace-members'
import {
  inviteWorkspaceMember,
  listWorkspaceInvitations,
  listWorkspaceMembers,
  removeWorkspaceMember,
  revokeWorkspaceInvitation,
  updateWorkspaceMemberRole,
  WorkspaceApiError,
  type Workspace,
  type WorkspaceInvitation,
  type WorkspaceMember
} from '../../services/workspaces'

const props = defineProps<{
  locale: WebLocale
  workspaceId: string
  workspaceName: string
  currentRole: Workspace['role']
  currentUserId: string
}>()

const emit = defineEmits<{
  left: []
}>()

const messages = computed(() => dashboardMessages(props.locale))
const toast = useToast()
const loading = ref(false)
const error = ref('')
const submitting = ref(false)
const inviteEmail = ref('')
const members = ref<WorkspaceMember[]>([])
const invitations = ref<WorkspaceInvitation[]>([])

const canManageTeam = computed(() => props.currentRole === 'owner' || props.currentRole === 'admin')

type PendingAction =
  | { type: 'role'; member: WorkspaceMember; role: Workspace['role'] }
  | { type: 'remove'; member: WorkspaceMember }
  | { type: 'leave' }
  | null

const pending = ref<PendingAction>(null)

const dialogTitle = computed(() => {
  if (!pending.value) return ''
  if (pending.value.type === 'role') return messages.value.confirmChangeRoleTitle
  if (pending.value.type === 'remove') return messages.value.confirmRemoveTitle
  return messages.value.confirmLeaveTitle
})

const dialogBody = computed(() => {
  if (!pending.value) return ''
  if (pending.value.type === 'role') {
    return messages.value.confirmChangeRoleBody(
      pending.value.member.full_name,
      roleLabel(pending.value.role)
    )
  }
  if (pending.value.type === 'remove') return messages.value.confirmRemoveBody(pending.value.member.full_name)
  return messages.value.confirmLeaveBody
})

const dialogConfirm = computed(() => {
  if (!pending.value) return ''
  if (pending.value.type === 'role') return messages.value.confirmChangeRole
  if (pending.value.type === 'remove') return messages.value.confirmRemove
  return messages.value.confirmLeave
})

const dialogDanger = computed(() => pending.value?.type === 'remove' || pending.value?.type === 'leave')

function roleLabel(role: Workspace['role']) {
  if (role === 'owner') return messages.value.roleOwner
  if (role === 'admin') return messages.value.roleAdmin
  return messages.value.roleMember
}

function joinedDate(value: string) {
  return new Date(value).toLocaleDateString(props.locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function canChangeRole(member: WorkspaceMember) {
  return roleOptionsFor(props.currentRole, member.role).length > 0
}

function canRemove(member: WorkspaceMember) {
  return member.id !== props.currentUserId && canManageWorkspaceMember(props.currentRole, member.role)
}

function showToast(message: string) {
  toast.success(message, { dismissLabel: messages.value.dismissNotification })
}

function friendlyError(cause: unknown, fallback: string) {
  if (cause instanceof WorkspaceApiError && isLastOwnerRefusal(cause.message)) {
    return messages.value.lastOwnerError
  }
  return cause instanceof Error ? cause.message : fallback
}

async function loadTeam() {
  if (!props.workspaceId) return
  loading.value = true
  error.value = ''
  try {
    members.value = await listWorkspaceMembers(props.workspaceId)
    invitations.value = canManageTeam.value ? await listWorkspaceInvitations(props.workspaceId) : []
  } catch (cause) {
    error.value = friendlyError(cause, messages.value.loadProjectsError)
  } finally {
    loading.value = false
  }
}

async function handleInviteMember() {
  if (!props.workspaceId) return
  submitting.value = true
  error.value = ''
  try {
    const invitation = await inviteWorkspaceMember(props.workspaceId, inviteEmail.value)
    invitations.value = [...invitations.value, invitation]
    inviteEmail.value = ''
    showToast(messages.value.inviteSuccess)
  } catch (cause) {
    error.value = friendlyError(cause, messages.value.createProjectError)
  } finally {
    submitting.value = false
  }
}

async function handleRevokeInvitation(invitationId: string) {
  if (!props.workspaceId) return
  error.value = ''
  try {
    await revokeWorkspaceInvitation(props.workspaceId, invitationId)
    invitations.value = invitations.value.filter(invitation => invitation.id !== invitationId)
    showToast(messages.value.invitationRevoked)
  } catch (cause) {
    error.value = friendlyError(cause, messages.value.loadProjectsError)
  }
}

function onRoleInput(member: WorkspaceMember, event: Event) {
  const select = event.target as HTMLSelectElement
  const value = select.value
  select.value = member.role
  if (value === member.role || (value !== 'owner' && value !== 'admin' && value !== 'member')) {
    return
  }
  pending.value = { type: 'role', member, role: value }
}

function askRemove(member: WorkspaceMember) {
  pending.value = { type: 'remove', member }
}

function askLeave() {
  pending.value = { type: 'leave' }
}

function cancelPending() {
  pending.value = null
}

async function confirmPending() {
  if (!pending.value || !props.workspaceId) return
  const action = pending.value
  submitting.value = true
  error.value = ''
  try {
    if (action.type === 'role') {
      const updated = await updateWorkspaceMemberRole(props.workspaceId, action.member.id, action.role)
      members.value = members.value.map(member =>
        member.id === updated.id ? { ...member, role: updated.role, created_at: updated.created_at } : member
      )
      showToast(messages.value.roleChanged)
    } else if (action.type === 'remove') {
      await removeWorkspaceMember(props.workspaceId, action.member.id)
      members.value = members.value.filter(member => member.id !== action.member.id)
      showToast(messages.value.memberRemoved)
    } else {
      await removeWorkspaceMember(props.workspaceId, props.currentUserId)
      pending.value = null
      showToast(messages.value.leftWorkspace)
      emit('left')
      return
    }
    pending.value = null
  } catch (cause) {
    error.value = friendlyError(cause, messages.value.loadProjectsError)
    pending.value = null
  } finally {
    submitting.value = false
  }
}

watch(() => props.workspaceId, () => {
  void loadTeam()
}, { immediate: true })
</script>

<template>
  <section class="members-page" data-testid="members-page">
    <p class="eyebrow">{{ workspaceName }}</p>
    <p class="role-summary">
      <strong>{{ messages.workspaceRole }}:</strong>
      {{ roleLabel(currentRole) }}
    </p>
    <p class="members-copy">{{ messages.membersDescription }}</p>
    <p v-if="!canManageTeam" class="members-copy members-readonly">{{ messages.membersReadOnly }}</p>

    <div v-if="error" class="state-card error-state" role="alert">
      <p>{{ error }}</p>
      <button class="primary-button" type="button" @click="loadTeam">{{ messages.retry }}</button>
    </div>
    <div v-else-if="loading" class="state-card" role="status">{{ messages.loadingWorkspaces }}</div>

    <template v-else>
      <section class="team-panel">
        <h2>{{ messages.teamMembers }}</h2>
        <p v-if="members.length === 0">{{ messages.noTeamMembers }}</p>
        <ul v-else class="team-list">
          <li v-for="member in members" :key="member.id" class="team-item">
            <div>
              <strong>
                {{ member.full_name }}
                <span v-if="member.id === currentUserId" class="you-badge">{{ messages.youLabel }}</span>
              </strong>
              <span>{{ member.email }}</span>
              <span>{{ messages.joinedOn }} {{ joinedDate(member.created_at) }}</span>
            </div>
            <div class="member-actions">
              <label v-if="canChangeRole(member)" class="role-field">
                <span class="sr-only">{{ messages.changeRoleLabel(member.full_name) }}</span>
                <select
                  :value="member.role"
                  :disabled="submitting"
                  @change="onRoleInput(member, $event)"
                >
                  <option
                    v-for="role in roleOptionsFor(currentRole, member.role)"
                    :key="role"
                    :value="role"
                  >
                    {{ roleLabel(role) }}
                  </option>
                </select>
              </label>
              <span v-else class="member-role">{{ roleLabel(member.role) }}</span>
              <button
                v-if="canRemove(member)"
                class="secondary-button"
                type="button"
                :disabled="submitting"
                :aria-label="messages.removeMemberLabel(member.full_name)"
                @click="askRemove(member)"
              >
                {{ messages.removeMember }}
              </button>
              <button
                v-else-if="member.id === currentUserId"
                class="secondary-button"
                type="button"
                :disabled="submitting"
                @click="askLeave"
              >
                {{ messages.leaveWorkspace }}
              </button>
            </div>
          </li>
        </ul>
      </section>

      <form
        v-if="canManageTeam"
        class="team-panel invite-form"
        @submit.prevent="handleInviteMember"
      >
        <h2>{{ messages.sendInvitation }}</h2>
        <label>
          {{ messages.inviteEmailLabel }}
          <input v-model="inviteEmail" type="email" maxlength="254" autocomplete="email" required>
        </label>
        <button class="primary-button" type="submit" :disabled="submitting">
          <HexLoader v-if="submitting" size="sm" :label="messages.sendInvitation" hide-label inline :delay="0" :min-visible="0" />
          {{ messages.sendInvitation }}
        </button>
      </form>

      <section v-if="canManageTeam" class="team-panel">
        <h2>{{ messages.pendingInvitations }}</h2>
        <p v-if="invitations.length === 0">{{ messages.noPendingInvitations }}</p>
        <ul v-else class="team-list">
          <li v-for="invitation in invitations" :key="invitation.id" class="team-item">
            <div>
              <strong>{{ invitation.email }}</strong>
              <span>{{ messages.invitedBy }} {{ invitation.inviter_name }} · {{ messages.expiresAt }} {{ joinedDate(invitation.expires_at) }}</span>
            </div>
            <button class="secondary-button" type="button" :disabled="submitting" @click="handleRevokeInvitation(invitation.id)">
              {{ messages.revokeInvitation }}
            </button>
          </li>
        </ul>
      </section>
    </template>

    <ConfirmDialog
      :open="pending !== null"
      :title="dialogTitle"
      :body="dialogBody"
      :confirm-label="dialogConfirm"
      :cancel-label="messages.cancel"
      :danger="dialogDanger"
      :busy="submitting"
      @confirm="confirmPending"
      @cancel="cancelPending"
    />
  </section>
</template>

<style scoped>
.members-page {
  display: grid;
  gap: var(--space-4);
}

.members-page > p {
  margin: 0;
}

.eyebrow {
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.members-copy,
.role-summary {
  color: var(--color-text-secondary);
  max-inline-size: 42rem;
}

.members-readonly {
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--r-md);
  background: var(--color-surface-raised);
}

.team-panel {
  display: grid;
  gap: var(--space-3);
  padding-block: var(--space-5);
  border-block: 1px solid var(--color-border);
}

.team-panel h2 {
  margin: 0;
  font-size: var(--text-16);
  line-height: var(--text-16-lh);
}

.team-panel label {
  display: grid;
  gap: var(--space-2);
  color: var(--color-text-secondary);
}

.team-list {
  display: grid;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--color-border);
  border-radius: var(--r-md);
  overflow: hidden;
}

.team-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  border-block-end: 1px solid var(--color-border);
}

.team-item:last-child {
  border-block-end: 0;
}

.team-item > div:first-child {
  display: grid;
  gap: var(--space-1);
  min-width: 0;
}

.team-item span {
  color: var(--color-text-secondary);
  overflow-wrap: anywhere;
}

.you-badge {
  display: inline-block;
  margin-inline-start: var(--space-2);
  padding: 0 var(--space-2);
  border-radius: var(--r-full);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
  font-weight: var(--font-weight-medium);
  vertical-align: middle;
}

.member-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2);
  flex: 0 1 auto;
}

.role-field {
  margin: 0;
}

.role-field select {
  min-inline-size: 8.5rem;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--r-md);
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface-raised);
  color: var(--color-text-primary);
  font: inherit;
}

.member-role {
  flex: 0 0 auto;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--r-full);
  border: 1px solid var(--color-border);
  font-size: var(--text-12);
  line-height: var(--text-12-lh);
}

.state-card {
  padding: var(--space-5);
  border-block: 1px solid var(--color-border);
}

.state-card p {
  color: var(--color-text-secondary);
}

.error-state {
  border-color: color-mix(in srgb, var(--color-danger) var(--alpha-40), var(--color-border));
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
  .team-item {
    align-items: flex-start;
    flex-direction: column;
  }

  .member-actions {
    justify-content: flex-start;
    width: 100%;
  }

  .role-field select {
    min-inline-size: 0;
    width: auto;
  }
}
</style>
