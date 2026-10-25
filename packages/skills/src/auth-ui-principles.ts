/**
 * Skill: Auth UI Principles
 * Reusable guidance for implementing secure, accessible auth experiences.
 */

export interface AuthUiPrinciplesInput {
  flow: 'login' | 'signup' | 'forgot-password' | 'verify-email' | 'otp' | 'delete-account'
  accountType?: 'individual' | 'enterprise'
}

export interface AuthUiPrinciplesOutput {
  success: boolean
  message: string
  guidance: string[]
}

export function authUiPrinciples(input: AuthUiPrinciplesInput): AuthUiPrinciplesOutput {
  const accountType = input.accountType ?? 'individual'

  const guidance = [
    'Keep the auth shell reusable and separate from the route state.',
    'Use a single source of truth for the active auth flow and account type.',
    'Support both individual and enterprise onboarding without duplicating screens.',
    'Include SSO, password recovery, OTP, deletion, and verification states in the same design language.',
    'Maintain light and dark theme accessibility for every field, control, and state message.',
    'Provide explicit resend actions for email and OTP delivery to reduce user friction.',
    'Center the auth card in a full-height page container so the experience feels balanced and premium.'
  ]

  if (input.flow === 'signup' && accountType === 'enterprise') {
    guidance.unshift('Show enterprise-specific information such as workspace size, SSO, and admin onboarding guidance.')
  }

  if (input.flow === 'forgot-password') {
    guidance.push('Provide a clear recovery CTA and a confirmation state that reassures the user action succeeded.')
  }

  if (input.flow === 'verify-email') {
    guidance.push('Keep the verification code input focusable and aligned with the email address shown to the user.')
  }

  if (input.flow === 'otp') {
    guidance.push('Use a focused OTP entry state with a clearly labeled resend action and a minimal, time-sensitive microcopy.')
  }

  if (input.flow === 'delete-account') {
    guidance.push('Use a strong confirmation pattern with a warning highlight and explicit copy before performing a destructive action.')
  }

  return {
    success: true,
    message: 'Auth UI principles reviewed successfully',
    guidance
  }
}
