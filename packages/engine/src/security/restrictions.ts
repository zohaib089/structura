import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { PACKAGE_SCOPE } from '../brand.js'

const SOURCE_ROOTS = ['packages/engine/src', 'packages/cli/src']
const ALLOWED_BRAND_FILES = new Set(['packages/engine/src/brand.ts', 'packages/engine/src/brand.test.ts'])

const IMPORT_FROM = /(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/g
const REQUIRE_CALL = /require\(\s*['"]([^'"]+)['"]\s*\)/g
const DYNAMIC_IMPORT = /import\(\s*['"]([^'"]+)['"]\s*\)/g

function forbiddenModule(specifier: string): boolean {
  const bare = specifier.startsWith('node:') ? specifier.slice(5) : specifier
  return bare === 'child_process' || bare === 'cluster' || bare === 'net' || bare === 'http' || bare === 'https' || bare === 'dns' || bare === 'tls' || bare === 'dgram'
}

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    const stats = statSync(path)
    if (stats.isDirectory()) {
      if (name === 'node_modules' || name === 'dist') continue
      walk(path, out)
    } else if (name.endsWith('.ts') || name.endsWith('.js') || name.endsWith('.mjs')) out.push(path)
  }
}

/** Import restrictions for the engine and CLI. Docs, JSON manifests and the brand module are exempt from the name check. */
export function findRestrictionViolations(repoRoot: string): string[] {
  const violations: string[] = []
  const files: string[] = []
  for (const root of SOURCE_ROOTS) walk(join(repoRoot, root), files)
  for (const file of files) {
    const rel = relative(repoRoot, file).split('\\').join('/')
    const text = readFileSync(file, 'utf8')
    const specifiers = [...text.matchAll(IMPORT_FROM), ...text.matchAll(REQUIRE_CALL), ...text.matchAll(DYNAMIC_IMPORT)].map(match => match[1] ?? '')
    for (const specifier of specifiers) {
      if (forbiddenModule(specifier)) violations.push(`${rel} imports ${specifier}`)
    }
    if (rel.endsWith('.md') || rel.endsWith('.json') || ALLOWED_BRAND_FILES.has(rel)) continue
    const productNeedle = new RegExp(`(?<![A-Za-z])(?:${'struct'}${'ura'}|${'atlas'}${'mith'})(?![A-Za-z])`, 'i')
    // Package imports use the scope from brand.ts. Scrubbing that token keeps the rename in one file.
    if (productNeedle.test(text.split(PACKAGE_SCOPE).join(''))) violations.push(`${rel} contains a product-name literal`)
  }
  return violations
}
