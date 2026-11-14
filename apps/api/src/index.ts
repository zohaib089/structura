import 'dotenv/config'
import Fastify from 'fastify'
import multipart from '@fastify/multipart'
import { config } from './config.js'
import {
  sendAuthEmail,
  workspaceInvitationEmail
} from './services/auth-email.js'
import { closeDatabase, query, testDatabaseConnection, withTransaction } from './db/db.js'
import { applyMigrations } from './db/migrations.js'
import {
  registerWorkspaceInvitationRoutes,
  registerWorkspaceRoutes,
  type WorkspaceDatabase
} from './routes/workspace-routes.js'
import { registerWorkspaceScanRoutes } from './routes/scan-routes.js'
import { registerAuthRoutes } from './routes/auth-routes.js'
import { recoverWorkspaceScansOnStartup } from './workers/scan-worker.js'
import { AuthRateLimiter, registerAuthRateLimits } from './services/auth-rate-limit.js'
import { logger } from './logger.js'
import { limitsFromEnv } from '@atlasmith/source-ingest'

const app = Fastify({ logger: false })
const scanUploadLimits = limitsFromEnv()
void app.register(multipart, {
  limits: {
    fileSize: scanUploadLimits.maxRepoBytes,
    files: 1
  }
})
const authRateLimiter = new AuthRateLimiter()
registerAuthRateLimits(app, authRateLimiter)
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

app.addHook('onReady', async () => {
  await applyMigrations(
    async (text, params) => query(text, params),
    operation => withTransaction(transactionQuery => operation(
      async (text, params) => transactionQuery(text, params)
    ))
  )
  await testDatabaseConnection()
  await recoverWorkspaceScansOnStartup({ query: workspaceDatabase.query })
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
registerWorkspaceScanRoutes(app, workspaceDatabase)
registerWorkspaceInvitationRoutes(app, workspaceDatabase, {
  frontendUrl: config.frontendUrl,
  deliverInvitation: async (email, workspaceName, inviterName, acceptanceUrl) => {
    await sendAuthEmail(email, workspaceInvitationEmail(inviterName, workspaceName, acceptanceUrl))
  },
  onDeliveryFailure: error => logger.error({ error }, 'Workspace invitation email delivery failed')
})

registerAuthRoutes(app, {
  query,
  sendAuthEmail,
  frontendUrl: config.frontendUrl,
  authRateLimiter
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
process.on('unhandledRejection', reason => {
  logger.error({ reason: reason instanceof Error ? reason.message : String(reason) }, 'Unhandled promise rejection')
})

void start()
