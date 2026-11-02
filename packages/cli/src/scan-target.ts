import {
  assertAllowlistedGitHttpsUrl,
  looksLikeGitRemoteUrl,
  shallowCloneRepository,
  type ParsedGitSourceUrl
} from '@atlasmith/source-ingest'
import { isAbsolute, resolve } from 'node:path'

export interface ResolvedScanRoot {
  path: string
  cleanup: () => Promise<void>
}

export async function resolveScanTarget(
  target: string,
  options: { branch?: string; cwd: string }
): Promise<ResolvedScanRoot> {
  const trimmed = target.trim()
  if (looksLikeGitRemoteUrl(trimmed) && /^https:\/\//i.test(trimmed)) {
    const parsed = assertAllowlistedGitHttpsUrl(trimmed)
    return cloneGitTarget(parsed, options.branch)
  }

  if (looksLikeGitRemoteUrl(trimmed)) {
    throw new Error('Only https://github.com/… and https://gitlab.com/… repository URLs are supported.')
  }

  if (trimmed.startsWith('-')) {
    throw new Error('scan target must be a path or supported git URL.')
  }

  const path = resolve(options.cwd, trimmed || '.')
  return { path, cleanup: async () => undefined }
}

async function cloneGitTarget(url: ParsedGitSourceUrl, branch?: string): Promise<ResolvedScanRoot> {
  const clone = await shallowCloneRepository({
    url,
    branch,
    limits: {
      maxRepoBytes: 200 * 1024 * 1024,
      maxUncompressedBytes: 200 * 1024 * 1024,
      maxFileCount: 50_000,
      timeoutMs: 5 * 60 * 1000
    },
    githubToken: process.env.GITHUB_TOKEN,
    gitlabToken: process.env.GITLAB_TOKEN
  })
  return {
    path: clone.directory,
    cleanup: clone.cleanup
  }
}
