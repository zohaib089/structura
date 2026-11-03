import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { CONFIG_FILE } from '../brand.js'
import { GraphBuilder } from '../graph/builder.js'
import { validateStrict } from '../graph/validate-strict.js'
import { assignModule, buildModuleMap } from './assign-modules.js'
import { ArchitectureConfigError } from './errors.js'
import { detectArchitectureDrift } from './drift.js'
import { loadArchitectureFromYaml } from './load-config.js'
import { resolveArchitectureConfig } from './validate-config.js'
import { scanRepository } from '../scan/scan.js'

test('assignModule uses first matching glob', () => {
  const modules = [
    { name: 'api', paths: ['src/api/**'] },
    { name: 'app', paths: ['src/**'] }
  ]
  assert.equal(assignModule('src/api/routes.ts', modules), 'api')
  assert.equal(assignModule('src/main.ts', modules), 'app')
  assert.equal(assignModule('lib/x.ts', modules), undefined)
})

test('resolveArchitectureConfig rejects invalid and unknown dependency names', () => {
  assert.throws(
    () => resolveArchitectureConfig({ architecture: { modules: [{ name: 'bad name', paths: ['a/**'] }] } }, CONFIG_FILE),
    (error: unknown) => error instanceof ArchitectureConfigError && error.exitCode === 2
  )
  assert.throws(
    () => resolveArchitectureConfig({ architecture: { modules: [{ name: 'a', paths: ['**'], allow: ['missing'] }] } }, CONFIG_FILE),
    (error: unknown) => error instanceof ArchitectureConfigError
  )
})

test('loadArchitectureFromYaml accepts layers at the top level', () => {
  const config = loadArchitectureFromYaml('layers:\n  - name: web\n    paths:\n      - apps/web/**\n', CONFIG_FILE)
  assert.ok(config)
  assert.equal(config?.modules[0]?.name, 'web')
})

test('detectArchitectureDrift reports allow-list and deny-undeclared violations on EXTRACTED edges only', () => {
  const builder = new GraphBuilder()
  builder.addNode({ id: 'file:src/a.ts', kind: 'file', path: 'src/a.ts', label: 'a.ts', language: 'typescript', lineCount: 1, parse: { status: 'parsed' }, module: 'a' })
  builder.addNode({ id: 'file:src/b.ts', kind: 'file', path: 'src/b.ts', label: 'b.ts', language: 'typescript', lineCount: 1, parse: { status: 'parsed' }, module: 'b' })
  builder.addEdge({
    source: 'file:src/a.ts',
    type: 'imports',
    target: 'file:src/b.ts',
    provenance: 'EXTRACTED',
    span: { start: { line: 1, col: 1 }, end: { line: 1, col: 10 } },
    specifier: './b'
  })
  builder.addEdge({
    source: 'file:src/a.ts',
    type: 'imports',
    target: 'file:src/b.ts',
    provenance: 'INFERRED',
    confidence: 0.5,
    reason: 'src-root-guess',
    span: { start: { line: 2, col: 1 }, end: { line: 2, col: 10 } },
    specifier: './b'
  })
  const graph = builder.build({
    files: { discovered: 2, parsed: 2, partial: 0, failed: 0, skipped: 0, ignored: 0 },
    byLanguage: [],
    skipped: [],
    failed: [],
    ignored: [],
    unresolved: [],
    accounting: { discovered: 2, accounted: 2 }
  })
  const modules = [
    { name: 'a', paths: ['src/a.ts'] },
    { name: 'b', paths: ['src/b.ts'] }
  ]
  const { byPath } = buildModuleMap(['src/a.ts', 'src/b.ts'], modules)
  const config = { configPath: CONFIG_FILE, defaultPolicy: 'deny-undeclared' as const, modules }
  const findings = detectArchitectureDrift(graph, config, byPath)
  assert.equal(findings.length, 1)
  assert.equal(findings[0]?.rule, 'deny-undeclared')
  assert.equal(findings[0]?.provenance, 'EXTRACTED')
})

