import type {
  AnalyserRunStatus,
  AnalyserStatus,
  ReportFinding,
  ReportHistoryPayload,
  ReportImprovement,
  ReportProvenance,
  ReportSection,
  ReportSeverity,
  ScanReportV1
} from './scan-report-types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isGeneratedAt(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9]{4}-[0-9]{2}-[0-9]{2}T/.test(value)
}

const SEVERITIES: ReportSeverity[] = ['info', 'low', 'medium', 'high', 'critical']
const SECTIONS: ReportSection[] = [
  'history',
  'violations',
  'security',
  'badPractices',
  'improvements',
  'removals'
]
const PROVENANCE: ReportProvenance[] = ['EXTRACTED', 'INFERRED']
const ANALYSER_STATUS: AnalyserRunStatus[] = ['ran', 'skipped', 'failed', 'timeout']

function parseSeverity(value: unknown): ReportSeverity {
  if (typeof value === 'string' && (SEVERITIES as string[]).includes(value)) return value as ReportSeverity
  throw new Error('The scan report response was invalid.')
}

function parseSection(value: unknown): ReportSection {
  if (typeof value === 'string' && (SECTIONS as string[]).includes(value)) return value as ReportSection
  throw new Error('The scan report response was invalid.')
}

function parseProvenance(value: unknown): ReportProvenance {
  if (typeof value === 'string' && (PROVENANCE as string[]).includes(value)) return value as ReportProvenance
  throw new Error('The scan report response was invalid.')
}

function parseAnalyserStatus(value: unknown): AnalyserStatus {
  if (
    !isRecord(value) ||
    typeof value.status !== 'string' ||
    !(ANALYSER_STATUS as string[]).includes(value.status) ||
    typeof value.durationMs !== 'number' ||
    !Number.isInteger(value.durationMs) ||
    value.durationMs < 0 ||
    (value.reason !== undefined && typeof value.reason !== 'string')
  ) {
    throw new Error('The scan report response was invalid.')
  }
  const status: AnalyserStatus = {
    status: value.status as AnalyserRunStatus,
    durationMs: value.durationMs
  }
  if (typeof value.reason === 'string') status.reason = value.reason
  return status
}

function parseFinding(value: unknown): ReportFinding {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.file) ||
    typeof value.message !== 'string' ||
    (value.line !== undefined &&
      (typeof value.line !== 'number' || !Number.isInteger(value.line) || value.line < 1)) ||
    (value.rule !== undefined && typeof value.rule !== 'string') ||
    (value.tool !== undefined && typeof value.tool !== 'string')
  ) {
    throw new Error('The scan report response was invalid.')
  }
  const finding: ReportFinding = {
    id: value.id,
    section: parseSection(value.section),
    severity: parseSeverity(value.severity),
    file: value.file,
    message: value.message,
    provenance: parseProvenance(value.provenance)
  }
  if (typeof value.line === 'number') finding.line = value.line
  if (typeof value.rule === 'string') finding.rule = value.rule
  if (typeof value.tool === 'string') finding.tool = value.tool
  return finding
}

function parseImprovement(value: unknown): ReportImprovement {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    typeof value.message !== 'string' ||
    !Array.isArray(value.relatedFindingIds) ||
    value.relatedFindingIds.some(id => !isNonEmptyString(id)) ||
    (value.severity !== undefined && !(SEVERITIES as string[]).includes(String(value.severity)))
  ) {
    throw new Error('The scan report response was invalid.')
  }
  const improvement: ReportImprovement = {
    id: value.id,
    message: value.message,
    relatedFindingIds: [...value.relatedFindingIds]
  }
  if (typeof value.severity === 'string') improvement.severity = value.severity as ReportSeverity
  return improvement
}

