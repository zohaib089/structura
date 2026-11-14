import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'
import Fastify from 'fastify'
import { registerAuthRoutes, type AuthQuery, type AuthQueryResult } from './auth-routes.js'
import { AuthRateLimiter, registerAuthRateLimits } from '../services/auth-rate-limit.js'

interface StoredUser {
  id: string
  full_name: string
  email: string
  company: string
  account_type: 'individual' | 'enterprise'
  password: string
  verified: boolean
  verification_code: string | null
  verification_expires_at: Date | null
  otp_code: string | null
  otp_expires_at: Date | null
  reset_token: string | null
  reset_expires_at: Date | null
  created_at: string
}

function digest(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function rows<T>(items: T[]): AuthQueryResult<T & Record<string, unknown>> {
  return { rows: items as Array<T & Record<string, unknown>>, rowCount: items.length }
}

function empty(): AuthQueryResult {
  return { rows: [], rowCount: 0 }
}

function future(minutes = 15) {
  return new Date(Date.now() + minutes * 60 * 1000)
}

function createAuthApi(options: { emailFails?: boolean } = {}) {
  const users = new Map<string, StoredUser>()
  const usersById = new Map<string, StoredUser>()
  const sessions = new Map<string, { user_id: string }>()
  const ownedWorkspaces = new Set<string>()
  const delivered: Array<{ to: string; subject: string; text: string }> = []
  let emailFails = Boolean(options.emailFails)

  const query = (async (text, params: unknown[] = []) => {
    if (text.startsWith('SELECT id FROM users WHERE email = $1')) {
      const user = users.get(String(params[0]))
      return user ? rows([{ id: user.id }]) : empty()
    }
    if (text.startsWith('SELECT * FROM users WHERE email = $1 AND reset_token = $2 AND reset_expires_at > NOW()')) {
      const user = users.get(String(params[0]))
      if (!user || user.reset_token !== params[1] || !user.reset_expires_at || user.reset_expires_at <= new Date()) {
        return empty()
      }
      return rows([user])
    }
    if (text.startsWith('SELECT * FROM users WHERE email = $1')) {
      const user = users.get(String(params[0]))
      return user ? rows([user]) : empty()
    }
    if (text.startsWith('INSERT INTO users')) {
      const user: StoredUser = {
        id: String(params[0]),
        full_name: String(params[1]),
        email: String(params[2]),
        company: String(params[3]),
        account_type: params[4] as StoredUser['account_type'],
        password: String(params[5]),
        verified: false,
        verification_code: String(params[6]),
        verification_expires_at: future(15),
        otp_code: null,
        otp_expires_at: null,
        reset_token: null,
        reset_expires_at: null,
        created_at: '2026-11-11T00:00:00.000Z'
      }
      users.set(user.email, user)
      usersById.set(user.id, user)
      return rows([user])
    }
    if (text.startsWith('UPDATE users SET password = $1 WHERE id = $2')) {
      const user = usersById.get(String(params[1]))
      if (user) user.password = String(params[0])
      return user ? rows([user]) : empty()
    }
    if (text.startsWith('UPDATE users SET reset_token = $1, reset_expires_at = NOW() + INTERVAL')) {
      const user = usersById.get(String(params[1]))
      if (user) {
        user.reset_token = String(params[0])
        user.reset_expires_at = future(30)
      }
      return user ? rows([user]) : empty()
    }
    if (text.startsWith('UPDATE users SET password = $1, reset_token = NULL, reset_expires_at = NULL')) {
      const user = usersById.get(String(params[1]))
      if (user) {
        user.password = String(params[0])
        user.reset_token = null
        user.reset_expires_at = null
      }
      return user ? rows([user]) : empty()
    }
    if (text.startsWith('UPDATE users SET verification_code = NULL, verification_expires_at = NULL')) {
      const user = usersById.get(String(params[0]))
      if (user) {
        user.verification_code = null
        user.verification_expires_at = null
      }
      return user ? rows([user]) : empty()
    }
    if (text.startsWith('UPDATE users SET verified = true, verification_code = NULL, verification_expires_at = NULL')) {
      const user = usersById.get(String(params[0]))
      if (user) {
        user.verified = true
        user.verification_code = null
        user.verification_expires_at = null
      }
      return user ? rows([user]) : empty()
    }
    if (text.startsWith('UPDATE users SET verification_code = $1, verification_expires_at = NOW()')) {
      const user = usersById.get(String(params[1]))
      if (user) {
        user.verification_code = String(params[0])
        user.verification_expires_at = future(15)
      }
      return user ? rows([user]) : empty()
    }
    if (text.startsWith('UPDATE users SET otp_code = $1, otp_expires_at = NOW()')) {
      const user = usersById.get(String(params[1]))
      if (user) {
        user.otp_code = String(params[0])
        user.otp_expires_at = future(10)
      }
      return user ? rows([user]) : empty()
    }
    if (text.startsWith('UPDATE users SET otp_code = NULL, otp_expires_at = NULL')) {
      const user = usersById.get(String(params[0]))
      if (user) {
        user.otp_code = null
        user.otp_expires_at = null
      }
      return user ? rows([user]) : empty()
    }
    if (text.startsWith('INSERT INTO auth_sessions')) {
      sessions.set(String(params[0]), { user_id: String(params[1]) })
      return rows([{ token_hash: params[0] }])
    }
    if (text.startsWith('DELETE FROM auth_sessions WHERE token_hash = $1 AND expires_at > NOW()')) {
      const existed = sessions.delete(String(params[0]))
      return { rows: [], rowCount: existed ? 1 : 0 }
    }
    if (text.startsWith('DELETE FROM auth_sessions WHERE user_id = $1')) {
      let count = 0
      for (const [hash, session] of sessions) {
        if (session.user_id === params[0]) {
          sessions.delete(hash)
          count += 1
        }
      }
      return { rows: [], rowCount: count }
    }
    if (text.startsWith('SELECT id FROM workspaces WHERE created_by = $1')) {
      return ownedWorkspaces.has(String(params[0])) ? rows([{ id: 'workspace-1' }]) : empty()
    }
    if (text.startsWith('DELETE FROM users WHERE id = $1')) {
      const user = usersById.get(String(params[0]))
      if (!user) return empty()
      users.delete(user.email)
      usersById.delete(user.id)
      return rows([user])
    }
    return empty()
  }) as AuthQuery

  function addUser(partial: Partial<StoredUser> & Pick<StoredUser, 'email' | 'password'>) {
    const user: StoredUser = {
      id: partial.id ?? `user-${users.size + 1}`,
      full_name: partial.full_name ?? 'Ada Lovelace',
      email: partial.email,
      company: partial.company ?? 'Analytical Engines',
      account_type: partial.account_type ?? 'individual',
      password: partial.password,
      verified: partial.verified ?? true,
      verification_code: partial.verification_code ?? null,
      verification_expires_at: partial.verification_expires_at ?? null,
      otp_code: partial.otp_code ?? null,
      otp_expires_at: partial.otp_expires_at ?? null,
      reset_token: partial.reset_token ?? null,
      reset_expires_at: partial.reset_expires_at ?? null,
      created_at: partial.created_at ?? '2026-11-11T00:00:00.000Z'
    }
    users.set(user.email, user)
    usersById.set(user.id, user)
    return user
  }

  const authRateLimiter = new AuthRateLimiter()
  const app = Fastify()
  registerAuthRateLimits(app, authRateLimiter)
  registerAuthRoutes(app, {
    query,
    frontendUrl: 'http://frontend.test',
    authRateLimiter,
    sendAuthEmail: async (to, template) => {
      if (emailFails) throw new Error('smtp unavailable')
      delivered.push({ to, subject: template.subject, text: template.text })
    }
  })

  return {
    app,
    users,
    usersById,
    sessions,
    ownedWorkspaces,
    delivered,
    addUser,
    setEmailFails(value: boolean) {
      emailFails = value
    }
  }
}

const validPassword = 'correct-horse-1!'
const strongReplacement = 'correct-horse-2!'

test('status reports the database auth surface', async () => {
  const api = createAuthApi()
  try {
    const response = await api.app.inject({ method: 'GET', url: '/api/auth/status' })
    assert.equal(response.statusCode, 200)
    assert.equal(response.json().auth.mode, 'database')
    assert.deepEqual(response.json().auth.supports, [
      'login',
      'signup',
      'reset',
      'verify-email',
      'otp',
      'delete-account'
    ])
  } finally {
    await api.app.close()
  }
})

test('signup validates input, rejects duplicates, and creates an unverified account', async () => {
  const api = createAuthApi()
  try {
    const missing = await api.app.inject({ method: 'POST', url: '/api/auth/signup', payload: {} })
    assert.equal(missing.statusCode, 400)

    const weak = await api.app.inject({
      method: 'POST',
      url: '/api/auth/signup',
      payload: {
        fullName: 'Ada Lovelace',
        email: 'ada@example.test',
        company: 'Analytical Engines',
        password: 'short'
      }
    })
    assert.equal(weak.statusCode, 400)
    assert.match(weak.json().message, /at least 12 characters/)

    const invalidType = await api.app.inject({
      method: 'POST',
      url: '/api/auth/signup',
      payload: {
        fullName: 'Ada Lovelace',
        email: 'ada@example.test',
        company: 'Analytical Engines',
        accountType: 'admin',
        password: validPassword
      }
    })
    assert.equal(invalidType.statusCode, 400)

    api.addUser({ email: 'ada@example.test', password: validPassword })
    const duplicate = await api.app.inject({
      method: 'POST',
      url: '/api/auth/signup',
      payload: {
        fullName: 'Ada Lovelace',
        email: 'ada@example.test',
        company: 'Analytical Engines',
        password: validPassword
      }
    })
    assert.equal(duplicate.statusCode, 409)

    const created = await api.app.inject({
      method: 'POST',
      url: '/api/auth/signup',
      payload: {
        fullName: '  Grace Hopper  ',
        email: 'Grace.Hopper@example.test',
        company: 'COBOL',
        password: validPassword
      }
    })
    assert.equal(created.statusCode, 201)
    assert.equal(created.json().success, true)
    assert.equal(created.json().user.email, 'grace.hopper@example.test')
    assert.equal(created.json().user.verified, false)
    assert.equal(created.json().user.fullName, 'Grace Hopper')
    assert.equal(api.delivered.length, 1)
    assert.match(api.delivered[0].text, /verification code is \d{6}/)
  } finally {
    await api.app.close()
  }
})

test('signup returns 503 when verification email delivery fails after create', async () => {
  const api = createAuthApi({ emailFails: true })
  try {
    const response = await api.app.inject({
      method: 'POST',
      url: '/api/auth/signup',
      payload: {
        fullName: 'Grace Hopper',
        email: 'grace@example.test',
        company: 'COBOL',
        password: validPassword
      }
    })
    assert.equal(response.statusCode, 503)
    assert.match(response.json().message, /verification email delivery failed/)
    assert.equal(api.users.has('grace@example.test'), true)
  } finally {
    await api.app.close()
  }
})

test('login validates credentials and issues a session for verified users', async () => {
  const api = createAuthApi()
  try {
    const missing = await api.app.inject({ method: 'POST', url: '/api/auth/login', payload: {} })
    assert.equal(missing.statusCode, 400)

    const unknown = await api.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'missing@example.test', password: validPassword }
    })
    assert.equal(unknown.statusCode, 401)

    api.addUser({ email: 'unverified@example.test', password: validPassword, verified: false })
    const unverified = await api.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'unverified@example.test', password: validPassword }
    })
    assert.equal(unverified.statusCode, 403)

    api.addUser({ email: 'ada@example.test', password: validPassword, verified: true })
    const wrong = await api.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'ada@example.test', password: 'wrong-password-1!' }
    })
    assert.equal(wrong.statusCode, 401)

    const success = await api.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'Ada@example.test', password: validPassword }
    })
    assert.equal(success.statusCode, 200)
    assert.equal(success.json().success, true)
    assert.equal(typeof success.json().token, 'string')
    assert.equal(success.json().user.email, 'ada@example.test')
    assert.equal(api.sessions.size, 1)
  } finally {
    await api.app.close()
  }
})