test('scan without architecture config leaves graph unchanged aside from canonical fields', async () => {
  const root = mkdtempSync(join(tmpdir(), 'arch-none-'))
  writeFileSync(join(root, 'a.ts'), 'export const x = 1\n')
  const out = await scanRepository(root, { outDir: mkdtempSync(join(tmpdir(), 'arch-out-')) })
  assert.equal(out.graph.architecture, undefined)
  assert.equal(out.graph.nodes.every(node => node.kind !== 'file' || !('module' in node)), true)
})

test('scan assigns modules and emits architecture findings', async () => {
  const root = mkdtempSync(join(tmpdir(), 'arch-scan-'))
  writeFileSync(
    join(root, CONFIG_FILE),
    [
      'architecture:',
      '  defaultPolicy: deny-undeclared',
      '  modules:',
      '    - name: api',
      '      paths: ["src/api/**"]',
      '      allow: [core]',
      '    - name: core',
      '      paths: ["src/core/**"]',
      ''
    ].join('\n')
  )
  mkdirSync(join(root, 'src', 'api'), { recursive: true })
  mkdirSync(join(root, 'src', 'core'), { recursive: true })
  mkdirSync(join(root, 'src', 'other'), { recursive: true })
  writeFileSync(join(root, 'src', 'api', 'routes.ts'), "import { x } from '../core/x'\nexport const r = x\n")
  writeFileSync(join(root, 'src', 'core', 'x.ts'), 'export const x = 1\n')
  writeFileSync(join(root, 'src', 'api', 'bad.ts'), "import { y } from '../other/y'\n")
  writeFileSync(join(root, 'src', 'other', 'y.ts'), 'export const y = 1\n')

  const out = await scanRepository(root, { outDir: mkdtempSync(join(tmpdir(), 'arch-scan-out-')) })
  assert.ok(out.graph.architecture)
  assert.equal(out.graph.architecture?.summary.violations, 1)
  const apiNode = out.graph.nodes.find(node => node.kind === 'file' && node.path === 'src/api/routes.ts')
  assert.equal(apiNode && apiNode.kind === 'file' ? apiNode.module : undefined, 'api')
  assert.ok(validateStrict(out.graph).ok)
  assert.equal(out.graph.architecture?.unassigned.includes('src/other/y.ts'), true)
})

test('strict-architecture returns a failure when drift findings exist', async () => {
  const root = mkdtempSync(join(tmpdir(), 'arch-strict-'))
  writeFileSync(
    join(root, CONFIG_FILE),
    'architecture:\n  defaultPolicy: deny-undeclared\n  modules:\n    - name: a\n      paths: ["a.ts"]\n    - name: b\n      paths: ["b.ts"]\n'
  )
  writeFileSync(join(root, 'a.ts'), "import './b'\n")
  writeFileSync(join(root, 'b.ts'), '')
  const out = await scanRepository(root, { outDir: mkdtempSync(join(tmpdir(), 'arch-strict-out-')) })
  assert.equal(out.graph.architecture?.summary.violations, 1)
  const strictOut = await scanRepository(root, {
    outDir: mkdtempSync(join(tmpdir(), 'arch-strict-out2-')),
    strictArchitecture: true
  })
  assert.equal(strictOut.strictFailures.some(line => line.startsWith('architecture drift:')), true)
})

test('invalid architecture config fails before writing graph', async () => {
  const root = mkdtempSync(join(tmpdir(), 'arch-bad-'))
  writeFileSync(join(root, CONFIG_FILE), 'architecture:\n  modules: []\n')
  writeFileSync(join(root, 'a.ts'), '')
  await assert.rejects(
    () => scanRepository(root, { outDir: mkdtempSync(join(tmpdir(), 'arch-bad-out-')) }),
    (error: unknown) => error instanceof ArchitectureConfigError && error.exitCode === 2
  )
})
