import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

/**
 * In-memory throttling and code lockout for auth endpoints.
 *
 * State is per process. Run a single API instance, or swap the store for a
 * shared one (e.g. Postgres/Redis) before scaling out horizontally.
 */

export interface AuthRateLimitOptions {
  /** Fixed window length for attempt counting. */
  windowMs: number
  /** Max attempts per client IP per window, per route. */
  maxPerIp: number
  /** Max attempts per account (normalized email) per window, per route. */
  maxPerAccount: number
  /** Failed code (OTP / email verification) attempts before the code is burned and locked. */
  maxCodeFailures: number
  /** How long an account stays locked out of code verification after too many failures. */
  codeLockoutMs: number
  /** Upper bound on tracked keys, to bound memory under a flood of distinct keys. */
  maxTrackedKeys: number
}

export const DEFAULT_AUTH_RATE_LIMITS: AuthRateLimitOptions = {
  windowMs: 15 * 60 * 1000,
  maxPerIp: 30,
  maxPerAccount: 10,
  maxCodeFailures: 5,
  codeLockoutMs: 15 * 60 * 1000,
  maxTrackedKeys: 50_000
}

export const RATE_LIMITED_AUTH_ROUTES = [
  '/api/auth/login',
  '/api/auth/verify-email',
  '/api/auth/otp/verify'
] as const

export type CodeKind = 'otp' | 'verify-email'

interface Bucket {
  count: number
  resetAt: number
}

export interface ThrottleDecision {
  allowed: boolean
  retryAfterSeconds: number
}

export class AuthRateLimiter {
  readonly options: AuthRateLimitOptions
  private readonly attempts = new Map<string, Bucket>()
  private readonly codeFailures = new Map<string, Bucket>()
  private readonly lockouts = new Map<string, number>()
  private readonly now: () => number

  constructor(options: Partial<AuthRateLimitOptions> = {}, now: () => number = Date.now) {
    this.options = { ...DEFAULT_AUTH_RATE_LIMITS, ...options }
    this.now = now
  }

  /** Count one attempt against the IP and account buckets for a route. */
  consumeAttempt(route: string, ip: string, account: string | null): ThrottleDecision {
    const ipDecision = this.hit(this.attempts, `ip:${route}:${ip}`, this.options.maxPerIp, this.options.windowMs)
    if (!ipDecision.allowed) return ipDecision
    if (!account) return ipDecision
    return this.hit(this.attempts, `acct:${route}:${account}`, this.options.maxPerAccount, this.options.windowMs)
  }

  /** Remaining lockout for an account's code verification, if any. */
  codeLockout(kind: CodeKind, account: string): ThrottleDecision {
    const until = this.lockouts.get(`${kind}:${account}`)
    const now = this.now()
    if (until === undefined || until <= now) {
      if (until !== undefined) this.lockouts.delete(`${kind}:${account}`)
      return { allowed: true, retryAfterSeconds: 0 }
    }
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((until - now) / 1000)) }
  }

  /**
   * Record a failed code attempt. Returns locked=true once the limit is reached;
   * the caller must then invalidate the stored code.
   */
  recordCodeFailure(kind: CodeKind, account: string): { locked: boolean; retryAfterSeconds: number } {
    const key = `${kind}:${account}`
    const decision = this.hit(this.codeFailures, key, this.options.maxCodeFailures - 1, this.options.codeLockoutMs)
    if (decision.allowed) return { locked: false, retryAfterSeconds: 0 }
    this.codeFailures.delete(key)
    this.lockouts.set(key, this.now() + this.options.codeLockoutMs)
    return { locked: true, retryAfterSeconds: Math.ceil(this.options.codeLockoutMs / 1000) }
  }

  /** Clear failure state after a successful verification. */
  clearCodeFailures(kind: CodeKind, account: string): void {
    this.codeFailures.delete(`${kind}:${account}`)
    this.lockouts.delete(`${kind}:${account}`)
  }

  /** Clear per-account attempt counters after a successful login/verification. */
  clearAccount(route: string, account: string): void {
    this.attempts.delete(`acct:${route}:${account}`)
  }

  private hit(store: Map<string, Bucket>, key: string, limit: number, windowMs: number): ThrottleDecision {
    const now = this.now()
    let bucket = store.get(key)
    if (!bucket || bucket.resetAt <= now) {
      this.prune(store, now)
      bucket = { count: 0, resetAt: now + windowMs }
      store.set(key, bucket)
    }
    bucket.count += 1
    if (bucket.count > limit) {
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) }
    }
    return { allowed: true, retryAfterSeconds: 0 }
  }

  private prune(store: Map<string, Bucket>, now: number): void {
    if (store.size < this.options.maxTrackedKeys) return
    for (const [key, bucket] of store) {
      if (bucket.resetAt <= now) store.delete(key)
    }
    // Still full: drop oldest insertions (Map preserves insertion order).
    while (store.size >= this.options.maxTrackedKeys) {
      const oldest = store.keys().next().value
      if (oldest === undefined) break
      store.delete(oldest)
    }
  }
}

export function sendTooManyRequests(reply: FastifyReply, retryAfterSeconds: number, message?: string) {
  return reply
    .code(429)
    .header('Retry-After', String(retryAfterSeconds))
    .send({ success: false, message: message ?? 'Too many attempts. Please wait and try again.' })
}

function accountFromBody(request: FastifyRequest): string | null {
  const body = request.body as Record<string, unknown> | undefined
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  return email || null
}

const CODE_ROUTES: Record<string, CodeKind> = {
  '/api/auth/otp/verify': 'otp',
  '/api/auth/verify-email': 'verify-email'
}

/** Throttle the rate-limited auth routes before their handlers run. */
export function registerAuthRateLimits(app: FastifyInstance, limiter: AuthRateLimiter): void {
  const routes = new Set<string>(RATE_LIMITED_AUTH_ROUTES)
  app.addHook('preHandler', async (request, reply) => {
    const route = request.routeOptions.url
    if (request.method !== 'POST' || !route || !routes.has(route)) return
    const account = accountFromBody(request)

    const codeKind = CODE_ROUTES[route]
    if (codeKind && account) {
      const lock = limiter.codeLockout(codeKind, account)
      if (!lock.allowed) {
        return sendTooManyRequests(reply, lock.retryAfterSeconds, 'Too many incorrect codes. Request a new code later.')
      }
    }

    const decision = limiter.consumeAttempt(route, request.ip, account)
    if (!decision.allowed) return sendTooManyRequests(reply, decision.retryAfterSeconds)
  })
}
