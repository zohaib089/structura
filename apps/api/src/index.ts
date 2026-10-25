import 'dotenv/config'
import Fastify from 'fastify'
import {
  createHash,
  randomBytes,
  randomInt,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual
} from 'node:crypto'
import { promisify } from 'node:util'
import { config } from './config.js'
import {
  otpEmail,
  passwordResetEmail,
  sendAuthEmail,
  verificationEmail,
  workspaceInvitationEmail
} from './lib/auth-email.js'
import { closeDatabase, query, testDatabaseConnection, withTransaction } from './lib/db.js'
import { applyMigrations } from './lib/migrations.js'
import {
  registerWorkspaceInvitationRoutes,
  registerWorkspaceRoutes,
  type WorkspaceDatabase
} from './lib/workspace-routes.js'
import { logger } from './logger.js'

const app = Fastify({ logger: false })
const scrypt = promisify(scryptCallback)
const CODE_TTL_MINUTES = 15
const OTP_TTL_MINUTES = 10
const RESET_TTL_MINUTES = 30
const SESSION_TTL_HOURS = 8
const workspaceDatabase: WorkspaceDatabase = {
  query: async (text, params) => {
    const result = await query(text, params)
    return { rows: result.rows, rowCount: result.rowCount }
  },
  transaction: operation => withTransaction(transactionQuery => operation(async (text, params) => {
    const result = await transactionQuery(text, params)
    return { rows: result.rows }
  }))
}

interface AuthUserRow {
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

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function generateCode() {
  return String(randomInt(100000, 1000000))
}

function digest(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function secureEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = await scrypt(password, salt, 64) as Buffer
  return `scrypt$${salt}$${derivedKey.toString('hex')}`
}

async function verifyPassword(password: string, stored: string) {
  if (!stored.startsWith('scrypt$')) return stored === password
  const [, salt, expected] = stored.split('$')
  if (!salt || !expected) return false
  const actual = await scrypt(password, salt, 64) as Buffer
  return secureEqual(actual.toString('hex'), expected)
}

function sanitizeUser(user: AuthUserRow) {
  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    company: user.company,
    accountType: user.account_type,
    verified: user.verified,
    createdAt: user.created_at
  }
}

async function issueSession(user: AuthUserRow) {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000)
  await query(
    'INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
    [digest(token), user.id, expiresAt]
  )
  return {
    user: sanitizeUser(user),
    token,
    expiresAt: expiresAt.toISOString()
  }
}

function emailError(reply: { code: (status: number) => { send: (payload: unknown) => unknown } }) {
  logger.error('Authentication email could not be delivered')
  return reply.code(503).send({
    success: false,
    message: 'Email delivery is unavailable right now. Please try again shortly.'
  })
}

app.addHook('onReady', async () => {
  await applyMigrations(
    async (text, params) => query(text, params),
    operation => withTransaction(transactionQuery => operation(
      async (text, params) => transactionQuery(text, params)
    ))
  )
  await testDatabaseConnection()
})

app.get('/', async () => ({
  message: 'Structura API is running!',
  project: 'Structura',
  status: 'ok'
}))

app.get('/health', async () => {
  const result = await query<{ now: Date }>('SELECT NOW() as now')
  return {
    status: 'ok',
    project: 'Structura',
    database: result.rows[0]?.now ?? null,
    time: new Date().toISOString()
  }
})

registerWorkspaceRoutes(app, workspaceDatabase)
registerWorkspaceInvitationRoutes(app, workspaceDatabase, {
  frontendUrl: config.frontendUrl,
  deliverInvitation: async (email, workspaceName, inviterName, acceptanceUrl) => {
    await sendAuthEmail(email, workspaceInvitationEmail(inviterName, workspaceName, acceptanceUrl))
  },
  onDeliveryFailure: error => logger.error({ error }, 'Workspace invitation email delivery failed')
})

app.get('/api/auth/status', async () => ({
  status: 'ready',
  project: 'Structura',
  auth: {
    mode: 'database',
    supports: ['login', 'signup', 'reset', 'verify-email', 'otp', 'delete-account'],
    sso: false
  }
}))

