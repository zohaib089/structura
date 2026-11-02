import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import test from 'node:test'
import { shallowCloneRepository } from './git-clone.js'
import { DEFAULT_SOURCE_INGEST_LIMITS } from './limits.js'

test('shallowCloneRepository redacts tokens from mocked git failures', async () => {
  await assert.rejects(
    shallowCloneRepository({
      url: {
        host: 'github.com',
        owner: 'org',
        repo: 'repo',
        normalizedUrl: 'https://github.com/org/repo.git'
      },
      limits: DEFAULT_SOURCE_INGEST_LIMITS,
      githubToken: 'ghp_testtoken12345678901234567890123456789012',
      spawnGit: async () => ({
        stdout: '',
        stderr: 'remote: Invalid username or token ghp_testtoken12345678901234567890123456789012',
        code: 1
      })
    }),
    error => error instanceof Error && !error.message.includes('ghp_testtoken') && error.message.includes('[REDACTED]')
  )
})

test('shallowCloneRepository succeeds with mocked git output', async () => {
  const clone = await shallowCloneRepository({
    url: {
      host: 'gitlab.com',
      owner: 'group',
      repo: 'project',
      normalizedUrl: 'https://gitlab.com/group/project.git'
    },
    limits: DEFAULT_SOURCE_INGEST_LIMITS,
    spawnGit: async args => {
      const directory = args.at(-1)
      assert.equal(typeof directory, 'string')
      await mkdir(join(directory!, '.git'), { recursive: true })
      await writeFile(
        join(directory!, '.git', 'config'),
        '[remote "origin"]\n\turl = https://gitlab.com/group/project.git\n'
      )
      await writeFile(join(directory!, 'README.md'), 'hello')
      return { stdout: '', stderr: '', code: 0 }
    }
  })

  try {
    assert.ok(clone.directory.includes('atlasmith-clone-'))
  } finally {
    await clone.cleanup()
  }
})
