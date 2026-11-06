<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthField from '../components/auth/AuthField.vue'
import AuthShell from '../components/auth/AuthShell.vue'
import Navbar from '../components/layout/Navbar.vue'
import { authCoreMessages } from '../services/auth-core-messages'
import {
    deleteAccount,
    loginUser,
    requestPasswordReset,
    resendVerificationCode,
    resetPassword,
    sendOtpCode,
    signupUser,
    verifyEmail,
    verifyOtp,
    type AuthAccountType
} from '../services/auth'
import { isSupportedWebLocale, localizedPath, readLocalePreference, resolvePreferredWebLocale } from '../services/locale'

type AuthView = 'login' | 'signup' | 'forgot-password' | 'reset-password' | 'verify-email' | 'otp' | 'delete-account'

const route = useRoute()
const router = useRouter()
const routeLocale = computed(() => {
  const locale = route.params.locale
  if (typeof locale === 'string' && isSupportedWebLocale(locale)) return locale
  return resolvePreferredWebLocale(readLocalePreference(), navigator.languages)
})
const coreMessages = computed(() => authCoreMessages(routeLocale.value))

const accountType = ref<AuthAccountType>((route.query.plan === 'enterprise') ? 'enterprise' : 'individual')
const fullName = ref('')
const email = ref('')
const company = ref('')
const password = ref('')
const confirmPassword = ref('')
const resetPasswordValue = ref('')
const confirmResetPassword = ref('')
const rememberMe = ref(true)
const acceptTerms = ref(false)
const verificationCode = ref('')
const otpCode = ref('')
const deletePassword = ref('')
const deleteConfirmed = ref(false)
const verificationSent = ref(false)
const isSubmitting = ref(false)
const formMessage = ref('')
const formError = ref('')

const activeView = computed<AuthView>(() => {
  const value = route.params.view
  if (value === 'signup' || value === 'forgot-password' || value === 'reset-password' || value === 'verify-email' || value === 'otp' || value === 'delete-account') {
    return value
  }

  return 'login'
})

const routeEmail = computed(() => (
  typeof route.query.email === 'string' ? route.query.email : ''
))

watch(
  () => route.query.plan,
  (plan) => {
    if (plan === 'enterprise') {
      accountType.value = 'enterprise'
      return
    }

    accountType.value = 'individual'
  },
  { immediate: true }
)

watch(
  routeEmail,
  (value) => {
    if (value) {
      email.value = value
    }
  },
  { immediate: true }
)

watch(
  () => route.params.view,
  () => {
    formMessage.value = ''
    formError.value = ''
    verificationSent.value = false
  },
  { immediate: true }
)

watch(
  () => route.query.notice,
  (notice) => {
    if (typeof notice === 'string') formMessage.value = notice
  },
  { immediate: true }
)

function setAccountType(type: AuthAccountType) {
  accountType.value = type
  const query = {
    ...(type === 'enterprise' ? { plan: 'enterprise' } : {}),
    ...(typeof route.query.invitation === 'string' ? { invitation: route.query.invitation } : {})
  }
  router.replace({ path: localizedPath(routeLocale.value, `/auth/${activeView.value}`), query })
}

function setView(view: AuthView) {
  const query = {
    ...(accountType.value === 'enterprise' ? { plan: 'enterprise' } : {}),
    ...(typeof route.query.invitation === 'string' ? { invitation: route.query.invitation } : {})
  }
  router.push({ path: localizedPath(routeLocale.value, `/auth/${view}`), query })
}

async function handleResendCode() {
  formError.value = ''
  formMessage.value = ''
  isSubmitting.value = true

  try {
    const result = await resendVerificationCode(email.value)
    if (!result.success) {
      formError.value = result.message
      return
    }

    formMessage.value = result.message
  } finally {
    isSubmitting.value = false
  }
}

async function handleOtpFlow() {
  formError.value = ''
  formMessage.value = ''
  isSubmitting.value = true

  try {
    const result = await sendOtpCode(email.value)
    if (!result.success) {
      formError.value = result.message
      return
    }

    formMessage.value = result.message
    router.push({ path: localizedPath(routeLocale.value, '/auth/otp'), query: { email: email.value, plan: accountType.value === 'enterprise' ? 'enterprise' : undefined } })
  } finally {
    isSubmitting.value = false
  }
}