app.post('/api/auth/signup', async (request, reply) => {
  const body = request.body as Record<string, unknown>
  const fullName = String(body.fullName ?? '').trim()
  const email = normalizeEmail(String(body.email ?? ''))
  const company = String(body.company ?? '').trim()
  const accountType = String(body.accountType ?? 'individual')
  const password = String(body.password ?? '')

  if (!fullName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !company || !password) {
    return reply.code(400).send({ success: false, message: 'Please provide valid values for all required fields.' })
  }
  if (accountType !== 'individual' && accountType !== 'enterprise') {
    return reply.code(400).send({ success: false, message: 'Choose a valid account type.' })
  }
  if (password.length < 12 || !/\d/.test(password) || !/[^\w\s]/.test(password)) {
    return reply.code(400).send({ success: false, message: 'Password must be at least 12 characters and include a number and symbol.' })
  }

  const existing = await query<{ id: string }>('SELECT id FROM users WHERE email = $1 LIMIT 1', [email])
  if (existing.rowCount) {
    return reply.code(409).send({ success: false, message: 'An account with this email already exists.' })
  }

  const userId = randomUUID()
  const verificationCode = generateCode()
  const passwordHash = await hashPassword(password)
  const insert = await query<AuthUserRow>(
    `INSERT INTO users (
      id, full_name, email, company, account_type, password, verified,
      verification_code, verification_expires_at
    ) VALUES ($1, $2, $3, $4, $5, $6, false, $7, NOW() + INTERVAL '${CODE_TTL_MINUTES} minutes')
    RETURNING *`,
    [userId, fullName, email, company, accountType, passwordHash, digest(verificationCode)]
  )

  try {
    await sendAuthEmail(email, verificationEmail(fullName, verificationCode))
  } catch (error) {
    logger.error({ error }, 'Verification email delivery failed')
    return reply.code(503).send({ success: false, message: 'Your account was created, but verification email delivery failed. Please request a new code.' })
  }

  return reply.code(201).send({
    success: true,
    message: 'Account created. Check your inbox for a verification code.',
    user: sanitizeUser(insert.rows[0])
  })
})

app.post('/api/auth/login', async (request, reply) => {
  const body = request.body as Record<string, unknown>
  const email = normalizeEmail(String(body.email ?? ''))
  const password = String(body.password ?? '')
  if (!email || !password) {
    return reply.code(400).send({ success: false, message: 'Email and password are required.' })
  }

  const result = await query<AuthUserRow>('SELECT * FROM users WHERE email = $1 LIMIT 1', [email])
  const user = result.rows[0]
  if (!user || !(await verifyPassword(password, user.password))) {
    return reply.code(401).send({ success: false, message: 'Email or password is incorrect.' })
  }
  if (!user.password.startsWith('scrypt$')) {
    await query('UPDATE users SET password = $1 WHERE id = $2', [await hashPassword(password), user.id])
  }
  if (!user.verified) {
    return reply.code(403).send({ success: false, message: 'Please verify your email before logging in.' })
  }

  const session = await issueSession(user)
  return { success: true, message: 'Login successful.', ...session }
})

app.post('/api/auth/forgot-password', async (request, reply) => {
  const body = request.body as Record<string, unknown>
  const email = normalizeEmail(String(body.email ?? ''))
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return reply.code(400).send({ success: false, message: 'Please provide a valid email address.' })
  }

  const result = await query<AuthUserRow>('SELECT * FROM users WHERE email = $1 LIMIT 1', [email])
  const user = result.rows[0]
  if (user) {
    const token = randomBytes(32).toString('base64url')
    await query(
      "UPDATE users SET reset_token = $1, reset_expires_at = NOW() + INTERVAL '30 minutes' WHERE id = $2",
      [digest(token), user.id]
    )
    const resetUrl = new URL('/auth/reset-password', config.frontendUrl)
    resetUrl.searchParams.set('email', email)
    resetUrl.searchParams.set('token', token)
    try {
      await sendAuthEmail(email, passwordResetEmail(user.full_name, resetUrl.toString()))
    } catch (error) {
      logger.error({ error }, 'Password reset email delivery failed')
      return emailError(reply)
    }
  }

  return { success: true, message: 'If an account exists for that email, password reset instructions have been sent.' }
})