test('forgot-password does not leak accounts and emails a reset link when one exists', async () => {
  const api = createAuthApi()
  try {
    const invalid = await api.app.inject({
      method: 'POST',
      url: '/api/auth/forgot-password',
      payload: { email: 'not-an-email' }
    })
    assert.equal(invalid.statusCode, 400)

    const unknown = await api.app.inject({
      method: 'POST',
      url: '/api/auth/forgot-password',
      payload: { email: 'missing@example.test' }
    })
    assert.equal(unknown.statusCode, 200)
    assert.match(unknown.json().message, /If an account exists/)
    assert.equal(api.delivered.length, 0)

    api.addUser({ email: 'ada@example.test', password: validPassword })
    const sent = await api.app.inject({
      method: 'POST',
      url: '/api/auth/forgot-password',
      payload: { email: 'ada@example.test' }
    })
    assert.equal(sent.statusCode, 200)
    assert.equal(api.delivered.length, 1)
    assert.match(api.delivered[0].text, /http:\/\/frontend\.test\/auth\/reset-password/)
    assert.match(api.delivered[0].text, /token=/)

    api.setEmailFails(true)
    const failed = await api.app.inject({
      method: 'POST',
      url: '/api/auth/forgot-password',
      payload: { email: 'ada@example.test' }
    })
    assert.equal(failed.statusCode, 503)
  } finally {
    await api.app.close()
  }
})

