<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import HexLoader from '../ui/HexLoader.vue'
import Button from '../ui/Button.vue'
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
  transferWorkspaceOwnership,
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
  roleChanged: [role: Workspace['role']]
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
  | { type: 'transfer'; member: WorkspaceMember }
  | { type: 'remove'; member: WorkspaceMember }
  | { type: 'leave' }
  | null

const pending = ref<PendingAction>(null)
const stayAsAdmin = ref(true)

const dialogTitle = computed(() => {
  if (!pending.value) return ''
  if (pending.value.type === 'role') return messages.value.confirmChangeRoleTitle
  if (pending.value.type === 'transfer') return messages.value.confirmTransferTitle(pending.value.member.full_name)
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
  if (pending.value.type === 'transfer') {
    return stayAsAdmin.value
      ? messages.value.confirmTransferBodyStay
      : messages.value.confirmTransferBodyLeave
  }
  if (pending.value.type === 'remove') return messages.value.confirmRemoveBody(pending.value.member.full_name)
  return messages.value.confirmLeaveBody
})

const dialogConfirm = computed(() => {
  if (!pending.value) return ''
  if (pending.value.type === 'role') return messages.value.confirmChangeRole
  if (pending.value.type === 'transfer') return messages.value.confirmTransfer
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
  if (value === 'owner' && member.id !== props.currentUserId && props.currentRole === 'owner') {
    stayAsAdmin.value = true
    pending.value = { type: 'transfer', member }
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
    } else if (action.type === 'transfer') {
      const transferred = await transferWorkspaceOwnership(
        props.workspaceId,
        action.member.id,
        stayAsAdmin.value
      )
      if (transferred.left) {
        pending.value = null
        showToast(messages.value.ownershipTransferred)
        emit('left')
        return
      }
      members.value = members.value.map(member => {
        if (member.id === transferred.member.id) {
          return { ...member, role: transferred.member.role, created_at: transferred.member.created_at }
        }
        if (member.id === props.currentUserId) return { ...member, role: 'admin' }
        return member
      })
      emit('roleChanged', 'admin')
      showToast(messages.value.ownershipTransferred)
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
    <header class="members-header">
      <div class="members-intro">
        <p class="eyebrow">{{ workspaceName }}</p>
        <p class="role-summary">
          <strong>{{ messages.workspaceRole }}:</strong>
          {{ roleLabel(currentRole) }}
        </p>
        <p class="members-copy">{{ messages.membersDescription }}</p>
        <p v-if="!canManageTeam" class="members-copy members-readonly">{{ messages.membersReadOnly }}</p>
      </div>

      <form
        v-if="canManageTeam && !loading && !error"
        class="invite-form"
        @submit.prevent="handleInviteMember"
      >
        <label class="invite-label" for="invite-email">{{ messages.inviteEmailLabel }}</label>
        <div class="invite-row">
          <input
            id="invite-email"
            v-model="inviteEmail"
            type="email"
            maxlength="254"
            autocomplete="email"
            required
          >
          <button class="invite-submit" type="submit" :disabled="submitting">
            <HexLoader v-if="submitting" size="sm" :label="messages.sendInvitation" hide-label inline :delay="0" :min-visible="0" />
            {{ messages.sendInvitation }}
          </button>
        </div>
      </form>
    </header>

    <div v-if="error" class="state-card error-state" role="alert">
      <p>{{ error }}</p>
      <button class="primary-button" type="button" @click="loadTeam">{{ messages.retry }}</button>
    </div>
    <div v-else-if="loading" class="state-card" role="status">{{ messages.loadingWorkspaces }}</div>

    <div v-else class="members-grid">
      <section class="members-card members-card--people" aria-labelledby="members-heading">
        <header class="members-card__header">
          <h2 id="members-heading">{{ messages.teamMembers }}</h2>
        </header>
        <p v-if="members.length === 0" class="members-card__empty">{{ messages.noTeamMembers }}</p>
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
              <Button
                v-if="canRemove(member)"
                variant="danger"
                size="sm"
                type="button"
                :disabled="submitting"
                :aria-label="messages.removeMemberLabel(member.full_name)"
                @click="askRemove(member)"
              >
                {{ messages.removeMember }}
              </Button>
              <Button
                v-else-if="member.id === currentUserId"
                variant="secondary"
                size="sm"
                type="button"
                :disabled="submitting"
                @click="askLeave"
              >
                {{ messages.leaveWorkspace }}
              </Button>
            </div>
          </li>
        </ul>
      </section>

      <section v-if="canManageTeam" class="members-card members-card--invites" aria-labelledby="invites-heading">
        <header class="members-card__header">
          <h2 id="invites-heading">{{ messages.pendingInvitations }}</h2>
        </header>
        <p v-if="invitations.length === 0" class="members-card__empty">{{ messages.noPendingInvitations }}</p>
        <ul v-else class="team-list">
          <li v-for="invitation in invitations" :key="invitation.id" class="team-item invite-item">
            <div>
              <strong>{{ invitation.email }}</strong>
              <span>
                {{ messages.invitedBy }} {{ invitation.inviter_name }} ·
                {{ messages.expiresAt }}
                <time class="invite-expiry" :datetime="invitation.expires_at">{{ joinedDate(invitation.expires_at) }}</time>
              </span>
            </div>
            <Button
              class="invite-revoke"
              variant="secondary"
              size="sm"
              type="button"
              :disabled="submitting"
              :aria-label="messages.revokeInvitation"
              @click="handleRevokeInvitation(invitation.id)"
            >
              {{ messages.revokeInvitationShort ?? messages.revokeInvitation }}
            </Button>
          </li>
        </ul>
      </section>
    </div>

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
    >
      <label v-if="pending?.type === 'transfer'" class="stay-admin">
        <input v-model="stayAsAdmin" type="checkbox" :disabled="submitting">
        {{ messages.stayAsAdminLabel }}
      </label>
    </ConfirmDialog>
  </section>
</template>

<style scoped>
.members-page {
  display: grid;
  gap: var(--space-4);
  align-content: start;
}

.members-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-4);
}

.members-intro {
  display: grid;
  gap: var(--space-2);
  min-width: 0;
}

.members-intro > p {
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

.members-copy {
  font-size: var(--text-14);
  line-height: var(--text-14-lh);
}

.members-readonly {
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--r-md);
  background: var(--color-surface);
}

.invite-form {
  display: grid;
  gap: var(--space-2);
  align-content: start;
  flex: 1 1 22rem;
  max-inline-size: 32rem;
}

.invite-label {
  font-size: var(--text-13);
  line-height: var(--text-14-lh);
  color: var(--color-text-secondary);
}

.invite-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.invite-form input {
  flex: 1 1 auto;
  min-inline-size: 0;
  width: auto;
  min-block-size: 2.5rem;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--r-md);
  padding: var(--space-3);
  background: var(--color-surface-raised);
  color: var(--color-text-primary);
  font: inherit;
}

