import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defaultRunCommand, minimalProcessEnv, pathExists, which } from '../sandbox.js'
import type { AnalyserStatus, RunCommandFn, ScanAnalysisLimits, ScanFinding } from '../types.js'
import { findingId } from '../types.js'

const MINIMAL_ESLINT_CONFIG = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'configs', 'eslint.minimal.json')
const RUFF_MINIMAL_CONFIG = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'configs', 'ruff.minimal.toml')

export interface ViolationAnalyserResult {
  eslint: AnalyserStatus
  ruff: AnalyserStatus
  findings: ScanFinding[]
}

export async function analyseViolations(options: {
  rootDir: string
  limits: ScanAnalysisLimits
  runCommand?: RunCommandFn
}): Promise<ViolationAnalyserResult> {
  const runCommand = options.runCommand ?? defaultRunCommand
  const env = minimalProcessEnv()
  const [eslint, ruffFindings] = await Promise.all([
    runEslint(options.rootDir, env, runCommand, options.limits),
    runRuff(options.rootDir, env, runCommand, options.limits)
  ])
  return {
    eslint: eslint.status,
    ruff: ruffFindings.status,
    findings: [...eslint.findings, ...ruffFindings.findings]
  }
}

async function runEslint(
  rootDir: string,
  env: NodeJS.ProcessEnv,
  runCommand: RunCommandFn,
  limits: ScanAnalysisLimits
): Promise<{ status: AnalyserStatus; findings: ScanFinding[] }> {
  const started = Date.now()
  const eslintPath = await which('eslint', env)
  if (!eslintPath) {
    return {
      status: {
        status: 'skipped',
        reason: 'eslint not found on PATH.',
        durationMs: Date.now() - started
      },
      findings: []
    }
  }

  const projectConfig = await hasEslintConfig(rootDir)
  const args = ['--format', 'json', '--no-error-on-unmatched-pattern']
  if (projectConfig) {
    args.push('--config', projectConfig)
  } else {
    args.push('--no-eslintrc', '--config', MINIMAL_ESLINT_CONFIG)
  }
  args.push('.', '--ext', '.js,.jsx,.ts,.tsx,.mjs,.cjs')

  const result = await runCommand(eslintPath, args, {
    cwd: rootDir,
    timeoutMs: limits.toolTimeoutMs,
    maxOutputBytes: limits.maxToolOutputBytes,
    env
  })
  if (result.timedOut) {
    return {
      status: { status: 'timeout', reason: 'eslint timed out.', durationMs: Date.now() - started },
      findings: []
    }
  }
  if (result.spawnError) {
    return {
      status: { status: 'failed', reason: result.spawnError, durationMs: Date.now() - started },
      findings: []
    }
  }

  const findings = parseEslintJson(result.stdout)
  return {
    status: {
      status: 'ran',
      durationMs: Date.now() - started,
      ...(result.code !== 0 && result.code !== 1 ? { reason: result.stderr.trim() || undefined } : {})
    },
    findings
  }
}

async function hasEslintConfig(rootDir: string): Promise<string | null> {
  const candidates = [
    'eslint.config.js',
    'eslint.config.mjs',
    'eslint.config.cjs',
    '.eslintrc.json',
    '.eslintrc.js',
    '.eslintrc.cjs'
  ]
  for (const name of candidates) {
    const full = join(rootDir, name)
    if (await pathExists(full)) return full
  }
  return null
}

function parseEslintJson(stdout: string): ScanFinding[] {
  try {
    const reports = JSON.parse(stdout) as Array<{
      filePath?: string
      messages?: Array<{ line?: number; severity?: number; message?: string; ruleId?: string | null }>
    }>
    const findings: ScanFinding[] = []
    for (const fileReport of reports) {
      const file = fileReport.filePath ?? ''
      for (const message of fileReport.messages ?? []) {
        if (!message.message) continue
        const rule = message.ruleId ?? undefined
        findings.push({
          id: findingId(['violations', 'eslint', file, String(message.line ?? 0), rule ?? '', message.message]),
          section: 'violations',
          severity: eslintSeverity(message.severity),
          file,
          line: message.line,
          message: message.message,
          rule: rule ?? undefined,
          tool: 'eslint',
          provenance: 'EXTRACTED'
        })
      }
    }
    return findings
  } catch {
    return []
  }
}

function eslintSeverity(value: number | undefined): ScanFinding['severity'] {
  if (value === 2) return 'high'
  if (value === 1) return 'medium'
  return 'low'
}

async function runRuff(
  rootDir: string,
  env: NodeJS.ProcessEnv,
  runCommand: RunCommandFn,
  limits: ScanAnalysisLimits
): Promise<{ status: AnalyserStatus; findings: ScanFinding[] }> {
  const started = Date.now()
  const ruffPath = await which('ruff', env)
  if (!ruffPath) {
    return {
      status: {
        status: 'skipped',
        reason: 'ruff not found on PATH.',
        durationMs: Date.now() - started
      },
      findings: []
    }
  }

  const hasPy = await pathExists(join(rootDir, 'pyproject.toml')) || await pathExists(join(rootDir, 'ruff.toml'))
  const args = ['check', '--output-format', 'json', '.']
  if (!hasPy) args.splice(1, 0, '--isolated', '--config', RUFF_MINIMAL_CONFIG)

  const result = await runCommand(ruffPath, args, {
    cwd: rootDir,
    timeoutMs: limits.toolTimeoutMs,
    maxOutputBytes: limits.maxToolOutputBytes,
    env
  })
  if (result.timedOut) {
    return { status: { status: 'timeout', reason: 'ruff timed out.', durationMs: Date.now() - started }, findings: [] }
  }
  if (result.spawnError) {
    return { status: { status: 'failed', reason: result.spawnError, durationMs: Date.now() - started }, findings: [] }
  }

  return {
    status: { status: 'ran', durationMs: Date.now() - started },
    findings: parseRuffJson(result.stdout)
  }
}

function parseRuffJson(stdout: string): ScanFinding[] {
  try {
    const items = JSON.parse(stdout) as Array<{
      filename?: string
      location?: { row?: number }
      message?: string
      code?: string
    }>
    return items.map(item => ({
      id: findingId(['violations', 'ruff', item.filename ?? '', String(item.location?.row ?? 0), item.code ?? '', item.message ?? '']),
      section: 'violations' as const,
      severity: 'medium' as const,
      file: item.filename ?? '',
      line: item.location?.row,
      message: item.message ?? 'Ruff violation',
      rule: item.code,
      tool: 'ruff',
      provenance: 'EXTRACTED' as const
    }))
  } catch {
    return []
  }
}