async function handleSubmit() {
  formError.value = ''
  formMessage.value = ''
  isSubmitting.value = true

  try {
    if (activeView.value === 'login') {
      const result = await loginUser({ email: email.value, password: password.value })
      if (!result.success) {
        formError.value = result.message
        return
      }

      formMessage.value = result.message
      const invitation = typeof route.query.invitation === 'string' ? route.query.invitation : ''
      router.push({
        path: localizedPath(routeLocale.value, '/dashboard'),
        query: invitation ? { invitation } : {}
      })
      return
    }

    if (activeView.value === 'signup') {
      if (!acceptTerms.value) {
        formError.value = coreMessages.value.acceptTermsError
        return
      }

      if (password.value !== confirmPassword.value) {
        formError.value = coreMessages.value.passwordsMismatch
        return
      }

      const result = await signupUser({
        fullName: fullName.value,
        email: email.value,
        company: company.value,
        accountType: accountType.value,
        password: password.value
      })

      if (!result.success) {
        formError.value = result.message
        return
      }

      formMessage.value = coreMessages.value.signupSuccess
      router.push({
        path: localizedPath(routeLocale.value, '/auth/verify-email'),
        query: {
          email: email.value,
          plan: accountType.value === 'enterprise' ? 'enterprise' : undefined,
          invitation: typeof route.query.invitation === 'string' ? route.query.invitation : undefined
        }
      })
      return
    }

    if (activeView.value === 'forgot-password') {
      const result = await requestPasswordReset(email.value)
      if (!result.success) {
        formError.value = result.message
        return
      }
      verificationSent.value = true
      formMessage.value = result.message
      return
    }

    if (activeView.value === 'reset-password') {
      if (resetPasswordValue.value !== confirmResetPassword.value) {
        formError.value = coreMessages.value.passwordsMismatch
        return
      }

      const token = typeof route.query.token === 'string' ? route.query.token : ''
      const result = await resetPassword(email.value, token, resetPasswordValue.value)
      if (!result.success) {
        formError.value = result.message
        return
      }

      formMessage.value = result.message
      router.push({
        path: localizedPath(routeLocale.value, '/auth/login'),
        query: typeof route.query.invitation === 'string' ? { invitation: route.query.invitation } : {}
      })
      return
    }

    if (activeView.value === 'verify-email') {
      const result = await verifyEmail(email.value, verificationCode.value)
      if (!result.success) {
        formError.value = result.message
        return
      }

      formMessage.value = result.message
      router.push({
        path: localizedPath(routeLocale.value, '/auth/login'),
        query: typeof route.query.invitation === 'string'
          ? { invitation: route.query.invitation }
          : {}
      })
    }

    if (activeView.value === 'otp') {
      const result = await verifyOtp(email.value, otpCode.value)
      if (!result.success) {
        formError.value = result.message
        return
      }

      formMessage.value = result.message
      router.push(localizedPath(routeLocale.value, '/dashboard'))
    }

    if (activeView.value === 'delete-account') {
      if (!deleteConfirmed.value) {
        formError.value = coreMessages.value.confirmDeleteWarning
        return
      }

      const result = await deleteAccount(email.value, deletePassword.value)
      if (!result.success) {
        formError.value = result.message
        return
      }

      formMessage.value = result.message
      router.push(localizedPath(routeLocale.value, '/auth/login'))
    }
  } finally {
    isSubmitting.value = false
  }
}

const activeTitle = computed(() => activeView.value === 'login'
  ? coreMessages.value.loginTitle
  : activeView.value === 'signup'
    ? coreMessages.value.signupTitle
    : activeView.value === 'forgot-password'
      ? coreMessages.value.forgotPasswordTitle
      : activeView.value === 'reset-password'
        ? coreMessages.value.resetPasswordTitle
        : activeView.value === 'verify-email'
          ? coreMessages.value.verifyEmailTitle
          : activeView.value === 'otp'
            ? coreMessages.value.otpTitle
            : coreMessages.value.deleteAccountTitle)