function parseHistory(value: unknown): ReportHistoryPayload {
  if (!isRecord(value) || typeof value.limitedHistory !== 'boolean') {
    throw new Error('The scan report response was invalid.')
  }
  if (
    value.depthRequested !== undefined &&
    (typeof value.depthRequested !== 'number' ||
      !Number.isInteger(value.depthRequested) ||
      value.depthRequested < 1)
  ) {
    throw new Error('The scan report response was invalid.')
  }
  if (
    value.depthAvailable !== undefined &&
    (typeof value.depthAvailable !== 'number' ||
      !Number.isInteger(value.depthAvailable) ||
      value.depthAvailable < 0)
  ) {
    throw new Error('The scan report response was invalid.')
  }
  if (!Array.isArray(value.commits) || !Array.isArray(value.authors) || !Array.isArray(value.fileChurn) || !Array.isArray(value.hotspots)) {
    throw new Error('The scan report response was invalid.')
  }

  const commits = value.commits.map(row => {
    if (
      !isRecord(row) ||
      typeof row.hash !== 'string' ||
      typeof row.author !== 'string' ||
      typeof row.date !== 'string' ||
      typeof row.subject !== 'string'
    ) {
      throw new Error('The scan report response was invalid.')
    }
    return { hash: row.hash, author: row.author, date: row.date, subject: row.subject }
  })

  const authors = value.authors.map(row => {
    if (
      !isRecord(row) ||
      typeof row.name !== 'string' ||
      typeof row.commitCount !== 'number' ||
      !Number.isInteger(row.commitCount) ||
      row.commitCount < 0 ||
      (row.email !== undefined && typeof row.email !== 'string')
    ) {
      throw new Error('The scan report response was invalid.')
    }
    const author = { name: row.name, commitCount: row.commitCount }
    return row.email !== undefined ? { ...author, email: row.email } : author
  })

  const fileChurn = value.fileChurn.map(row => {
    if (
      !isRecord(row) ||
      typeof row.path !== 'string' ||
      typeof row.additions !== 'number' ||
      !Number.isInteger(row.additions) ||
      row.additions < 0 ||
      typeof row.deletions !== 'number' ||
      !Number.isInteger(row.deletions) ||
      row.deletions < 0 ||
      typeof row.commits !== 'number' ||
      !Number.isInteger(row.commits) ||
      row.commits < 0
    ) {
      throw new Error('The scan report response was invalid.')
    }
    return {
      path: row.path,
      additions: row.additions,
      deletions: row.deletions,
      commits: row.commits
    }
  })

  const hotspots = value.hotspots.map(row => {
    if (
      !isRecord(row) ||
      typeof row.path !== 'string' ||
      typeof row.score !== 'number' ||
      row.score < 0
    ) {
      throw new Error('The scan report response was invalid.')
    }
    return { path: row.path, score: row.score }
  })

  const history: ReportHistoryPayload = {
    limitedHistory: value.limitedHistory,
    commits,
    authors,
    fileChurn,
    hotspots
  }
  if (typeof value.depthRequested === 'number') history.depthRequested = value.depthRequested
  if (typeof value.depthAvailable === 'number') history.depthAvailable = value.depthAvailable
  return history
}

export function parseScanReportV1(value: unknown): ScanReportV1 {
  if (
    !isRecord(value) ||
    value.schemaVersion !== '1.0.0' ||
    !isGeneratedAt(value.generatedAt) ||
    !isRecord(value.analysers) ||
    !Array.isArray(value.findings) ||
    !Array.isArray(value.improvements) ||
    (value.history !== null && !isRecord(value.history))
  ) {
    throw new Error('The scan report response was invalid.')
  }

  const analysers: Record<string, AnalyserStatus> = {}
  for (const [key, status] of Object.entries(value.analysers)) {
    if (!isNonEmptyString(key)) throw new Error('The scan report response was invalid.')
    analysers[key] = parseAnalyserStatus(status)
  }

  const findings = value.findings.map(parseFinding)
  const improvements = value.improvements.map(parseImprovement)
  const history = value.history === null ? null : parseHistory(value.history)

  return {
    schemaVersion: '1.0.0',
    generatedAt: value.generatedAt,
    analysers,
    history,
    findings,
    improvements
  }
}
