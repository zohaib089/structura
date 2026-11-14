/**
 * Local packaging (never publishes): bundles the extension host with esbuild, vendors the built
 * @atlasmith/engine with its runtime files (tree-sitter wasm, parse workers, data, schema) and its
 * production dependencies, then stages a clean folder that `vsce package` / `ovsx` can read.
 *
 *   node scripts/package.mjs            -> .package/ staged + atlasmith-<version>.vsix
 *   node scripts/package.mjs --stage    -> stage only (no vsce)
 *
 * Why the engine is vendored rather than inlined: it resolves package.json, grammars.manifest.json,
 * data/*.json, its worker files and the .wasm grammars relative to its own files (import.meta.url /
 * createRequire). Keeping its dist layout intact keeps every one of those paths valid at runtime.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const engineRoot = resolve(root, '../engine')
const stage = join(root, '.package')
const stageOnly = process.argv.includes('--stage')

rmSync(stage, { recursive: true, force: true })
mkdirSync(join(stage, 'dist'), { recursive: true })

// 1. Extension host: one ESM file; `vscode` comes from the host, the engine from the vendored copy.
await build({
  entryPoints: [join(root, 'src/extension.ts')],
  outfile: join(stage, 'dist/extension.js'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  minify: true,
  sourcemap: false,
  legalComments: 'none',
  external: ['vscode'],
  plugins: [{
    name: 'vendored-engine',
    setup(b) {
      b.onResolve({ filter: /^@atlasmith\/engine$/ }, () => ({ path: './engine/dist/index.js', external: true }))
    }
  }]
})

// 2. Engine: built dist (no maps / d.ts) + the files it reads next to itself.
const engineOut = join(stage, 'dist/engine')
const skip = (src) => !/\.(map|d\.ts)$/.test(src) && !/\.test\.(js|ts)$/.test(src)
cpSync(join(engineRoot, 'dist'), join(engineOut, 'dist'), { recursive: true, filter: skip })
for (const item of ['package.json', 'grammars.manifest.json', 'data', 'schema']) {
  if (existsSync(join(engineRoot, item))) cpSync(join(engineRoot, item), join(engineOut, item), { recursive: true, filter: skip })
}

// 3. Engine production dependencies (transitive), copied so Node resolves them from dist/engine.
const copied = new Set()
function vendor(name, fromDir) {
  if (copied.has(name)) return
  const req = createRequire(join(fromDir, 'noop.js'))
  let manifestPath
  try {
    manifestPath = req.resolve(`${name}/package.json`)
  } catch {
    // Packages whose exports hide package.json: walk up from the entry instead.
    let dir = dirname(req.resolve(name))
    while (!existsSync(join(dir, 'package.json')) || JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).name !== name) dir = dirname(dir)
    manifestPath = join(dir, 'package.json')
  }
  copied.add(name)
  const dir = dirname(manifestPath)
  cpSync(dir, join(engineOut, 'node_modules', name), { recursive: true, filter: (src) => !src.includes(`${name}/node_modules`) && !/\.(map|md|d\.ts)$/.test(src) || src.endsWith('LICENSE.md') })
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  for (const dep of Object.keys(manifest.dependencies ?? {})) vendor(dep, dir)
}
const engineManifest = JSON.parse(readFileSync(join(engineRoot, 'package.json'), 'utf8'))
for (const dep of Object.keys(engineManifest.dependencies ?? {})) vendor(dep, engineRoot)

// Ship only the grammars the engine pins in grammars.manifest.json (the package carries ~16).
const grammarFiles = new Set(Object.values(JSON.parse(readFileSync(join(engineRoot, 'grammars.manifest.json'), 'utf8')).grammars).map((g) => g.file.split('/').pop()))
const wasmDir = join(engineOut, 'node_modules/@vscode/tree-sitter-wasm/wasm')
for (const file of readdirSync(wasmDir)) if (!grammarFiles.has(file)) rmSync(join(wasmDir, file))
rmSync(join(engineOut, 'node_modules/web-tree-sitter/debug'), { recursive: true, force: true })
// Runtime-unused parts of the vendored deps: sources, tests, benchmarks, browser builds, the CJS
// copy of web-tree-sitter (the engine imports the ESM build) and type files.
for (const rel of [
  'ajv/lib',
  'yaml/browser', 'yaml/bin.mjs',
  'fast-uri/benchmark', 'fast-uri/test', 'fast-uri/types', 'fast-uri/eslint.config.js', 'fast-uri/tsconfig.json',
  'json-schema-traverse/spec',
  'web-tree-sitter/web-tree-sitter.cjs', 'web-tree-sitter/web-tree-sitter.d.cts', 'web-tree-sitter/web-tree-sitter.d.ts',
  '@vscode/tree-sitter-wasm/cgmanifest.json'
]) rmSync(join(engineOut, 'node_modules', rel), { recursive: true, force: true })

// 4. Webview, media, docs, and a publish-safe manifest (no workspace / file: dependencies).
cpSync(join(root, 'dist-webview'), join(stage, 'dist-webview'), { recursive: true })
cpSync(join(root, 'media'), join(stage, 'media'), { recursive: true })
for (const file of ['README.md', 'CHANGELOG.md', 'LICENSE']) if (existsSync(join(root, file))) cpSync(join(root, file), join(stage, file))
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const staged = { ...manifest, name: 'atlasmith', main: './dist/extension.js' }
delete staged.private
delete staged.dependencies
delete staged.devDependencies
delete staged.scripts
writeFileSync(join(stage, 'package.json'), `${JSON.stringify(staged, null, 2)}\n`)
writeFileSync(join(stage, '.vscodeignore'), ['**/*.map', '**/*.ts', '**/*.cts', '**/*.mts', '**/*.yml', '**/*.yaml', '**/.github/**', '**/tsconfig.json', '**/.eslintrc*', '**/test/**', '**/tests/**', ''].join('\n'))

console.log('staged', stage, 'vendored', [...copied].sort().join(', '))
if (stageOnly) process.exit(0)

const vsix = join(root, `atlasmith-${manifest.version}.vsix`)
// vsce is pinned to an exact version (not a devDependency: adding it to the root lockfile re-resolves apps/api entries).
execFileSync('npx', ['--yes', '@vscode/vsce@3.9.2', 'package', '--no-dependencies', '--allow-missing-repository', '--skip-license', '-o', vsix], { cwd: stage, stdio: 'inherit' })
console.log('vsix', vsix, `${(statSync(vsix).size / 1024).toFixed(0)} KiB`)