app.post('/api/auth/reset-password', async (request, reply) => {
  const body = request.body as Record<string, unknown>
  const email = normalizeEmail(String(body.email ?? ''))
  const token = String(body.token ?? '')
  const password = String(body.password ?? '')
  if (!email || !token || !password) {
    return reply.code(400).send({ success: false, message: 'Email, reset token, and new password are required.' })
  }
  if (password.length < 12 || !/\d/.test(password) || !/[^\w\s]/.test(password)) {
    return reply.code(400).send({ success: false, message: 'Password must be at least 12 characters and include a number and symbol.' })
  }

  const result = await query<AuthUserRow>(
    'SELECT * FROM users WHERE email = $1 AND reset_token = $2 AND reset_expires_at > NOW() LIMIT 1',
    [email, digest(token)]
  )
  const user = result.rows[0]
  if (!user) {
    return reply.code(400).send({ success: false, message: 'This password reset link is invalid or expired.' })
  }

  await query(
    'UPDATE users SET password = $1, reset_token = NULL, reset_expires_at = NULL WHERE id = $2',
    [await hashPassword(password), user.id]
  )
  await query('DELETE FROM auth_sessions WHERE user_id = $1', [user.id])
  return { success: true, message: 'Password reset successfully. You can now sign in.' }
})

app.post('/api/auth/verify-email', async (request, reply) => {
  const body = request.body as Record<string, unknown>
  const email = normalizeEmail(String(body.email ?? ''))
  const code = String(body.code ?? '').trim()
  if (!email || !code) {
    return reply.code(400).send({ success: false, message: 'Email and verification code are required.' })
  }

  const result = await query<AuthUserRow>('SELECT * FROM users WHERE email = $1 LIMIT 1', [email])
  const user = result.rows[0]
  if (!user || user.verified || !user.verification_code || !user.verification_expires_at || new Date(user.verification_expires_at) <= new Date()) {
    return reply.code(400).send({ success: false, message: 'Verification code is invalid or expired. Request a new code.' })
  }
  if (!secureEqual(digest(code), user.verification_code)) {
    return reply.code(400).send({ success: false, message: 'The verification code is incorrect.' })
  }

  await query('UPDATE users SET verified = true, verification_code = NULL, verification_expires_at = NULL WHERE id = $1', [user.id])
  return { success: true, message: 'Email verified successfully.' }
})

app.post('/api/auth/resend-verification', async (request, reply) => {
  const body = request.body as Record<string, unknown>
  const email = normalizeEmail(String(body.email ?? ''))
  if (!email) return reply.code(400).send({ success: false, message: 'Email is required.' })

  const result = await query<AuthUserRow>('SELECT * FROM users WHERE email = $1 LIMIT 1', [email])
  const user = result.rows[0]
  if (!user || user.verified) {
    return reply.code(404).send({ success: false, message: 'No pending verification was found for this email.' })
  }

  const code = generateCode()
  await query(
    `UPDATE users SET verification_code = $1, verification_expires_at = NOW() + INTERVAL '${CODE_TTL_MINUTES} minutes' WHERE id = $2`,
    [digest(code), user.id]
  )
  try {
    await sendAuthEmail(email, verificationEmail(user.full_name, code))
  } catch (error) {
    logger.error({ error }, 'Verification email resend failed')
    return emailError(reply)
  }
  return { success: true, message: 'A new verification code has been sent to your inbox.' }
})

