import { describe, expect, it } from 'vitest'
import { parseGitRemoteUrl, validateGitRemoteUrl } from '../../src/services/git-remote-url'

describe('git remote URL validation', () => {
  it('accepts canonical GitHub repository URLs', () => {
    const parsed = parseGitRemoteUrl('https://github.com/acme/service.git')
    expect(parsed).toEqual({
      kind: 'github',
      url: 'https://github.com/acme/service',
      owner: 'acme',
      repo: 'service'
    })
    expect(validateGitRemoteUrl('https://github.com/acme/service', 'github')).toBeNull()
  })

  it('accepts canonical GitLab repository URLs', () => {
    const parsed = parseGitRemoteUrl('https://gitlab.com/group/app')
    expect(parsed?.kind).toBe('gitlab')
    expect(validateGitRemoteUrl('https://gitlab.com/group/app', 'gitlab')).toBeNull()
  })

  it('rejects mismatched hosts', () => {
    expect(validateGitRemoteUrl('https://gitlab.com/group/app', 'github')).toBe('wrong-host')
    expect(parseGitRemoteUrl('ftp://github.com/acme/app')).toBeNull()
  })
})
