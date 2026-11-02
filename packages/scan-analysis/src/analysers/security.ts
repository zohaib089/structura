import { join } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { redactSecrets } from '@atlasmith/source-ingest'
import { defaultRunCommand, minimalProcessEnv, pathExists, which } from '../sandbox.js'
import type { AnalyserStatus, RunCommandFn, ScanAnalysisLimits, ScanFinding } from '../types.js'
import { findingId } from '../types.js'

const RUFF_MINIMAL = join(dirname(fileURLToPath(import.meta.url)), '..', 'configs', 'ruff.minimal.toml')

export interface SecurityAnalyserResult {
  semgrep: AnalyserStatus
  gitleaks: AnalyserStatus
  npmAudit: AnalyserStatus
  pipAudit: AnalyserStatus
  findings: ScanFinding[]
}

export async function analyseSecurity(options: {
  rootDir: string
  limits: ScanAnalysisLimits
  runCommand?: RunCommandFn
}): Promise<SecurityAnalyserResult> {
  const runCommand = options.runCommand ?? defaultRunCommand
  const env = minimalProcessEnv()
  const semgrep = await runSemgrep(options.rootDir, env, runCommand, options.limits)
  const gitleaks = await runGitleaks(options.rootDir, env, runCommand, options.limits)
  const npmAudit = await runNpmAudit(options.rootDir, env, runCommand, options.limits)
  const pipAudit = await runPipAudit(options.rootDir, env, runCommand, options.limits)
  return {
    semgrep: semgrep.status,
    gitleaks: gitleaks.status,
    npmAudit: npmAudit.status,
    pipAudit: pipAudit.status,
    findings: [...semgrep.findings, ...gitleaks.findings, ...npmAudit.findings, ...pipAudit.findings]
  }
}

async function runSemgrep(
  rootDir: string,
  env: NodeJS.ProcessEnv,
  runCommand: RunCommandFn,
  limits: ScanAnalysisLimits
): Promise<{ status: AnalyserStatus; findings: ScanFinding[] }> {
  const started = Date.now()
  const semgrepPath = await which('semgrep', env)
  if (!semgrepPath) {
    return {
      status: { status: 'skipped', reason: 'semgrep not found on PATH.', durationMs: Date.now() - started },
      findings: []
    }
  }

  const result = await runCommand(
    semgrepPath,
    ['scan', '--config', 'p/default', '--json', '--quiet', '--metrics=off', rootDir],
    {
      cwd: rootDir,
      timeoutMs: limits.toolTimeoutMs,
      maxOutputBytes: limits.maxToolOutputBytes,
      env: { ...env, SEMGREP_SEND_METRICS: 'off' }
    }
  )
  if (result.timedOut) {
    return { status: { status: 'timeout', reason: 'semgrep timed out.', durationMs: Date.now() - started }, findings: [] }
  }
  if (result.spawnError) {
    return { status: { status: 'failed', reason: result.spawnError, durationMs: Date.now() - started }, findings: [] }
  }

  return {
    status: { status: 'ran', durationMs: Date.now() - started },
    findings: parseSemgrepJson(result.stdout)
  }
}

function parseSemgrepJson(stdout: string): ScanFinding[] {
  try {
    const payload = JSON.parse(stdout) as {
      results?: Array<{
        path?: string
        start?: { line?: number }
        extra?: { message?: string; severity?: string; metadata?: { shortlink?: string } }
        check_id?: string
      }>
    }
    return (payload.results ?? []).map(item => ({
      id: findingId(['security', 'semgrep', item.path ?? '', String(item.start?.line ?? 0), item.check_id ?? '']),
      section: 'security' as const,
      severity: mapSemgrepSeverity(item.extra?.severity),
      file: item.path ?? '',
      line: item.start?.line,
      message: redactSecrets(item.extra?.message ?? 'Semgrep finding'),
      rule: item.check_id,
      tool: 'semgrep',
      provenance: 'EXTRACTED' as const
    }))
  } catch {
    return []
  }
}

