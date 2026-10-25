import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loginUser, signupUser } from '../../src/services/auth'

describe('auth service', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('posts signup details to the API without storing them in the browser', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, message: 'Check your inbox.' })
    } as Response)

    const result = await signupUser({
      fullName: 'Taylor Engineer',
      email: 'taylor@example.test',
      company: 'Example',
      accountType: 'individual',
      password: 'StrongPassword1!'
    })

    expect(result.success).toBe(true)
    expect(fetch).toHaveBeenCalledWith('/api/auth/signup', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"email":"taylor@example.test"')
    }))
    expect(localStorage.length).toBe(0)
  })

  it('stores only returned session data after successful login', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Login successful.',
        token: 'session-token',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        user: {
          id: 'user-1',
          fullName: 'Taylor Engineer',
          email: 'taylor@example.test',
          company: 'Example',
          accountType: 'individual',
          verified: true,
          createdAt: new Date().toISOString()
        }
      })
    } as Response)

    const result = await loginUser({ email: 'taylor@example.test', password: 'StrongPassword1!' })

    expect(result.success).toBe(true)
    expect(localStorage.length).toBe(1)
    expect(localStorage.getItem('structura-auth-session-v2')).toContain('session-token')
    expect(localStorage.getItem('structura-auth-session-v2')).not.toContain('StrongPassword1!')
  })
})
