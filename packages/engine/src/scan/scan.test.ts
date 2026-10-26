import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { CONFIG_FILE, GRAPH_FILE, OUT_DIR, PRODUCT_SLUG, RUN_FILE } from '../brand.js'
import { GraphVersionUnsupported } from '../graph/errors.js'
import { makeTree } from '../test-support/tmp.js'
import { InterruptedError, OutputRefusedError, scanRepository } from './scan.js'

function fixture(): { root: string; cleanup: () => void } {
  const tree = makeTree({
    'package.json': '{"name":"fixture","main":"./src/app.ts"}\n',
    'src/app.ts': "import { a } from './util'\nimport type { T } from './types'\nimport fs from 'node:fs'\nexport function main(): number { return a }\n",
    'src/util.ts': 'export const a = 1\n',
    'src/types.ts': 'export type T = string\n',
    'src/dyn.ts': "export async function load(name: string) {\n  await import('./util')\n  return import(name)\n}\n",
    'src/note.py': 'import os\n',
    '.gitignore': 'secret.ts\n',
    'secret.ts': 'export const secret = 1\n',
    'node_modules/left-pad/index.js': 'module.exports = {}\n'
  })
  symlinkSync(join(tree.root, 'src', 'util.ts'), join(tree.root, 'src', 'alias.ts'))
  return tree
}

test('two scans of one fixture are byte-identical and brand-free', async () => {
  const { root, cleanup } = fixture()
  const outA = mkdtempSync(join(tmpdir(), 'scan-out-'))
  const outB = mkdtempSync(join(tmpdir(), 'scan-out-'))
  const cacheDir = mkdtempSync(join(tmpdir(), 'scan-cache-'))
  try {
    const first = await scanRepository(root, { outDir: outA, cacheDir, metaPath: null, limits: { jobs: 1 } })
    const second = await scanRepository(root, { outDir: outB, cacheDir, metaPath: null, limits: { jobs: 1 } })
    assert.equal(first.graphJson, second.graphJson)
    assert.equal(readFileSync(first.graphPath, 'utf8'), first.graphJson)
    assert.equal(first.graphJson.includes(root), false)
    assert.equal(first.graphJson.includes(PRODUCT_SLUG), false)
    assert.equal(first.graphJson.includes('startedAt'), false)
    assert.equal(first.graph.coverage.accounting.discovered, first.graph.coverage.accounting.accounted)
    assert.ok(first.graph.coverage.files.parsed >= 4)
    assert.ok(first.graph.nodes.some(node => node.kind === 'file' && node.path === 'src/note.py' && node.parse.status === 'skipped' && node.parse.reason === 'unsupported-language'))
    assert.ok(first.graph.nodes.some(node => node.kind === 'file' && node.path === 'src/alias.ts' && node.parse.status === 'skipped' && node.parse.reason === 'symlink'))
    assert.equal(first.graph.coverage.ignored.some(item => item.rule === 'default:node_modules'), true)
    assert.equal(first.graph.coverage.ignored.some(item => item.rule === 'gitignore:secret.ts'), true)
    const typeEdge = first.graph.edges.find(edge => edge.type === 'imports' && edge.specifier === './types')
    assert.equal(typeEdge && 'typeOnly' in typeEdge && typeEdge.typeOnly, true)
    const dynamic = first.graph.edges.find(edge => edge.type === 'imports' && edge.specifier === './util' && 'importKind' in edge && edge.importKind === 'dynamic')
    assert.ok(dynamic)
    assert.ok(first.graph.nodes.some(node => node.kind === 'external' && node.id === 'ext:node:fs'))
    assert.ok(first.graph.nodes.some(node => node.kind === 'unresolved' && node.reason === 'non-literal-specifier'))
    const nonLiteral = first.graph.edges.find(edge => edge.type === 'imports' && edge.specifier === '<non-literal>')
    assert.equal(nonLiteral?.provenance, 'EXTRACTED')
    assert.equal(nonLiteral && 'importKind' in nonLiteral && nonLiteral.importKind, 'dynamic')
    assert.equal(nonLiteral && 'confidence' in nonLiteral, false)
    assert.equal(nonLiteral && 'reason' in nonLiteral, false)
    assert.equal(second.run.cache.hits > 0, true)
    assert.equal(first.strictFailures.length, 0)
  } finally {
    cleanup()
  }
})

