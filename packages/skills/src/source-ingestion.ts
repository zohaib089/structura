/**
 * Skill: Safe Source Ingestion
 * Guidance for source ingestion and untrusted repository analysis work.
 */

export type SourceIngestionTask =
  | 'design'
  | 'implementation'
  | 'review'
  | 'incident-response'

export interface SourceIngestionInput {
  task: SourceIngestionTask
  source?: 'archive' | 'single-file' | 'git-provider' | 'worker'
}

export interface SourceIngestionOutput {
  success: boolean
  message: string
  guidance: string[]
}

export function sourceIngestion(input: SourceIngestionInput): SourceIngestionOutput {
  const guidance = [
    'Do not enable source acceptance until the threat model is formally approved and tenant authorization, source-data flow, retention enforcement, hosting/residency, and deletion behavior have evidence.',
    'A policy helper, draft threat model, or product-level worldwide target is not evidence of enforcement, security approval, or country-specific legal approval.',
    'Treat every uploaded file, archive entry, repository path, manifest, and analysis artifact as untrusted data.',
    'Never execute repository scripts, package lifecycle hooks, builds, tests, binaries, or Dockerfiles in the static-analysis workflow.',
    'Enforce configured compressed-size, expanded-size, file-count, path-depth, processing-time, and memory limits; fail visibly when a limit is reached.',
    'Reject traversal and absolute paths, and handle symbolic links and special files without allowing writes outside an isolated per-job workspace.',
    'Keep source access tenant-scoped and least-privileged from ingestion through workers, storage, reports, logs, and deletion.',
    'Use immutable snapshot identity and idempotent job semantics; record analyzer version and evidence provenance without copying source into operational logs.',
    'Treat API and queue payloads as unknown; validate each record field, enum, identifier, timestamp, and aggregate, and return only declared fields.',
    'Reject duplicate identifiers in collection responses and surface malformed JSON or response envelopes; never reinterpret invalid or unauthorized data as an empty success.',
    'Metadata-only inventories may estimate language and file categories from paths/extensions; label them as estimates and do not imply parser-backed or semantic analysis.',
    'Do not treat analysis-job metadata schema as authorization to add submission, source retrieval, queue, progress, cancellation, or worker endpoints before the release gates pass.',
    'Redact secret findings; never include raw secret values or source content in logs, metrics, error messages, test snapshots, or telemetry.',
    'Make retry, cancellation, failure, and cleanup behavior explicit; do not report a job as complete after partial work or failed cleanup.',
    'Treat retention calculations as policy primitives only; production enforcement must cover primary storage, temporary worker data, caches, replicas, and backups and must be verified.',
    'Test malformed and boundary inputs, tenant isolation, resource-limit behavior, cancellation, retry/idempotency, retention, and deletion using non-sensitive fixtures.'
  ]

  if (input.source === 'archive') {
    guidance.push('Validate archive structure before extraction and extract only into a newly created, isolated job directory.')
  }

  if (input.source === 'git-provider') {
    guidance.push('Request minimum provider permissions, encrypt credentials, support revocation, and verify webhook authenticity before processing events.')
  }

  if (input.source === 'worker') {
    guidance.push('Run workers with bounded resources and no unnecessary network access, credentials, host mounts, or execution privileges.')
  }

  if (input.task === 'review' || input.task === 'incident-response') {
    guidance.push('Trace source data across API, storage, queue, worker, logs, reports, backups, and deletion paths; distinguish verified controls from assumptions.')
  }

  return {
    success: true,
    message: 'Safe source-ingestion guidance prepared successfully',
    guidance
  }
}