const activeSubtitle = computed(() => activeView.value === 'login'
  ? coreMessages.value.loginSubtitle
  : activeView.value === 'signup'
    ? coreMessages.value.signupSubtitle
    : activeView.value === 'forgot-password'
      ? coreMessages.value.forgotPasswordSubtitle
      : activeView.value === 'reset-password'
        ? coreMessages.value.resetPasswordSubtitle
        : activeView.value === 'verify-email'
          ? coreMessages.value.verifyEmailSubtitle
          : activeView.value === 'otp'
            ? coreMessages.value.otpSubtitle
            : coreMessages.value.deleteAccountSubtitle)
const activeEyebrow = computed(() => activeView.value === 'login'
  ? coreMessages.value.loginEyebrow
  : activeView.value === 'signup'
    ? coreMessages.value.signupEyebrow
    : activeView.value === 'forgot-password'
      ? coreMessages.value.secureRecovery
      : coreMessages.value.verifyIdentity)
</script>

<template>
  <Navbar />

  <AuthShell
    :eyebrow="activeEyebrow"
    :title="activeTitle"
    :subtitle="activeSubtitle"
  >
    <template #top>
      <div class="mode-switcher" :aria-label="coreMessages.modeSelector">
        <div class="mode-group">
          <button :class="{ active: activeView === 'login' }" @click="setView('login')" type="button">{{ coreMessages.logIn }}</button>
          <button :class="{ active: activeView === 'signup' }" @click="setView('signup')" type="button">{{ coreMessages.signUp }}</button>
        </div>
        <div class="account-type" :aria-label="coreMessages.accountTypeSelector">
          <button :class="{ active: accountType === 'individual' }" @click="setAccountType('individual')" type="button">{{ coreMessages.individual }}</button>
          <button :class="{ active: accountType === 'enterprise' }" @click="setAccountType('enterprise')" type="button">{{ coreMessages.enterprise }}</button>
        </div>
      </div>
    </template>

    <form v-if="activeView === 'login'" class="auth-form" @submit.prevent="handleSubmit">
      <div v-if="formError" class="alert error">{{ formError }}</div>
      <div v-if="formMessage" class="alert success">{{ formMessage }}</div>

      <AuthField v-model="email" :label="coreMessages.workEmail" type="email" :placeholder="coreMessages.workEmailPlaceholder" autocomplete="email" />
      <AuthField v-model="password" :label="coreMessages.password" type="password" :placeholder="coreMessages.enterPassword" autocomplete="current-password" :password-visibility-labels="{ show: coreMessages.showPassword, hide: coreMessages.hidePassword }" />

      <div class="row split">
        <label class="checkbox-row">
          <input v-model="rememberMe" type="checkbox" />
          <span>{{ coreMessages.rememberMe }}</span>
        </label>

        <button class="text-button" type="button" @click="setView('forgot-password')">{{ coreMessages.forgotPassword }}</button>
      </div>

      <button class="primary-button" type="submit" :disabled="isSubmitting">
        {{ isSubmitting ? coreMessages.signingIn : coreMessages.signInToDashboard }}
      </button>

      <div class="divider"><span>{{ coreMessages.orContinueWith }}</span></div>

      <button type="button" class="text-button" @click="handleOtpFlow">{{ coreMessages.emailCodeSignIn }}</button>
      <p class="helper-text">{{ coreMessages.ssoUnavailable }}</p>

      <p class="meta-copy">
        {{ coreMessages.teamAccessPrompt }} <button type="button" class="inline-link" @click="setView('signup')">{{ coreMessages.createEnterpriseWorkspace }}</button>
      </p>
    </form>

    <form v-else-if="activeView === 'signup'" class="auth-form" @submit.prevent="handleSubmit">
      <div v-if="formError" class="alert error">{{ formError }}</div>
      <div v-if="formMessage" class="alert success">{{ formMessage }}</div>

      <div class="row two-col">
        <AuthField v-model="fullName" :label="coreMessages.fullName" :placeholder="coreMessages.namePlaceholder" />
        <AuthField v-model="company" :label="coreMessages.company" :placeholder="coreMessages.companyPlaceholder" />
      </div>

      <AuthField v-model="email" :label="coreMessages.workEmail" type="email" :placeholder="coreMessages.emailPlaceholder" autocomplete="email" />

      <div class="row two-col">
        <AuthField v-model="password" :label="coreMessages.password" type="password" :placeholder="coreMessages.createPassword" autocomplete="new-password" :password-visibility-labels="{ show: coreMessages.showPassword, hide: coreMessages.hidePassword }" />
        <AuthField v-model="confirmPassword" :label="coreMessages.confirm" type="password" :placeholder="coreMessages.repeatPassword" autocomplete="new-password" :password-visibility-labels="{ show: coreMessages.showPassword, hide: coreMessages.hidePassword }" />
      </div>

      <div class="password-meta">
        <span>{{ coreMessages.passwordRequirements }}</span>
      </div>

      <label class="checkbox-row full-width">
        <input v-model="acceptTerms" type="checkbox" />
        <span>{{ coreMessages.acceptTerms }}</span>
      </label>

      <button class="primary-button" type="submit" :disabled="isSubmitting">
        {{ isSubmitting ? coreMessages.creatingAccount : accountType === 'enterprise' ? coreMessages.createEnterpriseAccount : coreMessages.createPersonalAccount }}
      </button>

    </form>

    <form v-else-if="activeView === 'forgot-password'" class="auth-form" @submit.prevent="handleSubmit">
      <div v-if="formError" class="alert error">{{ formError }}</div>
      <div v-if="formMessage" class="alert success">{{ formMessage }}</div>

      <AuthField v-model="email" :label="coreMessages.recoveryEmail" type="email" :placeholder="coreMessages.workEmailPlaceholder" autocomplete="email" />

      <p class="helper-text" v-if="!verificationSent">
        {{ coreMessages.recoveryInstructions }}
      </p>

      <div v-if="verificationSent" class="success-box">
        <strong>{{ coreMessages.resetLinkSent }}</strong>
        <p>{{ coreMessages.resetLinkInstructions }}</p>
      </div>

      <button class="primary-button" type="submit" :disabled="isSubmitting">
        {{ isSubmitting ? coreMessages.sending : verificationSent ? coreMessages.sendAgain : coreMessages.sendResetLink }}
      </button>

      <button class="text-button back-link" type="button" @click="setView('login')">{{ coreMessages.backToLogin }}</button>
    </form>

    <form v-else-if="activeView === 'reset-password'" class="auth-form" @submit.prevent="handleSubmit">
      <div v-if="formError" class="alert error">{{ formError }}</div>
      <div v-if="formMessage" class="alert success">{{ formMessage }}</div>

      <AuthField v-model="resetPasswordValue" :label="coreMessages.newPassword" type="password" :placeholder="coreMessages.createPassword" autocomplete="new-password" :password-visibility-labels="{ show: coreMessages.showPassword, hide: coreMessages.hidePassword }" />
      <AuthField v-model="confirmResetPassword" :label="coreMessages.confirmNewPassword" type="password" :placeholder="coreMessages.repeatPassword" autocomplete="new-password" :password-visibility-labels="{ show: coreMessages.showPassword, hide: coreMessages.hidePassword }" />
      <p class="password-meta">{{ coreMessages.passwordRequirements }}</p>

      <button class="primary-button" type="submit" :disabled="isSubmitting">
        {{ isSubmitting ? coreMessages.updatingPassword : coreMessages.setNewPassword }}
      </button>
      <button class="text-button back-link" type="button" @click="setView('login')">{{ coreMessages.backToLogin }}</button>
    </form>

    <form v-else-if="activeView === 'verify-email'" class="auth-form" @submit.prevent="handleSubmit">
      <div v-if="formError" class="alert error">{{ formError }}</div>
      <div v-if="formMessage" class="alert success">{{ formMessage }}</div>

      <AuthField v-model="verificationCode" :label="coreMessages.verificationCode" :placeholder="coreMessages.enterSixDigitCode" />

      <p class="helper-text">
        {{ coreMessages.verificationSentTo }} <strong>{{ email || coreMessages.yourInbox }}</strong>.
      </p>

      <button class="primary-button" type="submit" :disabled="isSubmitting">
        {{ isSubmitting ? coreMessages.verifying : coreMessages.verifyEmail }}
      </button>

      <div class="inline-actions">
        <button class="text-button" type="button" @click="handleResendCode">{{ coreMessages.resendCode }}</button>
        <button class="text-button" type="button" @click="setView('login')">{{ coreMessages.useAnotherEmail }}</button>
      </div>
    </form>

    <form v-else-if="activeView === 'otp'" class="auth-form" @submit.prevent="handleSubmit">
      <div v-if="formError" class="alert error">{{ formError }}</div>
      <div v-if="formMessage" class="alert success">{{ formMessage }}</div>

      <AuthField v-model="email" :label="coreMessages.emailAddress" type="email" :placeholder="coreMessages.workEmailPlaceholder" autocomplete="email" />
      <AuthField v-model="otpCode" :label="coreMessages.oneTimePassword" :placeholder="coreMessages.enterSixDigitOtp" />

      <button class="primary-button" type="submit" :disabled="isSubmitting">
        {{ isSubmitting ? coreMessages.checkingOtp : coreMessages.verifyOtp }}
      </button>

      <div class="inline-actions">
        <button class="text-button" type="button" @click="handleOtpFlow">{{ coreMessages.sendNewOtp }}</button>
        <button class="text-button" type="button" @click="setView('login')">{{ coreMessages.backToLogin }}</button>
      </div>
    </form>

    <form v-else class="auth-form" @submit.prevent="handleSubmit">
      <div v-if="formError" class="alert error">{{ formError }}</div>
      <div v-if="formMessage" class="alert success">{{ formMessage }}</div>

      <AuthField v-model="email" :label="coreMessages.accountEmail" type="email" :placeholder="coreMessages.workEmailPlaceholder" autocomplete="email" />
      <AuthField v-model="deletePassword" :label="coreMessages.confirmPassword" type="password" :placeholder="coreMessages.enterPassword" autocomplete="current-password" :password-visibility-labels="{ show: coreMessages.showPassword, hide: coreMessages.hidePassword }" />

      <label class="checkbox-row full-width warning-row">
        <input v-model="deleteConfirmed" type="checkbox" />
        <span>{{ coreMessages.confirmDeleteWarning }}</span>
      </label>

      <button class="danger-button" type="submit" :disabled="isSubmitting">
        {{ isSubmitting ? coreMessages.deletingAccount : coreMessages.deleteMyAccount }}
      </button>

      <button class="text-button back-link" type="button" @click="setView('login')">{{ coreMessages.keepMyAccount }}</button>
    </form>
  </AuthShell>
