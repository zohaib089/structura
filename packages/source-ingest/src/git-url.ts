export type AllowedGitHost = 'github.com' | 'gitlab.com'

export interface ParsedGitSourceUrl {
  host: AllowedGitHost
  owner: string
  repo: string
  branch?: string
  normalizedUrl: string
}

const ALLOWED_HOSTS = new Set<AllowedGitHost>(['github.com', 'gitlab.com'])

export function isAllowlistedGitHttpsUrl(value: string): boolean {
  return parseAllowlistedGitHttpsUrl(value) !== null
}

export function parseAllowlistedGitHttpsUrl(value: string): ParsedGitSourceUrl | null {
  let parsed: URL
  try {
    parsed = new URL(value.trim())
  } catch {
    return null
  }

  if (parsed.protocol !== 'https:') return null
  if (parsed.username || parsed.password) return null
  if (parsed.hash) return null
  if (parsed.search) return null
  if (!ALLOWED_HOSTS.has(parsed.hostname as AllowedGitHost)) return null

  const segments = parsed.pathname.split('/').filter(Boolean)
  if (segments.length < 2) return null

  const host = parsed.hostname as AllowedGitHost
  let owner: string
  let repo: string

  if (host === 'github.com') {
    if (segments.length > 2 && segments[2] !== 'tree' && segments[2] !== 'blob') return null
    owner = decodeURIComponent(segments[0] ?? '')
    repo = decodeURIComponent(stripGitSuffix(segments[1] ?? ''))
  } else {
    owner = decodeURIComponent(segments.slice(0, -1).join('/'))
    repo = decodeURIComponent(stripGitSuffix(segments.at(-1) ?? ''))
  }

  if (!owner || !repo) return null
  if (!isSafeRepoSegment(owner) || !isSafeRepoSegment(repo)) return null
  if (host === 'github.com' && owner.includes('/')) return null

  const path = host === 'github.com'
    ? `${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
    : `${owner.split('/').map(segment => encodeURIComponent(segment)).join('/')}/${encodeURIComponent(repo)}`

  const normalizedUrl = `https://${host}/${path}.git`
  return { host, owner, repo, normalizedUrl }
}

function stripGitSuffix(value: string): string {
  return value.endsWith('.git') ? value.slice(0, -4) : value
}

export function assertAllowlistedGitHttpsUrl(value: string): ParsedGitSourceUrl {
  const parsed = parseAllowlistedGitHttpsUrl(value)
  if (!parsed) {
    throw new Error('Only https://github.com/… and https://gitlab.com/… repository URLs are supported.')
  }
  return parsed
}

export function looksLikeGitRemoteUrl(value: string): boolean {
  const trimmed = value.trim()
  if (/^git@/i.test(trimmed)) return true
  if (/^ssh:\/\//i.test(trimmed)) return true
  if (/^file:\/\//i.test(trimmed)) return true
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed)
      return url.hostname.includes('github') || url.hostname.includes('gitlab') || url.hostname.length > 0
    } catch {
      return true
    }
  }
  return false
}

function isSafeRepoSegment(value: string): boolean {
  if (value.length === 0 || value.length > 200) return false
  if (value === '.' || value === '..') return false
  if (/[\u0000-\u001f\u007f]/.test(value)) return false
  return true
}
