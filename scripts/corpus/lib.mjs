import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { repoRoot } from '../ci/corpus-paths.mjs'

const FIXTURES_ROOT = path.join(repoRoot, 'packages/test-fixtures')

const UNSTABLE_KEYS = new Set([
  'startedAt',
  'finishedAt',
  'elapsedMs',
  'version',
  'grammarFingerprint',
  'adapterVersion',
  'toolVersion',
  'engineVersion',
  'memory',
  'heapUsed',
  'rss',
  'external'
])

/** @returns {{ id: string, repoPath: string, expectedPath: string }[]} */
export function listCorpusCases() {
  if (!fs.existsSync(FIXTURES_ROOT)) return []
  const cases = []
  for (const entry of fs.readdirSync(FIXTURES_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const repoPath = path.join(FIXTURES_ROOT, entry.name, 'repo')
    if (!fs.existsSync(repoPath)) continue
    cases.push({
      id: entry.name,
      repoPath,
      expectedPath: path.join(FIXTURES_ROOT, entry.name, 'expected', 'graph.json')
    })
  }
  return cases.sort((a, b) => a.id.localeCompare(b.id))
}

function stripUnstable(value) {
  if (Array.isArray(value)) return value.map(stripUnstable)
  if (value && typeof value === 'object') {
    const out = {}
    for (const [key, nested] of Object.entries(value)) {
      if (UNSTABLE_KEYS.has(key)) continue
      out[key] = stripUnstable(nested)
    }
    return out
  }
  if (typeof value === 'string') {
    if (value.startsWith('/') || /^[A-Za-z]:[\\/]/.test(value)) return '<absolute-path>'
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) return '<timestamp>'
  }
  return value
}

async function loadEngine() {
  const scanPath = path.join(repoRoot, 'packages/engine/dist/scan/scan.js')
  const readPath = path.join(repoRoot, 'packages/engine/dist/graph/read.js')
  const canonicalPath = path.join(repoRoot, 'packages/engine/dist/graph/canonical.js')
  for (const file of [scanPath, readPath, canonicalPath]) {
    if (!fs.existsSync(file)) {
      throw new Error(`Engine build missing (${file}). Run: npm run build -w packages/engine`)
    }
  }
  const [{ scanRepository }, { readGraph }, { serializeGraph }] = await Promise.all([
    import(pathToFileURL(scanPath).href),
    import(pathToFileURL(readPath).href),
    import(pathToFileURL(canonicalPath).href)
  ])
  return { scanRepository, readGraph, serializeGraph }
}

/** @param {string} graphJson */
export async function normalizeGraphJson(graphJson) {
  const { readGraph, serializeGraph } = await loadEngine()
  const { graph } = readGraph(graphJson)
  return serializeGraph(stripUnstable(graph))
}

/** @param {string} repoPath */
export async function scanFixtureRepo(repoPath) {
  const { scanRepository } = await loadEngine()
  const output = await scanRepository(repoPath, {
    noCache: true,
    metaPath: null,
    jobs: 1
  })
  return normalizeGraphJson(output.graphJson)
}