function mapSemgrepSeverity(raw: string | undefined): ScanFinding['severity'] {
  const value = (raw ?? '').toUpperCase()
  if (value === 'ERROR') return 'high'
  if (value === 'WARNING') return 'medium'
  return 'low'
}

async function runGitleaks(
  rootDir: string,
  env: NodeJS.ProcessEnv,
  runCommand: RunCommandFn,
  limits: ScanAnalysisLimits
): Promise<{ status: AnalyserStatus; findings: ScanFinding[] }> {
  const started = Date.now()
  const gitleaksPath = await which('gitleaks', env)
  if (!gitleaksPath) {
    return {
      status: { status: 'skipped', reason: 'gitleaks not found on PATH.', durationMs: Date.now() - started },
      findings: []
    }
  }

  const result = await runCommand(
    gitleaksPath,
    ['detect', '--source', rootDir, '--no-banner', '--report-format', 'json', '--report-path', '/dev/stdout'],
    {
      cwd: rootDir,
      timeoutMs: limits.toolTimeoutMs,
      maxOutputBytes: limits.maxToolOutputBytes,
      env
    }
  )
  if (result.timedOut) {
    return { status: { status: 'timeout', reason: 'gitleaks timed out.', durationMs: Date.now() - started }, findings: [] }
  }
  if (result.spawnError) {
    return { status: { status: 'failed', reason: result.spawnError, durationMs: Date.now() - started }, findings: [] }
  }

  const findings = parseGitleaksJson(result.stdout)
  return {
    status: { status: 'ran', durationMs: Date.now() - started },
    findings
  }
}

function parseGitleaksJson(stdout: string): ScanFinding[] {
  if (!stdout.trim()) return []
  try {
    const items = JSON.parse(stdout) as Array<{
      File?: string
      StartLine?: number
      RuleID?: string
      Description?: string
      Secret?: string
    }>
    return items.map(item => ({
      id: findingId(['security', 'gitleaks', item.File ?? '', String(item.StartLine ?? 0), item.RuleID ?? '']),
      section: 'security' as const,
      severity: 'critical' as const,
      file: item.File ?? '',
      line: item.StartLine,
      message: redactSecrets(item.Description ?? 'Potential secret detected'),
      rule: item.RuleID,
      tool: 'gitleaks',
      provenance: 'EXTRACTED' as const
    }))
  } catch {
    return []
  }
}

async function runNpmAudit(
  rootDir: string,
  env: NodeJS.ProcessEnv,
  runCommand: RunCommandFn,
  limits: ScanAnalysisLimits
): Promise<{ status: AnalyserStatus; findings: ScanFinding[] }> {
  const started = Date.now()
  const lockPath = join(rootDir, 'package-lock.json')
  if (!(await pathExists(lockPath))) {
    return {
      status: { status: 'skipped', reason: 'No package-lock.json present.', durationMs: Date.now() - started },
      findings: []
    }
  }
  const npmPath = await which('npm', env)
  if (!npmPath) {
    return {
      status: { status: 'skipped', reason: 'npm not found on PATH.', durationMs: Date.now() - started },
      findings: []
    }
  }

  const args = ['audit', '--json', '--package-lock-only']
  if (!limits.allowNetwork) args.push('--offline')

  const result = await runCommand(npmPath, args, {
    cwd: rootDir,
    timeoutMs: limits.toolTimeoutMs,
    maxOutputBytes: limits.maxToolOutputBytes,
    env
  })
  if (result.timedOut) {
    return { status: { status: 'timeout', reason: 'npm audit timed out.', durationMs: Date.now() - started }, findings: [] }
  }
  if (result.spawnError) {
    return { status: { status: 'failed', reason: result.spawnError, durationMs: Date.now() - started }, findings: [] }
  }
  if (!limits.allowNetwork && /ENOTFOUND|ECONNREFUSED|offline/i.test(result.stderr + result.stdout)) {
    return {
      status: { status: 'skipped', reason: 'npm audit requires network; offline mode enabled.', durationMs: Date.now() - started },
      findings: []
    }
  }

  return {
    status: { status: 'ran', durationMs: Date.now() - started },
    findings: parseNpmAuditJson(result.stdout, lockPath)
  }
}

