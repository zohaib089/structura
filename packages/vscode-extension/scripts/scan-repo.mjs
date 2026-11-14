/**
 * Produce a real @atlasmith/engine scan of this repository for E1 visual evidence.
 * Output is written outside the git worktree under /workspace/e1-visual/scan/.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { scanRepository, queryGraph } from '../../engine/dist/index.js'

const root = resolve(import.meta.dirname, '../../..')
const outDir = resolve('/workspace/e1-visual/scan')
await mkdir(outDir, { recursive: true })

console.log(`Scanning ${root} -> ${outDir}`)
const started = Date.now()
const output = await scanRepository(root, {
  outDir,
  metaPath: null
})
const elapsed = Date.now() - started
console.log(`Scan finished in ${elapsed}ms`)
console.log(`nodes=${output.graph.summary.nodes} edges=${output.graph.summary.edges} files=${output.graph.summary.files}`)
console.log(output.summary)

const probe = 'apps/web/src/viewer/ViewerApp.vue'
const found = queryGraph(output.graph, { kind: 'file', path: probe })
console.log(`queryGraph file ${probe}:`, found.mode === 'nodes' ? found.nodes.length : found)

const payload = {
  schemaVersion: output.graph.schemaVersion,
  summary: output.graph.summary,
  coverage: output.graph.coverage,
  nodes: output.graph.nodes,
  edges: output.graph.edges,
  architecture: output.graph.architecture
}
await writeFile(resolve('/workspace/e1-visual/graph.json'), JSON.stringify(payload))
await writeFile(
  resolve('/workspace/e1-visual/scan-meta.json'),
  JSON.stringify(
    {
      source: 'real @atlasmith/engine scanRepository of /workspace/structura',
      root,
      elapsedMs: output.elapsedMs,
      summary: output.graph.summary,
      fileProbe: probe,
      fileFound: found.mode === 'nodes' && found.nodes.length > 0
    },
    null,
    2
  )
)
console.log('Wrote /workspace/e1-visual/graph.json')
