import pg, { type QueryResultRow } from 'pg'
import { logger } from '../logger.js'

const { Pool } = pg

const pool = new Pool({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  user: process.env.DB_USER ?? 'structura',
  password: process.env.DB_PASSWORD ?? 'structura123',
  database: process.env.DB_NAME ?? 'structuradb',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
})

pool.on('connect', () => {
  logger.info('Connected to PostgreSQL database')
})

pool.on('error', (error: Error) => {
  logger.error({ error }, 'Unexpected PostgreSQL pool error')
})

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) {
  const start = Date.now()
  const result = await pool.query<T>(text, params as any)
  const duration = Date.now() - start
  logger.debug({ duration, rows: result.rowCount }, 'PostgreSQL query executed')
  return result
}

export async function withTransaction<T>(
  operation: (execute: (
    text: string,
    params?: unknown[]
  ) => Promise<{ rows: QueryResultRow[] }>) => Promise<T>
): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await operation(async (text, params) => client.query(text, params as any))
    await client.query('COMMIT')
    return result
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch (rollbackError) {
      throw new AggregateError([error, rollbackError], 'Transaction and rollback both failed')
    }
    throw error
  } finally {
    client.release()
  }
}

export async function testDatabaseConnection() {
  const result = await query<{ now: Date }>('SELECT NOW() as now')
  logger.info({ now: result.rows[0]?.now }, 'PostgreSQL connection verified')
  return result.rows[0]
}

export async function closeDatabase() {
  await pool.end()
  logger.info('PostgreSQL pool closed')
}
