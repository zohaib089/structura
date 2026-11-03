import type { SchemaIssue } from '../graph/schema-check.js'

export class ArchitectureConfigError extends Error {
  readonly code = 'ARCHITECTURE_CONFIG' as const
  readonly exitCode = 2
  constructor(message: string, readonly issues: readonly SchemaIssue[] = []) {
    super(message)
    this.name = 'ArchitectureConfigError'
  }
}