test('an in-repo tsconfig extends is followed and its paths stay extracted', async () => {
  const { root, cleanup } = makeTree({
    'tsconfig.base.json': '{ "compilerOptions": { "baseUrl": ".", "paths": { "@lib/*": ["lib/*"] } } }\n',
    'packages/app/tsconfig.json': '{ "extends": "../../tsconfig.base.json" }\n',
    'packages/app/src/main.ts': "import { x } from '@lib/util'\n",
    'lib/util.ts': 'export const x = 1\n'
  })
  const out = mkdtempSync(join(tmpdir(), 'scan-out-'))
  try {
    const result = await scanRepository(root, { outDir: out, noCache: true, metaPath: null, limits: { jobs: 1 } })
    assert.equal(result.graph.coverage.unresolved.some(item => item.reason === 'config-extends-unresolved'), false)
    const edge = result.graph.edges.find(item => item.type === 'imports' && item.specifier === '@lib/util')
    assert.equal(edge?.provenance, 'EXTRACTED')
    assert.equal(edge?.target, 'file:lib/util.ts')
  } finally {
    cleanup()
  }
})

test('a mixed type and value import is one extracted edge and the value wins', async () => {
  const { root, cleanup } = makeTree({
    'src/app.ts': "import { type A, A } from './mod'\nimport type { B } from './mod'\n",
    'src/mod.ts': 'export type A = string\nexport const A = 1\nexport type B = number\n'
  })
  const out = mkdtempSync(join(tmpdir(), 'scan-out-'))
  try {
    const result = await scanRepository(root, { outDir: out, noCache: true, metaPath: null, limits: { jobs: 1 } })
    const imports = result.graph.edges.filter(edge => edge.type === 'imports' && edge.specifier === './mod')
    assert.equal(imports.length, 2)
    const mixed = imports.find(edge => edge.span?.start.line === 1)
    const types = imports.find(edge => edge.span?.start.line === 2)
    assert.equal(mixed?.provenance, 'EXTRACTED')
    assert.equal(mixed && 'typeOnly' in mixed, false)
    assert.equal(types && 'typeOnly' in types && types.typeOnly, true)
  } finally {
    cleanup()
  }
})

test('a referenced tsconfig is loaded and a package extends on it is unresolved', async () => {
  const { root, cleanup } = makeTree({
    'tsconfig.json': '{ "references": [{ "path": "./tsconfig.app.json" }] }\n',
    'tsconfig.app.json': '{ "extends": "@vue/tsconfig/tsconfig.dom.json", "compilerOptions": { "paths": { "@lib/*": ["lib/*"] } } }\n',
    'src/main.ts': "import { x } from '@lib/util'\n",
    'lib/util.ts': 'export const x = 1\n'
  })
  const out = mkdtempSync(join(tmpdir(), 'scan-out-'))
  try {
    const result = await scanRepository(root, { outDir: out, noCache: true, metaPath: null, limits: { jobs: 1 } })
    assert.deepEqual(result.graph.coverage.unresolved, [{ reason: 'config-extends-unresolved', count: 1 }])
    const edge = result.graph.edges.find(item => item.type === 'imports' && item.specifier === '@lib/util')
    assert.equal(edge?.provenance, 'EXTRACTED')
    assert.equal(edge?.target, 'file:lib/util.ts')
  } finally {
    cleanup()
  }
})

test('run metadata outside --out replaces only a previous run.json and never a symlink', async () => {
  const { root, cleanup } = makeTree({ 'src/app.ts': 'export const value = 1\n' })
  const out = mkdtempSync(join(tmpdir(), 'scan-out-'))
  const metaDir = mkdtempSync(join(tmpdir(), 'scan-meta-'))
  const meta = join(metaDir, 'notes.json')
  try {
    const first = await scanRepository(root, { outDir: out, metaPath: meta, noCache: true, limits: { jobs: 1 } })
    assert.equal(first.runPath, meta)
    assert.equal(JSON.parse(readFileSync(meta, 'utf8')).command, 'scan')
    const second = await scanRepository(root, { outDir: out, metaPath: meta, noCache: true, limits: { jobs: 1 } })
    assert.equal(second.graphJson, first.graphJson)

    writeFileSync(meta, '{"command":"scan","product":"other"}\n')
    await assert.rejects(scanRepository(root, { outDir: out, metaPath: meta, noCache: true, limits: { jobs: 1 } }), OutputRefusedError)
    writeFileSync(meta, 'plain text\n')
    await assert.rejects(scanRepository(root, { outDir: out, metaPath: meta, noCache: true, limits: { jobs: 1 } }), OutputRefusedError)

    const real = join(metaDir, 'real.json')
    writeFileSync(real, '{}\n')
    const link = join(metaDir, 'link.json')
    symlinkSync(real, link)
    await assert.rejects(scanRepository(root, { outDir: out, metaPath: link, noCache: true, limits: { jobs: 1 } }), OutputRefusedError)
  } finally {
    cleanup()
  }
})

