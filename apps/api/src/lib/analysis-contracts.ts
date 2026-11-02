import {
  ANALYSIS_JOB_STATES,
  type AnalysisJobStateName
} from './analysis-job-state.js'

export const ANALYSIS_CONTRACT_VERSION = '1.0.0' as const

export const ANALYSIS_SOURCE_KINDS = [
  'archive',
  'single-file',
  'github',
  'gitlab'
] as const

export type AnalysisSourceKind = typeof ANALYSIS_SOURCE_KINDS[number]

export interface SourceSnapshotManifest {
  contractVersion: typeof ANALYSIS_CONTRACT_VERSION
  snapshotId: string
  projectId: string
  sourceKind: AnalysisSourceKind
  contentDigest: `sha256:${string}`
  fileCount: number
  totalBytes: number
  createdAt: string
}

export interface AnalysisRequest {
  contractVersion: typeof ANALYSIS_CONTRACT_VERSION
  analysisId: string
  projectId: string
  snapshotId: string
  requestedBy: string
  idempotencyKey: string
  analyzerVersions: Array<{
    analyzerId: string
    version: string
  }>
  createdAt: string
}

export const ANALYSIS_PROGRESS_CODES = [
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
] as const

export type AnalysisProgressCode = typeof ANALYSIS_PROGRESS_CODES[number]

export interface AnalysisProgressEvent {
  contractVersion: typeof ANALYSIS_CONTRACT_VERSION
  analysisId: string
  sequence: number
  state: AnalysisJobStateName
  progressPercent: number
  code: AnalysisProgressCode
  occurredAt: string
}

export type InventoryFileKind =
  | 'source'
  | 'test'
  | 'manifest'
  | 'configuration'
  | 'ci'
  | 'container'
  | 'documentation'
  | 'other'

export const INVENTORY_FILE_KINDS: readonly InventoryFileKind[] = [
  'source',
  'test',
  'manifest',
  'configuration',
  'ci',
  'container',
  'documentation',
  'other'
]

export interface AnalysisInventoryItem {
  path: string
  sizeBytes: number
  kind: InventoryFileKind
  languageId: string | null
}

export interface AnalysisInventoryResult {
  contractVersion: typeof ANALYSIS_CONTRACT_VERSION
  analysisId: string
  snapshotId: string
  fileCount: number
  totalBytes: number
  unsupportedFileCount: number
  files: AnalysisInventoryItem[]
  completedAt: string
}

const progressCodeSet = new Set<string>(ANALYSIS_PROGRESS_CODES)
const stateSet = new Set<string>(ANALYSIS_JOB_STATES)
const sourceKindSet = new Set<string>(ANALYSIS_SOURCE_KINDS)
const inventoryFileKindSet = new Set<string>(INVENTORY_FILE_KINDS)
const sha256Pattern = /^sha256:[a-f\d]{64}$/i
const languageIdPattern = /^[a-z\d][a-z\d+#.-]{0,63}$/i

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isValidTimestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function isSupportedSourceKind(value: unknown): value is AnalysisSourceKind {
  return typeof value === 'string' && sourceKindSet.has(value)
}

function isSha256Digest(value: unknown): value is `sha256:${string}` {
  return typeof value === 'string' && sha256Pattern.test(value)
}

function isInventoryFileKind(value: unknown): value is InventoryFileKind {
  return typeof value === 'string' && inventoryFileKindSet.has(value)
}

function isSafeInventoryPath(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 4096) return false
  if (/[\u0000-\u001f\u007f]/.test(value) || value.includes('\\') || value.startsWith('/')) return false
  if (/^[a-z\d+.-]+:/i.test(value)) return false

  const segments = value.split('/')
  return segments.every(segment => segment.length > 0 && segment !== '.' && segment !== '..')
}

export function parseSourceSnapshotManifest(value: unknown): SourceSnapshotManifest {
  if (!isRecord(value)) {
    throw new Error('Source snapshot manifest must be an object.')
  }

  const {
    contractVersion,
    snapshotId,
    projectId,
    sourceKind,
    contentDigest,
    fileCount,
    totalBytes,
    createdAt
  } = value

  if (
    contractVersion !== ANALYSIS_CONTRACT_VERSION ||
    !isNonEmptyString(snapshotId) ||
    !isNonEmptyString(projectId) ||
    !isSupportedSourceKind(sourceKind) ||
    !isSha256Digest(contentDigest) ||
    !isNonNegativeSafeInteger(fileCount) ||
    !isNonNegativeSafeInteger(totalBytes) ||
    !isValidTimestamp(createdAt)
  ) {
    throw new Error('Source snapshot manifest does not match the supported contract.')
  }

  return {
    contractVersion,
    snapshotId,
    projectId,
    sourceKind,
    contentDigest,
    fileCount,
    totalBytes,
    createdAt
  }
}

