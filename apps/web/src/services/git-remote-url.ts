export type GitRemoteKind = 'github' | 'gitlab'

export interface ParsedGitRemote {
  kind: GitRemoteKind
  url: string
  owner: string
  repo: string
}

const GITHUB_HOSTS = new Set(['github.com', 'www.github.com'])
const GITLAB_HOSTS = new Set(['gitlab.com', 'www.gitlab.com'])

function normalizeRepoSegment(segment: string): string | null {
  const trimmed = segment.replace(/\.git$/i, '').trim()
  if (!trimmed || trimmed.includes('/') || trimmed === '.' || trimmed === '..') return null
  return trimmed
}

export function parseGitRemoteUrl(raw: string): ParsedGitRemote | null {
  const input = raw.trim()
  if (!input) return null

  let parsed: URL
  try {
    parsed = new URL(input)
  } catch {
    return null
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null
  const host = parsed.hostname.toLowerCase()
  const segments = parsed.pathname.split('/').filter(Boolean)
  if (segments.length < 2) return null

  const owner = segments[0]!
  const repo = normalizeRepoSegment(segments[1]!)
  if (!repo) return null

  if (GITHUB_HOSTS.has(host)) {
    if (segments.length > 2 && !['tree', 'blob', 'src'].includes(segments[2]!)) return null
    const url = `https://github.com/${owner}/${repo}`
    return { kind: 'github', url, owner, repo }
  }

  if (GITLAB_HOSTS.has(host)) {
    if (segments.length > 2 && segments[2] !== '-') return null
    const url = `https://gitlab.com/${owner}/${repo}`
    return { kind: 'gitlab', url, owner, repo }
  }

  return null
}

export function validateGitRemoteUrl(raw: string, expected: GitRemoteKind): string | null {
  const parsed = parseGitRemoteUrl(raw)
  if (!parsed) return 'invalid'
  if (parsed.kind !== expected) return 'wrong-host'
  return null
}