function parseNpmAuditJson(stdout: string, lockPath: string): ScanFinding[] {
  try {
    const payload = JSON.parse(stdout) as {
      vulnerabilities?: Record<string, { severity?: string; via?: unknown[]; name?: string }>
    }
    const findings: ScanFinding[] = []
    for (const [name, detail] of Object.entries(payload.vulnerabilities ?? {})) {
      findings.push({
        id: findingId(['security', 'npm-audit', name]),
        section: 'security',
        severity: mapAuditSeverity(detail.severity),
        file: lockPath,
        message: `npm advisory for ${name}`,
        rule: name,
        tool: 'npm-audit',
        provenance: 'EXTRACTED'
      })
    }
    return findings
  } catch {
    return []
  }
}

async function runPipAudit(
  rootDir: string,
  env: NodeJS.ProcessEnv,
  runCommand: RunCommandFn,
  limits: ScanAnalysisLimits
): Promise<{ status: AnalyserStatus; findings: ScanFinding[] }> {
  const started = Date.now()
  const pipAuditPath = await which('pip-audit', env)
  if (!pipAuditPath) {
    return {
      status: { status: 'skipped', reason: 'pip-audit not found on PATH.', durationMs: Date.now() - started },
      findings: []
    }
  }

  const requirements = ['requirements.txt', 'requirements.lock', 'Pipfile.lock', 'poetry.lock']
  let reqFile: string | null = null
  for (const name of requirements) {
    const full = join(rootDir, name)
    if (await pathExists(full)) {
      reqFile = full
      break
    }
  }
  if (!reqFile) {
    return {
      status: { status: 'skipped', reason: 'No Python lockfile or requirements file found.', durationMs: Date.now() - started },
      findings: []
    }
  }

  const args = ['-r', reqFile, '--format', 'json']
  if (!limits.allowNetwork) args.push('--local')

  const result = await runCommand(pipAuditPath, args, {
    cwd: rootDir,
    timeoutMs: limits.toolTimeoutMs,
    maxOutputBytes: limits.maxToolOutputBytes,
    env
  })
  if (result.timedOut) {
    return { status: { status: 'timeout', reason: 'pip-audit timed out.', durationMs: Date.now() - started }, findings: [] }
  }
  if (result.spawnError) {
    return { status: { status: 'failed', reason: result.spawnError, durationMs: Date.now() - started }, findings: []  }
  }
  if (!limits.allowNetwork && result.code !== 0) {
    return {
      status: { status: 'skipped', reason: 'pip-audit unavailable offline.', durationMs: Date.now() - started },
      findings: []
    }
  }

  return {
    status: { status: 'ran', durationMs: Date.now() - started },
    findings: parsePipAuditJson(result.stdout, reqFile)
  }
}

function parsePipAuditJson(stdout: string, reqFile: string): ScanFinding[] {
  try {
    const items = JSON.parse(stdout) as Array<{ name?: string; version?: string; id?: string }>
    return items.map(item => ({
      id: findingId(['security', 'pip-audit', item.name ?? '', item.id ?? '']),
      section: 'security' as const,
      severity: 'high' as const,
      file: reqFile,
      message: `pip-audit advisory ${item.id ?? ''} for ${item.name ?? 'package'}`,
      rule: item.id,
      tool: 'pip-audit',
      provenance: 'EXTRACTED' as const
    }))
  } catch {
    return []
  }
}

function mapAuditSeverity(raw: string | undefined): ScanFinding['severity'] {
  const value = (raw ?? '').toLowerCase()
  if (value === 'critical') return 'critical'
  if (value === 'high') return 'high'
  if (value === 'moderate' || value === 'medium') return 'medium'
  return 'low'
}