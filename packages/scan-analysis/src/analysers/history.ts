import { join } from 'node:path'
import { defaultRunCommand, minimalProcessEnv, pathExists, which } from '../sandbox.js'
import type {
  AnalyserStatus,
  HistoryPayload,
  RunCommandFn,
  ScanAnalysisLimits,
  ScanFinding
} from '../types.js'
import { findingId } from '../types.js'

export interface HistoryAnalyserResult {
  status: AnalyserStatus
  history: HistoryPayload | null
  findings: ScanFinding[]
}

export async function analyseHistory(options: {
  rootDir: string
  hasGit: boolean
  limits: ScanAnalysisLimits
  runCommand?: RunCommandFn
}): Promise<HistoryAnalyserResult> {
  const started = Date.now()
  const runCommand = options.runCommand ?? defaultRunCommand
  const env = minimalProcessEnv()

  if (!options.hasGit) {
    return {
      status: {
        status: 'skipped',
        reason: 'Upload scan has no .git directory.',
        durationMs: Date.now() - started
      },
      history: null,
      findings: []
    }
  }

  const gitPath = await which('git', env)
  if (!gitPath) {
    return {
      status: {
        status: 'skipped',
        reason: 'git executable not found on PATH.',
        durationMs: Date.now() - started
      },
      history: null,
      findings: []
    }
  }

  const gitDir = join(options.rootDir, '.git')
  if (!(await pathExists(gitDir))) {
    return {
      status: {
        status: 'skipped',
        reason: 'No .git directory in scan root.',
        durationMs: Date.now() - started
      },
      history: null,
      findings: []
    }
  }

  try {
    const depth = options.limits.historyDepth
    const shallow = await isShallowClone(options.rootDir, gitPath, env, runCommand, options.limits)
    if (shallow) {
      await deepenHistory(options.rootDir, gitPath, env, runCommand, options.limits, depth)
    }

    const logResult = await runCommand(
      gitPath,
      ['log', `--max-count=${depth}`, '--format=%H%x09%an%x09%ae%x09%ad%x09%s', '--date=iso-strict'],
      {
        cwd: options.rootDir,
        timeoutMs: options.limits.toolTimeoutMs,
        maxOutputBytes: options.limits.maxToolOutputBytes,
        env
      }
    )
    if (logResult.timedOut) {
      return failHistory(started, 'timeout', 'Git log timed out.')
    }
    if (logResult.spawnError) {
      return failHistory(started, 'failed', logResult.spawnError)
    }
    if (logResult.code !== 0) {
      return failHistory(started, 'failed', logResult.stderr.trim() || 'git log failed.')
    }

    const commits = parseCommitLog(logResult.stdout)
    const authors = aggregateAuthors(commits)
    const fileChurn = await readFileChurn(options.rootDir, gitPath, env, runCommand, options.limits, depth)
    const hotspots = fileChurn
      .map(entry => ({
        path: entry.path,
        score: entry.additions + entry.deletions + entry.commits * 2
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)

    const limitedHistory = shallow && commits.length < depth

    return {
      status: { status: 'ran', durationMs: Date.now() - started },
      history: {
        limitedHistory,
        depthRequested: depth,
        depthAvailable: commits.length,
        commits,
        authors,
        fileChurn,
        hotspots
      },
      findings: hotspots.slice(0, 5).map((spot, index) => ({
        id: findingId(['history', 'hotspot', spot.path, String(index)]),
        section: 'history' as const,
        severity: index === 0 ? 'medium' : 'info',
        file: spot.path,
        message: `High churn hotspot (score ${spot.score}).`,
        rule: 'history/hotspot',
        tool: 'git',
        provenance: 'EXTRACTED' as const
      }))
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return failHistory(started, 'failed', message)
  }
}

function failHistory(started: number, status: 'failed' | 'timeout', reason: string): HistoryAnalyserResult {
  return {
    status: { status, reason, durationMs: Date.now() - started },
    history: null,
    findings: []
  }
}

async function isShallowClone(
  rootDir: string,
  gitPath: string,
  env: NodeJS.ProcessEnv,
  runCommand: RunCommandFn,
  limits: ScanAnalysisLimits
): Promise<boolean> {
  const result = await runCommand(gitPath, ['rev-parse', '--is-shallow-repository'], {
    cwd: rootDir,
    timeoutMs: limits.toolTimeoutMs,
    maxOutputBytes: 4096,
    env
  })
  return result.stdout.trim() === 'true'
}

async function deepenHistory(
  rootDir: string,
  gitPath: string,
  env: NodeJS.ProcessEnv,
  runCommand: RunCommandFn,
  limits: ScanAnalysisLimits,
  depth: number
): Promise<void> {
  await runCommand(
    gitPath,
    ['fetch', '--depth', String(depth), 'origin'],
    {
      cwd: rootDir,
      timeoutMs: limits.toolTimeoutMs,
      maxOutputBytes: limits.maxToolOutputBytes,
      env
    }
  )
}

function parseCommitLog(raw: string) {
  const commits = []
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue
    const [hash, name, email, date, ...subjectParts] = line.split('\t')
    if (!hash || !name || !date) continue
    commits.push({
      hash,
      author: name,
      date,
      subject: subjectParts.join('\t') || ''
    })
  }
  return commits
}

function aggregateAuthors(commits: { author: string; date: string }[]) {
  const counts = new Map<string, { name: string; email?: string; commitCount: number }>()
  for (const commit of commits) {
    const existing = counts.get(commit.author)
    if (existing) existing.commitCount += 1
    else counts.set(commit.author, { name: commit.author, commitCount: 1 })
  }
  return [...counts.values()].sort((a, b) => b.commitCount - a.commitCount)
}

async function readFileChurn(
  rootDir: string,
  gitPath: string,
  env: NodeJS.ProcessEnv,
  runCommand: RunCommandFn,
  limits: ScanAnalysisLimits,
  depth: number
) {
  const result = await runCommand(
    gitPath,
    ['log', `--max-count=${depth}`, '--numstat', '--format=commit'],
    {
      cwd: rootDir,
      timeoutMs: limits.toolTimeoutMs,
      maxOutputBytes: limits.maxToolOutputBytes,
      env
    }
  )
  if (result.code !== 0 || result.timedOut) return []

  const churn = new Map<string, { path: string; additions: number; deletions: number; commits: number }>()
  for (const line of result.stdout.split('\n')) {
    if (!line.trim() || line.startsWith('commit')) continue
    const parts = line.split('\t')
    if (parts.length < 3) continue
    const additions = Number(parts[0])
    const deletions = Number(parts[1])
    const path = parts[2]
    if (!Number.isFinite(additions) || !Number.isFinite(deletions) || !path) continue
    const entry = churn.get(path) ?? { path, additions: 0, deletions: 0, commits: 0 }
    entry.additions += additions
    entry.deletions += deletions
    entry.commits += 1
    churn.set(path, entry)
  }
  return [...churn.values()].sort((a, b) => b.additions + b.deletions - (a.additions + a.deletions)).slice(0, 100)
}
