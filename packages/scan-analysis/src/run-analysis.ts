import { analyseHistory } from './analysers/history.js'
import { analyseSecurity } from './analysers/security.js'
import { analyseViolations } from './analysers/violations.js'
import { analyseGraphHeuristics } from './graph-heuristics.js'
import { buildImprovements } from './improvements.js'
import {
  DEFAULT_SCAN_ANALYSIS_LIMITS,
  REPORT_SCHEMA_VERSION,
  type ScanAnalysisLimits,
  type ScanAnalysisOptions,
  type ScanReport
} from './types.js'
import { validateScanReport } from './validate.js'

export async function runScanAnalysis(options: ScanAnalysisOptions): Promise<ScanReport> {
  const limits: ScanAnalysisLimits = {
    ...DEFAULT_SCAN_ANALYSIS_LIMITS,
    ...options.limits
  }
  const now = options.now ?? (() => new Date())

  const historyResult = await analyseHistory({
    rootDir: options.rootDir,
    hasGit: options.hasGit,
    limits,
    runCommand: options.runCommand
  })

  const violations = await analyseViolations({
    rootDir: options.rootDir,
    limits,
    runCommand: options.runCommand
  })

  const security = await analyseSecurity({
    rootDir: options.rootDir,
    limits,
    runCommand: options.runCommand
  })

  const graphStarted = Date.now()
  const graphHeuristics = analyseGraphHeuristics(options.graph)
  const graphDuration = Date.now() - graphStarted

  const findings = [
    ...historyResult.findings,
    ...violations.findings,
    ...security.findings,
    ...graphHeuristics.badPractices,
    ...graphHeuristics.removals
  ]

  const report: ScanReport = {
    schemaVersion: REPORT_SCHEMA_VERSION,
    generatedAt: now().toISOString(),
    analysers: {
      history: historyResult.status,
      eslint: violations.eslint,
      ruff: violations.ruff,
      semgrep: security.semgrep,
      gitleaks: security.gitleaks,
      'npm-audit': security.npmAudit,
      'pip-audit': security.pipAudit,
      'graph-heuristics': { status: 'ran', durationMs: graphDuration }
    },
    history: historyResult.history,
    findings,
    improvements: buildImprovements(findings)
  }

  validateScanReport(report)
  return report
}

export type { ScanReport, ScanFinding, ScanImprovement } from './types.js'
export { REPORT_SCHEMA_VERSION, DEFAULT_SCAN_ANALYSIS_LIMITS } from './types.js'
export { validateScanReport } from './validate.js'
export { analyseGraphHeuristics } from './graph-heuristics.js'
