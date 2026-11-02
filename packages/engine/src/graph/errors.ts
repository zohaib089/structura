import type { SchemaIssue } from './schema-check.js'

export type GraphErrorCode = 'GraphParseError' | 'GraphVersionUnsupported' | 'GraphInvalid' | 'GraphTooLarge'

/** Maximum number of JSON-pointer paths carried by an error. */
export const MAX_REPORTED_ISSUES = 20

export class GraphReadError extends Error {
  readonly code: GraphErrorCode
  /** First (at most 20) problems as JSON-pointer paths with a message. */
  readonly issues: SchemaIssue[]
  readonly foundVersion: string | undefined
  readonly supportedMajor: number | undefined

  constructor(code: GraphErrorCode, message: string, extra: { issues?: SchemaIssue[]; foundVersion?: string; supportedMajor?: number } = {}) {
    super(message)
    this.name = code
    this.code = code
    this.issues = (extra.issues ?? []).slice(0, MAX_REPORTED_ISSUES)
    this.foundVersion = extra.foundVersion
    this.supportedMajor = extra.supportedMajor
  }
}

/** Typed error thrown when the document's major version is not supported. CLI exit code 2. */
export class GraphVersionUnsupported extends GraphReadError {
  constructor(foundVersion: string, supportedMajor: number) {
    super('GraphVersionUnsupported', `graph.json schemaVersion ${foundVersion} is not supported (this build reads major version ${supportedMajor}). Update the tool or regenerate the graph.`, {
      foundVersion,
      supportedMajor
    })
  }
}
