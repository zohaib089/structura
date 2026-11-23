/**
 * Thin CLI entrypoint for the scale benchmark. Implementation lives in
 * packages/engine/scripts/scale-benchmark.mjs so engine tests stay inside the
 * engine architecture boundary.
 *
 *   node scripts/scale-benchmark.mjs --files 2000
 *   node scripts/scale-benchmark.mjs --files 2000 --files 5000
 */
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { runScaleBenchmarkCli } from '../packages/engine/scripts/scale-benchmark.mjs'

export * from '../packages/engine/scripts/scale-benchmark.mjs'

const invoked = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url
if (invoked) {
  runScaleBenchmarkCli().catch(error => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error))
    process.exitCode = 1
  })
}