test('a cold scan and a warm scan write the same graph bytes', async () => {
  const { root, cleanup } = fixture()
  const out = mkdtempSync(join(tmpdir(), 'scan-out-'))
  const cacheDir = mkdtempSync(join(tmpdir(), 'scan-cache-'))
  try {
    const cold = await scanRepository(root, { outDir: out, noCache: true, metaPath: null, limits: { jobs: 1 } })
    const warm = await scanRepository(root, { outDir: out, cacheDir, metaPath: null, limits: { jobs: 1 } })
    const again = await scanRepository(root, { outDir: out, cacheDir, metaPath: null, limits: { jobs: 1 } })
    assert.equal(cold.graphJson, warm.graphJson)
    assert.equal(warm.graphJson, again.graphJson)
  } finally {
    cleanup()
  }
})

test('repo config can only lower a limit and an explicit flag replaces it', async () => {
  const { root, cleanup } = makeTree({
    [CONFIG_FILE]: 'maxFileSizeBytes: 10\n',
    'src/app.ts': 'export const value = 1\n'
  })
  const out = mkdtempSync(join(tmpdir(), 'scan-out-'))
  try {
    const lowered = await scanRepository(root, { outDir: out, noCache: true, metaPath: null, limits: { jobs: 1 } })
    const file = lowered.graph.nodes.find(node => node.kind === 'file' && node.path === 'src/app.ts')
    assert.equal(file?.kind === 'file' && file.parse.status, 'skipped')
    const raised = await scanRepository(root, { outDir: out, noCache: true, metaPath: null, limits: { jobs: 1, maxFileSizeBytes: 10_000 } })
    const parsed = raised.graph.nodes.find(node => node.kind === 'file' && node.path === 'src/app.ts')
    assert.equal(parsed?.kind === 'file' && parsed.parse.status, 'parsed')
  } finally {
    cleanup()
  }
})

test('refuses to overwrite a non-graph, and refuses an unsupported graph version', async () => {
  const { root, cleanup } = makeTree({ 'src/app.ts': 'export {}\n' })
  try {
    const foreign = mkdtempSync(join(tmpdir(), 'scan-out-'))
    writeFileSync(join(foreign, GRAPH_FILE), 'not a graph\n')
    await assert.rejects(scanRepository(root, { outDir: foreign, noCache: true, metaPath: null, limits: { jobs: 1 } }), OutputRefusedError)

    const future = mkdtempSync(join(tmpdir(), 'scan-out-'))
    writeFileSync(join(future, GRAPH_FILE), '{"schemaVersion":"2.0.0"}\n')
    await assert.rejects(scanRepository(root, { outDir: future, noCache: true, metaPath: null, limits: { jobs: 1 } }), GraphVersionUnsupported)
  } finally {
    cleanup()
  }
})

test('an already-aborted signal is exit 130 and run metadata stays out of the graph', async () => {
  const { root, cleanup } = makeTree({ 'src/app.ts': 'export {}\n' })
  const out = mkdtempSync(join(tmpdir(), 'scan-out-'))
  try {
    await assert.rejects(scanRepository(root, { outDir: out, signal: AbortSignal.abort(), noCache: true }), (error: unknown) => error instanceof InterruptedError && error.exitCode === 130)
    const output = await scanRepository(root, { outDir: out, noCache: true, limits: { jobs: 1 } })
    assert.equal(readFileSync(join(out, RUN_FILE), 'utf8').includes(root), true)
    assert.equal(output.graphJson.includes(OUT_DIR), false)
    mkdirSync(join(out, 'nested'), { recursive: true })
  } finally {
    cleanup()
  }
})

test('the scan does not load process or network modules', async () => {
  const nodeModule = await import('node:module')
  const loader = nodeModule.Module as typeof nodeModule.Module & { _load?: (request: string, parent: unknown, isMain: boolean) => unknown }
  const calls: string[] = []
  const originalLoad = loader._load
  const originalFetch = globalThis.fetch
  const forbidden = new Set(['child_process', 'node:child_process', 'cluster', 'node:cluster', 'net', 'node:net', 'http', 'node:http', 'https', 'node:https', 'dns', 'node:dns', 'tls', 'node:tls', 'dgram', 'node:dgram'])
  if (originalLoad) {
    loader._load = function (this: unknown, request: string, parent: unknown, isMain: boolean) {
      if (forbidden.has(request)) calls.push(request)
      return originalLoad.call(this, request, parent, isMain)
    }
  }
  globalThis.fetch = (() => {
    calls.push('fetch')
    throw new Error('network')
  }) as typeof fetch
  const { root, cleanup } = makeTree({ 'src/app.ts': "import fs from 'node:fs'\nexport const a = 1\n" })
  const out = mkdtempSync(join(tmpdir(), 'scan-out-'))
  try {
    await scanRepository(root, { outDir: out, noCache: true, metaPath: null, limits: { jobs: 1 } })
    assert.deepEqual(calls, [])
  } finally {
    if (originalLoad) loader._load = originalLoad
    globalThis.fetch = originalFetch
    cleanup()
  }
})