.invite-form input:focus-visible {
  outline: none;
  border-color: var(--color-brand-amber-ui);
  box-shadow: var(--focus-ring);
}

.invite-submit {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
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

.invite-submit:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-brand-amber-ui) 88%, var(--color-text-primary));
}

.invite-submit:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.invite-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.members-grid {
  display: grid;
  gap: var(--space-4);
  align-items: start;
}

.members-card {
  min-width: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--r-md);
  background: var(--color-surface);
  overflow: hidden;
}

.members-card__header {
  padding: var(--space-3) var(--space-4);
  border-block-end: 1px solid var(--color-border);
}

.members-card__header h2 {
  margin: 0;
  font-size: var(--text-16);
  line-height: var(--text-16-lh);
}

.members-card__empty {
  margin: 0;
  padding: var(--space-4);
  color: var(--color-text-secondary);
}

.team-list {
  display: grid;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
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

.invite-item {
  flex-wrap: nowrap;
  gap: var(--space-3);
}

.invite-expiry,
.invite-revoke {
  white-space: nowrap;
}

.invite-revoke {
  flex: 0 0 auto;
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
  background: var(--surface-brand-soft);
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
  width: auto;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--r-md);
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface-raised);
  color: var(--color-text-primary);
  font: inherit;
}

.role-field select:focus-visible {
  outline: none;
  border-color: var(--color-brand-amber-ui);
  box-shadow: var(--focus-ring);
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

.state-card {
  padding: var(--space-5);
  border: 1px solid var(--color-border);
  border-radius: var(--r-md);
  background: var(--color-surface);
}

.state-card p {
  margin: 0 0 var(--space-3);
  color: var(--color-text-secondary);
}

.error-state {
  border-color: color-mix(in srgb, var(--color-danger) var(--alpha-40), var(--color-border));
}

.stay-admin {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  color: var(--color-text-primary);
  font-size: var(--text-14);
  line-height: var(--text-14-lh);
}

.stay-admin input {
  margin-block: 0.2em 0;
  accent-color: var(--color-accent-primary);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

@media (min-width: 1100px) {
  .members-grid {
    grid-template-columns: minmax(0, 1.35fr) minmax(16rem, 1fr);
  }
}

@media (max-width: 720px) {
  .members-header {
    align-items: stretch;
    flex-direction: column;
  }

  .invite-form {
    flex: 0 1 auto;
    max-inline-size: none;
  }

  .invite-row {
    flex-wrap: wrap;
  }

  .invite-row input {
    flex: 1 1 100%;
  }

  /* Pending invites sit under the invite form so they are visible on a 390 phone without a short scroll. */
  .members-card--invites {
    order: -1;
  }

  .members-page,
  .members-grid {
    gap: var(--space-3);
  }

  .members-card__header {
    padding-block: var(--space-2);
  }

  .team-item {
    align-items: flex-start;
    flex-direction: column;
  }

  .invite-item {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
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
