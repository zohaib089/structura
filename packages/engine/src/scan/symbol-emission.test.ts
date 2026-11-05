import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { makeTree } from '../test-support/tmp.js'
import { scanRepository } from './scan.js'

test('scanRepository emits symbol nodes for functions and classes with API worker scan options', async () => {
  const { root, cleanup } = makeTree({
    'src/app.ts': [
      '/** Application entry. */',
      'export class App {',
      '  run(): void {}',
      '}',
      'export function main(): void {}'
    ].join('\n'),
    'pkg/util.py': ['"""Utility helpers."""', '', 'class Helper:', '    pass', '', 'def run():', '    pass'].join('\n')
  })
  const out = mkdtempSync(join(tmpdir(), 'sym-scan-'))
  try {
    const result = await scanRepository(root, { outDir: out, noCache: true, metaPath: null, limits: { jobs: 1 } })
    const symbols = result.graph.nodes.filter(node => node.kind === 'symbol')
    assert.ok(symbols.some(node => node.symbolKind === 'class' && node.label === 'App'))
    assert.ok(symbols.some(node => node.symbolKind === 'function' && node.label === 'main'))
    assert.ok(symbols.some(node => node.symbolKind === 'class' && node.label === 'Helper'))
    assert.ok(symbols.some(node => node.symbolKind === 'function' && node.label === 'run'))
    assert.equal(result.fileSummaries['src/app.ts'], 'Application entry.')
    assert.equal(result.fileSummaries['pkg/util.py'], 'Utility helpers.')
  } finally {
    cleanup()
  }
})