test('reset-password validates the token and replaces the password', async () => {
  const api = createAuthApi()
  try {
    const missing = await api.app.inject({ method: 'POST', url: '/api/auth/reset-password', payload: {} })
    assert.equal(missing.statusCode, 400)

    const weak = await api.app.inject({
      method: 'POST',
      url: '/api/auth/reset-password',
      payload: { email: 'ada@example.test', token: 'token', password: 'short' }
    })
    assert.equal(weak.statusCode, 400)

    const expired = await api.app.inject({
      method: 'POST',
      url: '/api/auth/reset-password',
      payload: { email: 'ada@example.test', token: 'missing-token', password: strongReplacement }
    })
    assert.equal(expired.statusCode, 400)
    assert.match(expired.json().message, /invalid or expired/)

    const user = api.addUser({
      email: 'ada@example.test',
      password: validPassword,
      reset_token: digest('reset-token'),
      reset_expires_at: future(30)
    })
    api.sessions.set('old-session', { user_id: user.id })
    const success = await api.app.inject({
      method: 'POST',
      url: '/api/auth/reset-password',
      payload: { email: 'ada@example.test', token: 'reset-token', password: strongReplacement }
    })
    assert.equal(success.statusCode, 200)
    assert.equal(user.reset_token, null)
    assert.match(user.password, /^scrypt\$/)
    assert.equal(api.sessions.size, 0)

    const login = await api.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'ada@example.test', password: strongReplacement }
    })
    assert.equal(login.statusCode, 200)
  } finally {
    await api.app.close()
  }
})

