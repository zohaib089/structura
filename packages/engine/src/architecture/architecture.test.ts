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

function writeTree(root: string, files: Record<string, string>): void {
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(join(root, rel, '..'), { recursive: true })
    writeFileSync(join(root, rel), text)
  }
}

test('workspace package-name imports (entry and subpath) are checked against module rules; unknown packages stay external', async () => {
  const root = mkdtempSync(join(tmpdir(), 'arch-pkg-'))
  writeTree(root, {
    [CONFIG_FILE]: [
      'architecture:',
      '  modules:',
      '    - name: core',
      '      paths: ["packages/core/**"]',
      '      policy: deny-undeclared',
      '    - name: app',
      '      paths: ["packages/app/**"]',
      '      allow: [app, core]',
      '    - name: tool',
      '      paths: ["packages/tool/**"]',
      '      deny: [app, core]',
      ''
    ].join('\n'),
    'package.json': JSON.stringify({ private: true, workspaces: ['packages/*'] }),
    'packages/core/package.json': JSON.stringify({ name: '@demo/core', main: 'dist/index.js' }),
    'packages/core/src/index.ts': 'export const core = 1\n',
    'packages/core/src/deep.ts': 'export const deep = 2\n',
    'packages/core/src/leak.ts': "import { tool } from '@demo/tool'\nexport const leak = tool\n",
    'packages/tool/package.json': JSON.stringify({ name: '@demo/tool', main: 'src/index.ts' }),
    'packages/tool/src/index.ts': "import { app } from '@demo/app/src/main'\nimport { deep } from '@demo/core/deep'\nexport const tool = [app, deep]\n",
    'packages/app/package.json': JSON.stringify({ name: '@demo/app' }),
    'packages/app/src/main.ts': [
      "import { core } from '@demo/core'",
      "import { deep } from '@demo/core/deep'",
      "import pad from 'left-pad'",
      'export const app = [core, deep, pad]',
      ''
    ].join('\n')
  })
  const out = await scanRepository(root, { outDir: mkdtempSync(join(tmpdir(), 'arch-pkg-out-')), noCache: true, strictArchitecture: true })
  const edges = out.graph.edges.filter(edge => edge.type === 'imports' && edge.source === 'file:packages/app/src/main.ts')
  const targets = edges.map(edge => `${edge.target} ${edge.provenance}`).sort()
  assert.deepEqual(targets, [
    'ext:npm:left-pad EXTRACTED',
    'file:packages/core/src/deep.ts INFERRED',
    'file:packages/core/src/index.ts INFERRED'
  ])
  const findings = (out.graph.architecture?.findings ?? []).map(f => `${f.file}:${f.line} ${f.from}->${f.to} ${f.rule} ${f.provenance}`)
  assert.deepEqual(findings, [
    // EXTRACTED: @demo/tool's main is a real source file (already checked before package-import support).
    'packages/core/src/leak.ts:1 core->tool deny-undeclared EXTRACTED',
    // EXTRACTED: subpath that exists as written.
    'packages/tool/src/index.ts:1 tool->app deny-list EXTRACTED',
    // INFERRED: @demo/core/deep maps to src/deep.ts (src-subpath). Ignored by the rules before this change.
    'packages/tool/src/index.ts:2 tool->core deny-list INFERRED'
  ])
  assert.ok(!findings.some(f => f.startsWith('packages/app/')), 'app -> core is allowed; left-pad is external and never checked')
  assert.deepEqual(out.strictFailures, [`architecture drift: ${findings.length} violation(s)`])
  assert.equal(validateStrict(out.graph).ok, true)
})
