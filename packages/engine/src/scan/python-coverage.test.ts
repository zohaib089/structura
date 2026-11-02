import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { makeTree } from '../test-support/tmp.js'
import { scanRepository } from './scan.js'

test('python-only repositories parse under strict mode', async () => {
  const { root, cleanup } = makeTree({
    'app/main.py': 'import os\nfrom . import util\n',
    'app/util.py': 'VALUE = 1\n',
    'app/__init__.py': ''
  })
  const out = mkdtempSync(join(tmpdir(), 'py-scan-'))
  try {
    const result = await scanRepository(root, { outDir: out, noCache: true, metaPath: null, strict: true, limits: { jobs: 1 } })
    assert.equal(result.strictFailures.length, 0)
    assert.ok(result.graph.coverage.files.parsed >= 3)
    assert.equal(result.graph.coverage.byLanguage.find(row => row.language === 'python')?.parsed, 3)
  } finally {
    cleanup()
  }
})