test('verify-email and resend-verification cover invalid, mismatch, and success paths', async () => {
  const api = createAuthApi()
  try {
    const missing = await api.app.inject({ method: 'POST', url: '/api/auth/verify-email', payload: {} })
    assert.equal(missing.statusCode, 400)

    const unknown = await api.app.inject({
      method: 'POST',
      url: '/api/auth/verify-email',
      payload: { email: 'missing@example.test', code: '123456' }
    })
    assert.equal(unknown.statusCode, 400)

    const user = api.addUser({
      email: 'ada@example.test',
      password: validPassword,
      verified: false,
      verification_code: digest('654321'),
      verification_expires_at: future(15)
    })

    const wrong = await api.app.inject({
      method: 'POST',
      url: '/api/auth/verify-email',
      payload: { email: 'ada@example.test', code: '000000' }
    })
    assert.equal(wrong.statusCode, 400)
    assert.equal(wrong.json().message, 'The verification code is incorrect.')

    const success = await api.app.inject({
      method: 'POST',
      url: '/api/auth/verify-email',
      payload: { email: 'ada@example.test', code: '654321' }
    })
    assert.equal(success.statusCode, 200)
    assert.equal(user.verified, true)
    assert.equal(user.verification_code, null)

    const alreadyVerified = await api.app.inject({
      method: 'POST',
      url: '/api/auth/resend-verification',
      payload: { email: 'ada@example.test' }
    })
    assert.equal(alreadyVerified.statusCode, 404)

    const missingEmail = await api.app.inject({
      method: 'POST',
      url: '/api/auth/resend-verification',
      payload: {}
    })
    assert.equal(missingEmail.statusCode, 400)

    api.addUser({
      id: 'pending-1',
      email: 'pending@example.test',
      password: validPassword,
      verified: false,
      verification_code: digest('111111'),
      verification_expires_at: future(1)
    })
    const resent = await api.app.inject({
      method: 'POST',
      url: '/api/auth/resend-verification',
      payload: { email: 'pending@example.test' }
    })
    assert.equal(resent.statusCode, 200)
    assert.equal(api.delivered.length, 1)
    assert.match(api.delivered[0].text, /verification code is \d{6}/)
  } finally {
    await api.app.close()
  }
})

