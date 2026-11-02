import { spawn, type SpawnOptions } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ParsedGitSourceUrl } from './git-url.js'
import type { SourceIngestLimits } from './limits.js'
import { redactKnownToken, redactSecrets } from './redact.js'

export interface GitCloneOptions {
  url: ParsedGitSourceUrl
  branch?: string
  limits: SourceIngestLimits
  githubToken?: string
  gitlabToken?: string
  spawnGit?: typeof spawnGitProcess
}

export interface GitCloneResult {
  directory: string
  cleanup: () => Promise<void>
}

export type SpawnGit = (
  args: string[],
  options: SpawnOptions
) => Promise<{ stdout: string; stderr: string; code: number | null }>

const defaultSpawnGit: SpawnGit = spawnGitProcess

export async function shallowCloneRepository(options: GitCloneOptions): Promise<GitCloneResult> {
  const spawnGit = options.spawnGit ?? defaultSpawnGit
  const directory = await mkdtemp(join(tmpdir(), 'atlasmith-clone-'))
  const args = [
    'clone',
    '--depth',
    '1',
    '--single-branch',
    '--no-tags',
    '--no-recurse-submodules',
    '--config',
    'core.hooksPath=/dev/null',
    '--config',
    'filter.lfs.smudge=false',
    '--config',
    'filter.lfs.required=false',
    '--config',
    'http.followRedirects=false'
  ]

  if (options.branch) {
    args.push('--branch', options.branch)
  }

  args.push(options.url.normalizedUrl, directory)

  const env = { ...process.env, GIT_TERMINAL_PROMPT: '0' }
  const extraHeader = authHeader(options)
  const gitArgs = extraHeader
    ? ['-c', `http.extraHeader=${extraHeader}`, ...args]
    : args

  const tokens = [options.githubToken, options.gitlabToken].filter(Boolean) as string[]
  try {
    const result = await spawnGit(gitArgs, { env, timeoutMs: options.limits.timeoutMs })
    if (result.code !== 0) {
      let message = redactSecrets(result.stderr.trim() || result.stdout.trim() || 'Git clone failed.')
      for (const token of tokens) message = redactKnownToken(message, token)
      throw new Error(message)
    }
    await assertCloneWithinLimits(directory, options.limits)
    return {
      directory,
      cleanup: async () => {
        await rm(directory, { recursive: true, force: true })
      }
    }
  } catch (error) {
    await rm(directory, { recursive: true, force: true })
    throw error
  }
}

function authHeader(options: GitCloneOptions): string | undefined {
  if (options.url.host === 'github.com' && options.githubToken) {
    return `Authorization: Bearer ${options.githubToken}`
  }
  if (options.url.host === 'gitlab.com' && options.gitlabToken) {
    return `Authorization: Bearer ${options.gitlabToken}`
  }
  return undefined
}

async function assertCloneWithinLimits(directory: string, limits: SourceIngestLimits): Promise<void> {
  const config = await readFile(join(directory, '.git', 'config'), 'utf8').catch(() => '')
  if (!/url\s*=\s*https:\/\/(github\.com|gitlab\.com)\//.test(config)) {
    throw new Error('Cloned repository origin is not on an allowlisted host.')
  }

  let fileCount = 0
  let totalBytes = 0
  const { walk } = await import('./tree-stats.js')
  for await (const entry of walk(directory)) {
    if (entry.isSymlink) throw new Error('Cloned repository contains symbolic links.')
    if (entry.isFile) {
      fileCount += 1
      totalBytes += entry.size
      if (fileCount > limits.maxFileCount) {
        throw new Error('Repository exceeds the configured file count limit.')
      }
      if (totalBytes > limits.maxRepoBytes) {
        throw new Error('Repository exceeds the configured size limit.')
      }
    }
  }
}

async function spawnGitProcess(
  args: string[],
  options: SpawnOptions & { timeoutMs?: number }
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('git', args, {
      ...options,
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let stdout = ''
    let stderr = ''
    child.stdout?.on('data', chunk => { stdout += String(chunk) })
    child.stderr?.on('data', chunk => { stderr += String(chunk) })
    const timer = options.timeoutMs
      ? setTimeout(() => {
          child.kill('SIGKILL')
          reject(new Error('Git clone timed out.'))
        }, options.timeoutMs)
      : undefined
    child.on('error', error => {
      if (timer) clearTimeout(timer)
      reject(error)
    })
    child.on('close', code => {
      if (timer) clearTimeout(timer)
      resolvePromise({ stdout, stderr, code })
    })
  })
}

export { spawnGitProcess }