</template>

<style scoped>
.mode-switcher {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
  padding: var(--space-2);
  border-radius: var(--r-md);
  border: 1px solid var(--gray-4);
  background: var(--gray-1);
}

.mode-group,
.account-type {
  display: inline-flex;
  gap: var(--space-1);
  padding: var(--space-1);
  border-radius: var(--r-sm);
  background: var(--gray-2);
}

button {
  font: inherit;
}

.mode-group button,
.account-type button {
  border: none;
  border-radius: var(--r-xs);
  padding: var(--space-2) var(--space-3);
  background: transparent;
  color: var(--gray-8);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  transition: background var(--dur-1) var(--easing-product), color var(--dur-1) var(--easing-product), box-shadow var(--dur-1) var(--easing-product);
}

.mode-group button:focus-visible,
.account-type button:focus-visible,
.text-button:focus-visible,
.inline-link:focus-visible,
.primary-button:focus-visible,
.danger-button:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.mode-group button.active,
.account-type button.active {
  background: var(--gray-3);
  color: var(--gray-10);
  box-shadow: inset 0 -2px 0 var(--color-brand-amber-ui);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.row {
  display: flex;
  gap: var(--space-3);
}

.two-col > * {
  flex: 1;
}

.split {
  align-items: center;
  justify-content: space-between;
}

.checkbox-row {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--gray-8);
  font-size: var(--font-size-sm);
}

