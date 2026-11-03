import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { IncrementalScanCache, scanCacheHeader } from './scan-cache.js'

const sampleResult = {
  references: [],
  symbols: [],
  syntaxErrorCount: 0,
  syntaxErrors: [],
  omitted: { longNames: 0, symbols: 0, edges: 0 },
  redactions: 0
}

const header = scanCacheHeader('0.1.0', 'abc', { maxIdentifierLength: 256, maxSymbolsPerFile: 10_000, maxEdgesPerFile: 10_000 }, 'fp')

test('incremental cache round-trips through disk and invalidates on header mismatch', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'scan-cache-manifest-'))
  const path = join(dir, 'cache.json')
  try {
    const cache = new IncrementalScanCache(header)
    cache.remember('src/a.ts', {
      contentHash: 'aa',
      adapterId: 'ts-js',
      adapterVersion: '1',
      grammarFingerprint: 'fp',
      limitsTag: header.limitsTag
    }, sampleResult)
    await cache.save(path)
    const loaded = await IncrementalScanCache.load(path, header)
    assert.ok(loaded)
    assert.equal(loaded.lookup('src/a.ts', 'aa', 'ts-js', '1')?.symbols.length, 0)
    assert.equal(loaded.hits, 1)
    const wrongHeader = scanCacheHeader('0.2.0', 'abc', { maxIdentifierLength: 256, maxSymbolsPerFile: 10_000, maxEdgesPerFile: 10_000 }, 'fp')
    assert.equal(await IncrementalScanCache.load(path, wrongHeader), undefined)
    assert.equal(JSON.parse(readFileSync(path, 'utf8')).files.length, 1)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('dropRemoved counts paths dropped from the manifest', () => {
  const cache = new IncrementalScanCache(header)
  cache.remember('keep.ts', {
    contentHash: 'x',
    adapterId: 'ts-js',
    adapterVersion: '1',
    grammarFingerprint: 'fp',
    limitsTag: header.limitsTag
  }, sampleResult)
  cache.remember('gone.ts', {
    contentHash: 'y',
    adapterId: 'ts-js',
    adapterVersion: '1',
    grammarFingerprint: 'fp',
    limitsTag: header.limitsTag
  }, sampleResult)
  cache.dropRemoved(new Set(['keep.ts']))
  assert.equal(cache.removed, 1)
  assert.equal(cache.lookup('gone.ts', 'y', 'ts-js', '1'), undefined)
})
