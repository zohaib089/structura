import { BRAND, readMigrated, storageKey } from '../../../../packages/brand/src/brand'

export type AuthAccountType = 'individual' | 'enterprise'

export interface AuthUser {
  id: string
  fullName: string
  email: string
  company: string
  accountType: AuthAccountType
  verified: boolean
  createdAt: string
}

export interface AuthSession {
  user: AuthUser
  token: string
  expiresAt: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface SignupRequest {
  fullName: string
  email: string
  company: string
  accountType: AuthAccountType
  password: string
}

export interface AuthResponse {
  success: boolean
  message: string
  user?: AuthUser
  token?: string
  expiresAt?: string
}

const SESSION_SUFFIX = 'auth-session-v2'
const SESSION_KEY = storageKey(SESSION_SUFFIX)

for (const suffix of ['auth-session', 'auth-users', 'auth-verification', 'auth-reset']) {
  localStorage.removeItem(`${BRAND.legacySlug}-${suffix}`)
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem(`${BRAND.legacySlug}-${SESSION_SUFFIX}`)
}

async function request(
  path: string,
  payload: object
): Promise<AuthResponse> {
  try {
    const response = await fetch(`/api/auth/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const result = await response.json() as AuthResponse

    if (!response.ok) {
      return { success: false, message: result.message ?? 'Authentication request failed.' }
    }

    return result
  } catch {
    return { success: false, message: 'Unable to reach the authentication service. Please try again.' }
  }
}

function saveSession(result: AuthResponse) {
  if (!result.user || !result.token || !result.expiresAt) return

  const session: AuthSession = {
    user: result.user,
    token: result.token,
    expiresAt: result.expiresAt
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export async function signupUser(payload: SignupRequest): Promise<AuthResponse> {
  return request('signup', payload)
}

export async function loginUser(payload: LoginRequest): Promise<AuthResponse> {
  const result = await request('login', payload)
  saveSession(result)
  return result
}

export async function requestPasswordReset(email: string): Promise<AuthResponse> {
  return request('forgot-password', { email })
}

export async function resetPassword(email: string, token: string, password: string): Promise<AuthResponse> {
  return request('reset-password', { email, token, password })
}

export async function verifyEmail(email: string, code: string): Promise<AuthResponse> {
  return request('verify-email', { email, code })
}

export async function resendVerificationCode(email: string): Promise<AuthResponse> {
  return request('resend-verification', { email })
}

export async function sendOtpCode(email: string): Promise<AuthResponse> {
  return request('otp/send', { email })
}

export async function verifyOtp(email: string, code: string): Promise<AuthResponse> {
  const result = await request('otp/verify', { email, code })
  saveSession(result)
  return result
}

export async function deleteAccount(email: string, password: string): Promise<AuthResponse> {
  const result = await request('delete-account', { email, password })
  if (result.success) clearSession()
  return result
}

export function getCurrentSession(): AuthSession | null {
  const raw = readMigrated(SESSION_SUFFIX)
  if (!raw) return null

  try {
    const session = JSON.parse(raw) as AuthSession
    if (Date.parse(session.expiresAt) <= Date.now()) {
      clearSession()
      return null
    }
    return session
  } catch {
    clearSession()
    return null
  }
}

export async function logoutUser(): Promise<AuthResponse> {
  const session = getCurrentSession()
  if (!session) return { success: true, message: 'Signed out successfully.' }

  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.token}` }
    })
    const result = await response.json() as AuthResponse
    clearSession()
    return response.ok
      ? result
      : { success: false, message: result.message ?? 'The session could not be revoked.' }
  } catch {
    clearSession()
    return { success: false, message: 'Signed out locally, but the server could not be reached to revoke the session.' }
  }
}