test('OTP send and verify issue a session for a verified account', async () => {
  const api = createAuthApi()
  try {
    const missing = await api.app.inject({ method: 'POST', url: '/api/auth/otp/send', payload: {} })
    assert.equal(missing.statusCode, 400)

    const unknown = await api.app.inject({
      method: 'POST',
      url: '/api/auth/otp/send',
      payload: { email: 'missing@example.test' }
    })
    assert.equal(unknown.statusCode, 404)

    api.addUser({
      email: 'ada@example.test',
      password: validPassword,
      verified: true
    })
    const sent = await api.app.inject({
      method: 'POST',
      url: '/api/auth/otp/send',
      payload: { email: 'ada@example.test' }
    })
    assert.equal(sent.statusCode, 200)
    const match = api.delivered[0].text.match(/sign-in code is (\d{6})/)
    assert.ok(match)
    const code = match[1]

    const missingCode = await api.app.inject({
      method: 'POST',
      url: '/api/auth/otp/verify',
      payload: { email: 'ada@example.test' }
    })
    assert.equal(missingCode.statusCode, 400)

    const wrong = await api.app.inject({
      method: 'POST',
      url: '/api/auth/otp/verify',
      payload: { email: 'ada@example.test', code: '000000' }
    })
    assert.equal(wrong.statusCode, 400)

    const success = await api.app.inject({
      method: 'POST',
      url: '/api/auth/otp/verify',
      payload: { email: 'ada@example.test', code }
    })
    assert.equal(success.statusCode, 200)
    assert.equal(success.json().success, true)
    assert.equal(typeof success.json().token, 'string')
    assert.equal(api.sessions.size, 1)
    assert.equal(api.users.get('ada@example.test')?.otp_code, null)
  } finally {
    await api.app.close()
  }
})

test('logout requires a live session token', async () => {
  const api = createAuthApi()
  try {
    const missing = await api.app.inject({ method: 'POST', url: '/api/auth/logout' })
    assert.equal(missing.statusCode, 401)
    assert.equal(missing.json().message, 'An active session is required.')

    const invalid = await api.app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { authorization: 'Bearer missing' }
    })
    assert.equal(invalid.statusCode, 401)

    api.addUser({ email: 'ada@example.test', password: validPassword })
    const login = await api.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'ada@example.test', password: validPassword }
    })
    const token = login.json().token as string
    const success = await api.app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { authorization: `Bearer ${token}` }
    })
    assert.equal(success.statusCode, 200)
    assert.equal(api.sessions.size, 0)
  } finally {
    await api.app.close()
  }
})

test('delete-account checks credentials and owned workspaces', async () => {
  const api = createAuthApi()
  try {
    const missing = await api.app.inject({ method: 'POST', url: '/api/auth/delete-account', payload: {} })
    assert.equal(missing.statusCode, 400)

    const unknown = await api.app.inject({
      method: 'POST',
      url: '/api/auth/delete-account',
      payload: { email: 'missing@example.test', password: validPassword }
    })
    assert.equal(unknown.statusCode, 401)

    const owner = api.addUser({ email: 'owner@example.test', password: validPassword })
    api.ownedWorkspaces.add(owner.id)
    const blocked = await api.app.inject({
      method: 'POST',
      url: '/api/auth/delete-account',
      payload: { email: 'owner@example.test', password: validPassword }
    })
    assert.equal(blocked.statusCode, 409)

    api.addUser({ email: 'ada@example.test', password: validPassword })
    const success = await api.app.inject({
      method: 'POST',
      url: '/api/auth/delete-account',
      payload: { email: 'ada@example.test', password: validPassword }
    })
    assert.equal(success.statusCode, 200)
    assert.equal(api.users.has('ada@example.test'), false)
  } finally {
    await api.app.close()
  }
})
