export interface MigrationQueryResult {
  rows: Array<Record<string, unknown>>
}

export type MigrationQuery = (
  text: string,
  params?: unknown[]
) => Promise<MigrationQueryResult>

export type MigrationTransaction = <T>(
  operation: (query: MigrationQuery) => Promise<T>
) => Promise<T>

interface Migration {
  version: string
  sql: string
}

const migrations: Migration[] = [
  {
    version: '001_auth_baseline',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        company TEXT NOT NULL,
        account_type TEXT NOT NULL DEFAULT 'individual',
        password TEXT NOT NULL,
        verified BOOLEAN NOT NULL DEFAULT false,
        verification_code TEXT,
        otp_code TEXT,
        reset_token TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMPTZ;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_expires_at TIMESTAMPTZ;
      CREATE TABLE IF NOT EXISTS auth_sessions (
        token_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `
  },
  {
    version: '002_workspaces_projects',
    sql: `
      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
        created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS workspace_members (
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (workspace_id, user_id)
      );
      CREATE INDEX IF NOT EXISTS workspace_members_user_id_idx
        ON workspace_members (user_id, workspace_id);
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
        description TEXT NOT NULL DEFAULT '',
        created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS projects_workspace_updated_idx
        ON projects (workspace_id, updated_at DESC, id);
    `
  },
  {
    version: '003_analysis_job_metadata',
    sql: `
      CREATE TABLE IF NOT EXISTS analysis_jobs (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        requested_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        idempotency_key TEXT NOT NULL CHECK (length(trim(idempotency_key)) BETWEEN 1 AND 200),
        state TEXT NOT NULL CHECK (
          state IN ('queued', 'validating', 'inventorying', 'analyzing', 'finalizing', 'succeeded', 'failed', 'cancelled')
        ),
        progress_percent INTEGER NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
        attempt INTEGER NOT NULL DEFAULT 1 CHECK (attempt >= 1),
        max_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts BETWEEN 1 AND 10),
        analyzer_versions JSONB NOT NULL CHECK (jsonb_typeof(analyzer_versions) = 'array'),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        retention_expires_at TIMESTAMPTZ NOT NULL,
        UNIQUE (project_id, idempotency_key),
        CHECK (attempt <= max_attempts),
        CHECK (retention_expires_at <= created_at + INTERVAL '90 days')
      );
      CREATE INDEX IF NOT EXISTS analysis_jobs_project_created_idx
        ON analysis_jobs (project_id, created_at DESC, id);
      CREATE INDEX IF NOT EXISTS analysis_jobs_retention_idx
        ON analysis_jobs (retention_expires_at, id);
      CREATE INDEX IF NOT EXISTS analysis_jobs_queued_idx
        ON analysis_jobs (created_at, id) WHERE state = 'queued';
      CREATE TABLE IF NOT EXISTS analysis_progress_events (
        analysis_id TEXT NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
        sequence INTEGER NOT NULL CHECK (sequence > 0),
        state TEXT NOT NULL CHECK (
          state IN ('queued', 'validating', 'inventorying', 'analyzing', 'finalizing', 'succeeded', 'failed', 'cancelled')
        ),
        progress_percent INTEGER NOT NULL CHECK (progress_percent BETWEEN 0 AND 100),
        code TEXT NOT NULL CHECK (
          code IN (
            'snapshot_validation_started',
            'snapshot_validation_completed',
            'inventory_started',
            'inventory_completed',
            'analysis_started',
            'analysis_completed',
            'finalization_started',
            'analysis_succeeded',
            'analysis_failed',
            'analysis_cancelled'
          )
        ),
        occurred_at TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (analysis_id, sequence)
      );
      CREATE INDEX IF NOT EXISTS analysis_progress_events_occurred_idx
        ON analysis_progress_events (analysis_id, occurred_at, sequence);
    `
  },
  {
    version: '004_workspace_invitations',
    sql: `
      CREATE TABLE IF NOT EXISTS workspace_invitations (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        email TEXT NOT NULL CHECK (email = lower(trim(email))),
        token_hash TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL DEFAULT 'member' CHECK (role = 'member'),
        created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL,
        accepted_at TIMESTAMPTZ,
        revoked_at TIMESTAMPTZ,
        UNIQUE (workspace_id, email),
        CHECK (expires_at <= created_at + INTERVAL '7 days')
      );
      CREATE INDEX IF NOT EXISTS workspace_invitations_pending_idx
        ON workspace_invitations (workspace_id, expires_at, id)
        WHERE accepted_at IS NULL AND revoked_at IS NULL;
    `
  }
]

export async function applyMigrations(
  query: MigrationQuery,
  transaction: MigrationTransaction
): Promise<string[]> {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  return transaction(async execute => {
    await execute('SELECT pg_advisory_xact_lock($1)', [721946203])
    const appliedNow: string[] = []

    for (const migration of migrations) {
      const applied = await execute(
        'SELECT version FROM schema_migrations WHERE version = $1',
        [migration.version]
      )

      if (applied.rows.length === 0) {
        await execute(migration.sql)
        await execute('INSERT INTO schema_migrations (version) VALUES ($1)', [migration.version])
        appliedNow.push(migration.version)
      }
    }

    return appliedNow
  })
}