.checkbox-row input {
  accent-color: var(--color-brand-amber-ui);
}

.text-button,
.inline-link {
  border: none;
  background: transparent;
  padding: 0;
  color: var(--color-brand-amber-ui);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
}

.primary-button {
  width: 100%;
  border: 1px solid transparent;
  border-radius: var(--r-md);
  padding: var(--space-3) var(--space-4);
  background: var(--button-primary-bg);
  color: var(--button-primary-fg);
  font-weight: var(--font-weight-extrabold);
  cursor: pointer;
  box-shadow: none;
  transition: background var(--dur-1) var(--easing-product), transform var(--dur-1) var(--easing-product);
}

.primary-button:hover:not(:disabled) {
  background: var(--button-primary-hover-bg);
}

.primary-button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.danger-button {
  width: 100%;
  border: 1px solid var(--sev-critical-border);
  border-radius: var(--r-md);
  padding: var(--space-3) var(--space-4);
  background: var(--sev-critical-bg);
  color: var(--sev-critical-fg);
  font-weight: var(--font-weight-extrabold);
  cursor: pointer;
  box-shadow: none;
}

.danger-button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.divider {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  color: var(--gray-7);
  font-size: var(--font-size-xs);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--gray-4);
}

.sso-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-2);
}

.sso-button {
  padding: var(--space-3) var(--space-2);
  border: 1px solid var(--gray-5);
  border-radius: var(--r-md);
  background: var(--gray-2);
  color: var(--gray-10);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
}