app.post('/api/auth/otp/send', async (request, reply) => {
  const body = request.body as Record<string, unknown>
  const email = normalizeEmail(String(body.email ?? ''))
  if (!email) return reply.code(400).send({ success: false, message: 'Email is required.' })

  const result = await query<AuthUserRow>('SELECT * FROM users WHERE email = $1 LIMIT 1', [email])
  const user = result.rows[0]
  if (!user || !user.verified) {
    return reply.code(404).send({ success: false, message: 'No verified account was found for this email.' })
  }

  const code = generateCode()
  await query(
    `UPDATE users SET otp_code = $1, otp_expires_at = NOW() + INTERVAL '${OTP_TTL_MINUTES} minutes' WHERE id = $2`,
    [digest(code), user.id]
  )
  try {
    await sendAuthEmail(email, otpEmail(user.full_name, code))
  } catch (error) {
    logger.error({ error }, 'Sign-in code email delivery failed')
    return emailError(reply)
  }
  return { success: true, message: 'A one-time sign-in code has been sent to your inbox.' }
})

app.post('/api/auth/otp/verify', async (request, reply) => {
  const body = request.body as Record<string, unknown>
  const email = normalizeEmail(String(body.email ?? ''))
  const code = String(body.code ?? '').trim()
  if (!email || !code) {
    return reply.code(400).send({ success: false, message: 'Email and OTP code are required.' })
  }

  const result = await query<AuthUserRow>('SELECT * FROM users WHERE email = $1 LIMIT 1', [email])
  const user = result.rows[0]
  if (!user || !user.verified || !user.otp_code || !user.otp_expires_at || new Date(user.otp_expires_at) <= new Date()) {
    return reply.code(400).send({ success: false, message: 'One-time code is invalid or expired. Request a new code.' })
  }
  if (!secureEqual(digest(code), user.otp_code)) {
    return reply.code(400).send({ success: false, message: 'The OTP code is incorrect.' })
  }

  await query('UPDATE users SET otp_code = NULL, otp_expires_at = NULL WHERE id = $1', [user.id])
  const session = await issueSession(user)
  return { success: true, message: 'OTP verified successfully.', ...session }
})

app.post('/api/auth/logout', async (request, reply) => {
  const authorization = request.headers.authorization ?? ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  if (!token) {
    return reply.code(401).send({ success: false, message: 'An active session is required.' })
  }

  const result = await query(
    'DELETE FROM auth_sessions WHERE token_hash = $1 AND expires_at > NOW()',
    [digest(token)]
  )
  if (!result.rowCount) {
    return reply.code(401).send({ success: false, message: 'This session is already expired or invalid.' })
  }
  return { success: true, message: 'Signed out successfully.' }
})

app.post('/api/auth/delete-account', async (request, reply) => {
  const body = request.body as Record<string, unknown>
  const email = normalizeEmail(String(body.email ?? ''))
  const password = String(body.password ?? '')
  if (!email || !password) {
    return reply.code(400).send({ success: false, message: 'Email and password are required.' })
  }

  const result = await query<AuthUserRow>('SELECT * FROM users WHERE email = $1 LIMIT 1', [email])
  const user = result.rows[0]
  if (!user || !(await verifyPassword(password, user.password))) {
    return reply.code(401).send({ success: false, message: 'Email or password is incorrect.' })
  }
  const ownedWorkspace = await query<{ id: string }>(
    'SELECT id FROM workspaces WHERE created_by = $1 LIMIT 1',
    [user.id]
  )
  if (ownedWorkspace.rowCount) {
    return reply.code(409).send({
      success: false,
      message: 'Transfer or delete your owned workspaces before deleting this account.'
    })
  }
  await query('DELETE FROM users WHERE id = $1', [user.id])
  return { success: true, message: 'Account deleted successfully.' }
})

const start = async () => {
  try {
    await app.listen({ port: config.port, host: config.host })
    logger.info(`Structura backend running at http://${config.host}:${config.port}`)
  } catch (error) {
    logger.error({ error }, 'Server failed to start')
    process.exit(1)
  }
}

const gracefulShutdown = async (signal: string) => {
  logger.info({ signal }, 'Shutting down Structura API')
  await closeDatabase()
  await app.close()
  process.exit(0)
}

process.on('SIGINT', () => void gracefulShutdown('SIGINT'))
process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'))

void start()