export function parseAnalysisRequest(value: unknown): AnalysisRequest {
  if (!isRecord(value)) {
    throw new Error('Analysis request must be an object.')
  }

  const {
    contractVersion,
    analysisId,
    projectId,
    snapshotId,
    requestedBy,
    idempotencyKey,
    analyzerVersions,
    createdAt
  } = value

  if (
    contractVersion !== ANALYSIS_CONTRACT_VERSION ||
    !isNonEmptyString(analysisId) ||
    !isNonEmptyString(projectId) ||
    !isNonEmptyString(snapshotId) ||
    !isNonEmptyString(requestedBy) ||
    !isNonEmptyString(idempotencyKey) ||
    !Array.isArray(analyzerVersions) ||
    analyzerVersions.length === 0 ||
    !isValidTimestamp(createdAt)
  ) {
    throw new Error('Analysis request does not match the supported contract.')
  }

  const parsedAnalyzers: AnalysisRequest['analyzerVersions'] = []
  const analyzerIds = new Set<string>()
  for (const item of analyzerVersions) {
    if (
      !isRecord(item) ||
      !isNonEmptyString(item.analyzerId) ||
      !isNonEmptyString(item.version) ||
      analyzerIds.has(item.analyzerId)
    ) {
      throw new Error('Analysis request contains an invalid analyzer version.')
    }

    analyzerIds.add(item.analyzerId)
    parsedAnalyzers.push({ analyzerId: item.analyzerId, version: item.version })
  }

  return {
    contractVersion,
    analysisId,
    projectId,
    snapshotId,
    requestedBy,
    idempotencyKey,
    analyzerVersions: parsedAnalyzers,
    createdAt
  }
}

export function parseAnalysisInventoryResult(value: unknown): AnalysisInventoryResult {
  if (!isRecord(value)) {
    throw new Error('Analysis inventory result must be an object.')
  }

  const {
    contractVersion,
    analysisId,
    snapshotId,
    fileCount,
    totalBytes,
    unsupportedFileCount,
    files,
    completedAt
  } = value

  if (
    contractVersion !== ANALYSIS_CONTRACT_VERSION ||
    !isNonEmptyString(analysisId) ||
    !isNonEmptyString(snapshotId) ||
    !isNonNegativeSafeInteger(fileCount) ||
    !isNonNegativeSafeInteger(totalBytes) ||
    !isNonNegativeSafeInteger(unsupportedFileCount) ||
    unsupportedFileCount > fileCount ||
    !Array.isArray(files) ||
    files.length !== fileCount ||
    !isValidTimestamp(completedAt)
  ) {
    throw new Error('Analysis inventory result does not match the supported contract.')
  }

  const parsedFiles: AnalysisInventoryItem[] = []
  const paths = new Set<string>()
  let calculatedTotalBytes = 0
  let calculatedUnsupportedFiles = 0

  for (const item of files) {
    if (
      !isRecord(item) ||
      !isSafeInventoryPath(item.path) ||
      !isNonNegativeSafeInteger(item.sizeBytes) ||
      !isInventoryFileKind(item.kind) ||
      (item.languageId !== null &&
        (typeof item.languageId !== 'string' || !languageIdPattern.test(item.languageId))) ||
      paths.has(item.path)
    ) {
      throw new Error('Analysis inventory contains an invalid file record.')
    }

    calculatedTotalBytes += item.sizeBytes
    if (!Number.isSafeInteger(calculatedTotalBytes)) {
      throw new Error('Analysis inventory total exceeds the supported numeric range.')
    }
    if (item.languageId === null) calculatedUnsupportedFiles += 1
    paths.add(item.path)
    parsedFiles.push({
      path: item.path,
      sizeBytes: item.sizeBytes,
      kind: item.kind,
      languageId: item.languageId
    })
  }

  if (calculatedTotalBytes !== totalBytes || calculatedUnsupportedFiles !== unsupportedFileCount) {
    throw new Error('Analysis inventory totals do not match its file records.')
  }

  return {
    contractVersion,
    analysisId,
    snapshotId,
    fileCount,
    totalBytes,
    unsupportedFileCount,
    files: parsedFiles,
    completedAt
  }
}

function isAnalysisState(value: unknown): value is AnalysisJobStateName {
  return typeof value === 'string' && stateSet.has(value)
}

function isProgressCode(value: unknown): value is AnalysisProgressCode {
  return typeof value === 'string' && progressCodeSet.has(value)
}

export function parseAnalysisProgressEvent(value: unknown): AnalysisProgressEvent {
  if (!isRecord(value)) {
    throw new Error('Analysis progress event must be an object.')
  }

  const {
    contractVersion,
    analysisId,
    sequence,
    state,
    progressPercent,
    code,
    occurredAt
  } = value

  if (
    contractVersion !== ANALYSIS_CONTRACT_VERSION ||
    typeof analysisId !== 'string' ||
    analysisId.length === 0 ||
    typeof sequence !== 'number' ||
    !Number.isSafeInteger(sequence) ||
    sequence < 1 ||
    !isAnalysisState(state) ||
    typeof progressPercent !== 'number' ||
    !Number.isInteger(progressPercent) ||
    progressPercent < 0 ||
    progressPercent > 100 ||
    !isProgressCode(code) ||
    !isValidTimestamp(occurredAt)
  ) {
    throw new Error('Analysis progress event does not match the supported contract.')
  }

  return {
    contractVersion,
    analysisId,
    sequence,
    state,
    progressPercent,
    code,
    occurredAt
  }
}

export {
  EDGE_TYPES,
  GRAPH_SCHEMA_ID,
  GRAPH_SCHEMA_VERSION,
  LANGUAGES,
  NODE_KINDS,
  type Coverage,
  type Graph,
  type GraphEdge,
  type GraphNode
} from '@atlasmith/engine/graph-reader'