.meta-copy,
.helper-text {
  color: var(--gray-8);
  line-height: var(--line-height-relaxed);
  font-size: var(--font-size-sm);
}

.password-meta {
  font-size: var(--font-size-xs);
  color: var(--gray-7);
  line-height: var(--line-height-normal);
}

.full-width {
  width: 100%;
}

.alert {
  padding: var(--space-3) var(--space-3);
  border-radius: var(--r-md);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-relaxed);
}

.alert.success {
  background: color-mix(in srgb, var(--color-success) var(--alpha-08), transparent);
  border: 1px solid color-mix(in srgb, var(--color-success) var(--alpha-20), transparent);
  color: var(--color-success);
}

.alert.error {
  background: color-mix(in srgb, var(--color-danger) var(--alpha-08), transparent);
  border: 1px solid color-mix(in srgb, var(--color-danger) var(--alpha-16), transparent);
  color: var(--color-danger);
}

.success-box {
  padding: var(--space-4) var(--space-4);
  border-radius: var(--r-md);
  border: 1px solid color-mix(in srgb, var(--color-success) var(--alpha-24), transparent);
  background: color-mix(in srgb, var(--color-success) var(--alpha-08), transparent);
}

.success-box strong {
  display: block;
  margin-bottom: var(--space-1);
}

.success-box p {
  margin: 0;
  color: var(--gray-8);
  line-height: var(--line-height-relaxed);
}

.back-link {
  align-self: center;
}

.inline-actions {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.inline-actions.compact {
  justify-content: flex-start;
}

.warning-row {
  padding: var(--space-2) var(--space-3);
  border-radius: var(--r-md);
  border: 1px solid color-mix(in srgb, var(--color-danger) var(--alpha-16), transparent);
  background: color-mix(in srgb, var(--color-danger) var(--alpha-04), transparent);
}

@media (max-width: 640px) {
  .row.two-col,
  .row.split {
    flex-direction: column;
    align-items: stretch;
  }

  .mode-switcher {
    flex-direction: column;
  }
}

[data-theme='light'] .mode-switcher {
  background: var(--gray-1);
  border-color: var(--gray-4);
}

[data-theme='light'] .mode-group,
[data-theme='light'] .account-type,
[data-theme='light'] .sso-button {
  background: var(--gray-2);
  border-color: var(--gray-4);
}

[data-theme='light'] .mode-group button,
[data-theme='light'] .account-type button {
  color: var(--gray-8);
}

[data-theme='light'] .mode-group button.active,
[data-theme='light'] .account-type button.active {
  color: var(--gray-10);
  background: var(--gray-3);
}

@media (prefers-reduced-motion: reduce) {
  .mode-group button,
  .account-type button,
  .primary-button {
    transition: none;
  }
}
</style>
