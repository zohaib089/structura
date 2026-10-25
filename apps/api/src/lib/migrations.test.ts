import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyMigrations,
  type MigrationQuery,
  type MigrationQueryResult,
  type MigrationTransaction
} from './migrations.js'

function createMigrationDatabase() {
  const applied = new Set<string>()
  const statements: string[] = []
  let failNextMigration = false
  let rollbackCount = 0

  const query: MigrationQuery = async (text, params): Promise<MigrationQueryResult> => {
    statements.push(text)

    if (text.startsWith('SELECT version FROM schema_migrations')) {
      const version = String(params?.[0])
      return { rows: applied.has(version) ? [{ version }] : [] }
    }

    if (text.startsWith('INSERT INTO schema_migrations')) {
      applied.add(String(params?.[0]))
    }

    if (failNextMigration && text.includes('CREATE TABLE IF NOT EXISTS workspaces')) {
      failNextMigration = false
      throw new Error('migration failed')
    }

    return { rows: [] }
  }

  const transaction: MigrationTransaction = async operation => {
    const appliedBefore = new Set(applied)
    statements.push('BEGIN')
    try {
      const result = await operation(query)
      statements.push('COMMIT')
      return result
    } catch (error) {
      applied.clear()
      for (const version of appliedBefore) applied.add(version)
      rollbackCount += 1
      statements.push('ROLLBACK')
      throw error
    }
  }

  return {
    query,
    transaction,
    statements,
    applied,
    failNextMigration: () => { failNextMigration = true },
    rollbackCount: () => rollbackCount
  }
}

test('applies the versioned auth, workspace, invitation, and analysis metadata migrations once', async () => {
  const database = createMigrationDatabase()

  const firstRun = await applyMigrations(database.query, database.transaction)
  const secondRun = await applyMigrations(database.query, database.transaction)

  assert.deepEqual(firstRun, [
    '001_auth_baseline',
    '002_workspaces_projects',
    '003_analysis_job_metadata',
    '004_workspace_invitations'
  ])
  assert.deepEqual(secondRun, [])
  assert.match(database.statements.join('\n'), /CREATE TABLE IF NOT EXISTS workspace_members/)
  assert.match(database.statements.join('\n'), /CREATE TABLE IF NOT EXISTS projects/)
  assert.match(database.statements.join('\n'), /CREATE TABLE IF NOT EXISTS analysis_jobs/)
  assert.match(database.statements.join('\n'), /CREATE TABLE IF NOT EXISTS analysis_progress_events/)
  assert.match(database.statements.join('\n'), /CREATE TABLE IF NOT EXISTS workspace_invitations/)
  assert.match(database.statements.join('\n'), /CHECK \(role = 'member'\)/)
  assert.match(database.statements.join('\n'), /UNIQUE \(workspace_id, email\)/)
  assert.match(database.statements.join('\n'), /retention_expires_at <= created_at \+ INTERVAL '90 days'/)
  assert.match(database.statements.join('\n'), /UNIQUE \(project_id, idempotency_key\)/)
})

test('rolls back and reports migration errors', async () => {
  const database = createMigrationDatabase()
  database.failNextMigration()

  await assert.rejects(applyMigrations(database.query, database.transaction), /migration failed/)
  assert.equal(database.rollbackCount(), 1)
  assert.equal(database.applied.has('002_workspaces_projects'), false)
})
