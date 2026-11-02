import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import type { AdapterParseResult } from '../adapters/adapter.js'
import { makeTree } from '../test-support/tmp.js'
import { ContentCache, contentHash, defaultCacheDir, isInsideRoot } from './content-cache.js'

const sample: AdapterParseResult = {
  references: [],
  symbols: [],
  syntaxErrorCount: 0,
  syntaxErrors: [],
  omitted: { longNames: 0, symbols: 0, edges: 0 },
  redactions: 0
}

const key = {
  contentHash: contentHash(Buffer.from('export {}\n')),
  adapterId: 'typescript-javascript',
  adapterVersion: '1',
  grammarFingerprint: 'abc',
  limitsTag: '1:1:1'
}

test('the default cache directory is outside the scan root', () => {
  const { root, cleanup } = makeTree({ 'a.ts': 'export {}\n' })
  try {
    const directory = defaultCacheDir(root)
    assert.equal(isInsideRoot(root, directory), false)
  } finally {
    cleanup()
  }
})

test('a valid entry hits and a tampered entry is a miss', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'content-cache-'))
  const cache = new ContentCache(directory, true)
  assert.equal(await cache.get(key), undefined)
  assert.equal(cache.misses, 1)
  await cache.set(key, sample)
  const hit = await cache.get(key)
  assert.deepEqual(hit, sample)
  assert.equal(cache.hits, 1)

  const tampered = new ContentCache(directory, true)
  const { readFileSync, writeFileSync } = await import('node:fs')
  const file = join(directory, key.contentHash.slice(0, 2), `${key.contentHash}.json`)
  const parsed = JSON.parse(readFileSync(file, 'utf8')) as { adapterVersion: string }
  parsed.adapterVersion = 'other'
  writeFileSync(file, JSON.stringify(parsed))
  assert.equal(await tampered.get(key), undefined)
  assert.equal(tampered.misses, 1)
})

test('a disabled cache does not read or write', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'content-cache-off-'))
  const cache = new ContentCache(directory, false)
  await cache.set(key, sample)
  assert.equal(await cache.get(key), undefined)
  assert.equal(cache.hits, 0)
  assert.equal(cache.misses, 0)
})
