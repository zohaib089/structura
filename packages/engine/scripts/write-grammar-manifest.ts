import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Regenerates grammars.manifest.json (SHA-256 of every WASM the engine may instantiate). Review the diff: a change means a new grammar build. */
const require = createRequire(import.meta.url)
const sha256 = (path: string): string => createHash('sha256').update(readFileSync(path)).digest('hex')
const own = JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../package.json'), 'utf8')) as { dependencies: Record<string, string> }
/** The exact pin from package.json (ranges are rejected). */
const versionOf = (pkg: string): string => {
  const pin = own.dependencies[pkg]
  if (!pin || !/^\d+\.\d+\.\d+$/.test(pin)) throw new Error(`${pkg} must be pinned to an exact version`)
  return pin
}

const grammars = ['typescript', 'tsx', 'javascript', 'python'] as const
const manifest = {
  manifestVersion: 1,
  runtime: {
    package: 'web-tree-sitter',
    version: versionOf('web-tree-sitter'),
    file: 'web-tree-sitter.wasm',
    sha256: sha256(require.resolve('web-tree-sitter/web-tree-sitter.wasm')),
    license: 'MIT'
  },
  grammars: Object.fromEntries(
    grammars.map(name => [
      name,
      {
        package: '@vscode/tree-sitter-wasm',
        version: versionOf('@vscode/tree-sitter-wasm'),
        file: `wasm/tree-sitter-${name}.wasm`,
        sha256: sha256(require.resolve(`@vscode/tree-sitter-wasm/wasm/tree-sitter-${name}.wasm`)),
        license: 'MIT'
      }
    ])
  )
}
const target = resolve(dirname(fileURLToPath(import.meta.url)), '../grammars.manifest.json')
writeFileSync(target, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`wrote ${target}`)
