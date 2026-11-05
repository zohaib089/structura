import assert from 'node:assert/strict'
import test from 'node:test'
import Fastify from 'fastify'
import { AuthRateLimiter, registerAuthRateLimits, sendTooManyRequests } from './auth-rate-limit.js'

const GOOD_CODE = '123456'

function createApp(limiter: AuthRateLimiter) {
  const app = Fastify()
  registerAuthRateLimits(app, limiter)
  const otp = new Map<string, string | null>([['user@example.com', GOOD_CODE]])

  app.post('/api/auth/login', async (request, reply) => {
    const body = request.body as { email: string; password: string }
    if (body.password !== 'right') return reply.code(401).send({ success: false })
    limiter.clearAccount('/api/auth/login', body.email)
    return { success: true }
  })

  // Mirrors the OTP verify handler in index.ts.
  app.post('/api/auth/otp/verify', async (request, reply) => {
    const body = request.body as { email: string; code: string }
    const stored = otp.get(body.email)
    if (!stored) return reply.code(400).send({ success: false, message: 'expired' })
    if (body.code !== stored) {
      const failure = limiter.recordCodeFailure('otp', body.email)
      if (failure.locked) {
        otp.set(body.email, null)
        return sendTooManyRequests(reply, failure.retryAfterSeconds)
      }
      return reply.code(400).send({ success: false })
    }
    otp.set(body.email, null)
    limiter.clearCodeFailures('otp', body.email)
    return { success: true }
  })

  app.post('/api/auth/unthrottled', async () => ({ success: true }))
  return { app, otp }
}

function post(app: ReturnType<typeof Fastify>, url: string, payload: object, ip = '10.0.0.1') {
  return app.inject({ method: 'POST', url, payload, remoteAddress: ip })
}

test('login is throttled per account with 429 and Retry-After', async () => {
  const { app } = createApp(new AuthRateLimiter({ maxPerAccount: 3, maxPerIp: 100 }))
  for (let index = 0; index < 3; index += 1) {
    const response = await post(app, '/api/auth/login', { email: 'user@example.com', password: 'wrong' }, `10.0.0.${index}`)
    assert.equal(response.statusCode, 401)
  }
  const blocked = await post(app, '/api/auth/login', { email: 'user@example.com', password: 'right' }, '10.0.0.99')
  assert.equal(blocked.statusCode, 429)
  const retryAfter = Number(blocked.headers['retry-after'])
  assert.ok(retryAfter > 0 && retryAfter <= 15 * 60)

  const otherAccount = await post(app, '/api/auth/login', { email: 'other@example.com', password: 'right' }, '10.0.0.99')
  assert.equal(otherAccount.statusCode, 200)
})

test('login is throttled per IP across accounts', async () => {
  const { app } = createApp(new AuthRateLimiter({ maxPerIp: 2, maxPerAccount: 100 }))
  assert.equal((await post(app, '/api/auth/login', { email: 'a@x.io', password: 'wrong' })).statusCode, 401)
  assert.equal((await post(app, '/api/auth/login', { email: 'b@x.io', password: 'wrong' })).statusCode, 401)
  const blocked = await post(app, '/api/auth/login', { email: 'c@x.io', password: 'right' })
  assert.equal(blocked.statusCode, 429)
  assert.ok(blocked.headers['retry-after'])
  assert.equal((await post(app, '/api/auth/login', { email: 'c@x.io', password: 'right' }, '10.9.9.9')).statusCode, 200)
})

test('throttle window expires', async () => {
  let now = 1_000_000
  const { app } = createApp(new AuthRateLimiter({ maxPerAccount: 1, windowMs: 60_000 }, () => now))
  await post(app, '/api/auth/login', { email: 'user@example.com', password: 'wrong' })
  assert.equal((await post(app, '/api/auth/login', { email: 'user@example.com', password: 'right' })).statusCode, 429)
  now += 60_001
  assert.equal((await post(app, '/api/auth/login', { email: 'user@example.com', password: 'right' })).statusCode, 200)
})

test('OTP is invalidated and locked after N failures, even if a new code is issued', async () => {
  let now = 5_000_000
  const limiter = new AuthRateLimiter({ maxCodeFailures: 3, codeLockoutMs: 600_000, maxPerAccount: 100 }, () => now)
  const { app, otp } = createApp(limiter)
  assert.equal((await post(app, '/api/auth/otp/verify', { email: 'user@example.com', code: '000000' })).statusCode, 400)
  assert.equal((await post(app, '/api/auth/otp/verify', { email: 'user@example.com', code: '000001' })).statusCode, 400)
  const locked = await post(app, '/api/auth/otp/verify', { email: 'user@example.com', code: '000002' })
  assert.equal(locked.statusCode, 429)
  assert.equal(locked.headers['retry-after'], '600')
  assert.equal(otp.get('user@example.com'), null, 'OTP burned on lockout')

  otp.set('user@example.com', GOOD_CODE)
  const stillLocked = await post(app, '/api/auth/otp/verify', { email: 'user@example.com', code: GOOD_CODE }, '10.1.1.1')
  assert.equal(stillLocked.statusCode, 429)
  assert.ok(Number(stillLocked.headers['retry-after']) > 0)

  now += 600_001
  assert.equal((await post(app, '/api/auth/otp/verify', { email: 'user@example.com', code: GOOD_CODE })).statusCode, 200)
})

test('successful OTP clears earlier failures', async () => {
  const limiter = new AuthRateLimiter({ maxCodeFailures: 3, maxPerAccount: 100 })
  const { app, otp } = createApp(limiter)
  await post(app, '/api/auth/otp/verify', { email: 'user@example.com', code: '000000' })
  await post(app, '/api/auth/otp/verify', { email: 'user@example.com', code: '000001' })
  assert.equal((await post(app, '/api/auth/otp/verify', { email: 'user@example.com', code: GOOD_CODE })).statusCode, 200)

  otp.set('user@example.com', GOOD_CODE)
  assert.equal((await post(app, '/api/auth/otp/verify', { email: 'user@example.com', code: '000000' })).statusCode, 400)
  assert.equal((await post(app, '/api/auth/otp/verify', { email: 'user@example.com', code: '000001' })).statusCode, 400)
  assert.equal((await post(app, '/api/auth/otp/verify', { email: 'user@example.com', code: GOOD_CODE })).statusCode, 200)
})

test('normal success path and non-auth routes are unaffected', async () => {
  const { app } = createApp(new AuthRateLimiter())
  assert.equal((await post(app, '/api/auth/login', { email: 'user@example.com', password: 'right' })).statusCode, 200)
  assert.equal((await post(app, '/api/auth/otp/verify', { email: 'user@example.com', code: GOOD_CODE })).statusCode, 200)
  for (let index = 0; index < 50; index += 1) {
    assert.equal((await post(app, '/api/auth/unthrottled', {})).statusCode, 200)
  }
})

test('emails are normalized so case changes do not bypass the account limit', async () => {
  const { app } = createApp(new AuthRateLimiter({ maxPerAccount: 1, maxPerIp: 100 }))
  await post(app, '/api/auth/login', { email: 'user@example.com', password: 'wrong' })
  assert.equal((await post(app, '/api/auth/login', { email: ' USER@Example.com ', password: 'right' }, '10.2.2.2')).statusCode, 429)
})
