import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assertAllowlistedGitHttpsUrl,
  isAllowlistedGitHttpsUrl,
  parseAllowlistedGitHttpsUrl
} from './git-url.js'

test('accepts allowlisted https repository URLs without credentials', () => {
  const parsed = assertAllowlistedGitHttpsUrl('https://github.com/org/repo')
  assert.equal(parsed.host, 'github.com')
  assert.equal(parsed.owner, 'org')
  assert.equal(parsed.repo, 'repo')
  assert.equal(parsed.normalizedUrl, 'https://github.com/org/repo.git')
})

test('rejects ssh, file, credential, and unsupported hosts', () => {
  assert.equal(isAllowlistedGitHttpsUrl('git@github.com:org/repo.git'), false)
  assert.equal(isAllowlistedGitHttpsUrl('ssh://git@github.com/org/repo.git'), false)
  assert.equal(isAllowlistedGitHttpsUrl('file:///tmp/repo'), false)
  assert.equal(isAllowlistedGitHttpsUrl('https://token@github.com/org/repo'), false)
  assert.equal(isAllowlistedGitHttpsUrl('https://example.com/org/repo'), false)
  assert.throws(() => assertAllowlistedGitHttpsUrl('https://token@gitlab.com/group/project'), /Only https/)
})

test('normalizes gitlab URLs and optional .git suffix', () => {
  const parsed = parseAllowlistedGitHttpsUrl('https://gitlab.com/group/subgroup/project.git')
  assert.equal(parsed?.host, 'gitlab.com')
  assert.equal(parsed?.repo, 'project')
})
