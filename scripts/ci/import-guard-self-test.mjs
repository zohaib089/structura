#!/usr/bin/env node
/**
 * Drops temporary sources and asserts the import guard accepts or rejects them.
 * The CI step also drops a node:child_process probe before invoking this file.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const guard = path.join(here, 'import-guard.mjs')
const repo = path.resolve(here, '../..')
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'import-guard-'))
let failed = 0

function check(name, expectFail, prepare) {
  const dir = path.join(root, name.replace(/[^a-z0-9]+/gi, '-'))
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true })
  prepare(dir)
  const result = spawnSync(process.execPath, [guard, dir], { encoding: 'utf8' })
  const didFail = result.status !== 0
  if (didFail !== expectFail) {
    failed++
    console.error(`FAIL ${name}: expected ${expectFail ? 'reject' : 'allow'}, got exit ${result.status}`)
    console.error(result.stdout)
    console.error(result.stderr)
    return
  }
  console.log(`${expectFail ? 'rejected' : 'allowed'}: ${name}`)
}

function write(dir, filename, source) {
  fs.writeFileSync(path.join(dir, 'src', filename), source)
}

const sources = [
  ['mutation node:child_process import', true, 'import "node:child_process"\n', 'ci-mutation-probe.ts'],
  ['named child_process import', true, "import { spawn } from 'child_process'\n"],
  ['require node:cluster', true, 'const clusterApi = require("node:cluster")\n'],
  ['dynamic node:net', true, "await import('node:net')\n"],
  ['non-literal require', true, 'require(name)\n'],
  ['non-literal import', true, 'import(mod)\n'],
  ['static template dns', true, 'import(`node:dns`)\n'],
  ['interpolated import', true, 'import(`node:${name}`)\n'],
  ['export from node:tls', true, 'export { connect } from "node:tls"\n'],
  ['export star http', true, "export * from 'http'\n"],
  ['import equals vm', true, 'import vm = require("node:vm")\n'],
  ['default https', true, "import https from 'https'\n"],
  ['node:http2', true, "import http2 from 'node:http2'\n"],
  ['dgram', true, "import dgram from 'node:dgram'\n"],
  ['zlib', true, "import zlib from 'zlib'\n"],
  ['undici', true, "import { request } from 'undici'\n"],
  ['telemetry specifier', true, "import ph from '@posthog/node'\n"],
  ['type import node:http', true, "import type { Server } from 'node:http'\n"],
  ['export type from node:http', true, 'export type { Server } from "node:http"\n'],
  ['multiline child_process', true, "import {\n  spawn\n} from 'node:child_process'\n"],
  ['require.resolve child_process', true, "require.resolve('node:child_process')\n"],
  ['binding named declare', true, 'import declare from "node:child_process"\n'],
  ['worker_threads', false, "import { Worker } from 'node:worker_threads'\n"],
  ['cluster edges string', false, 'export const note = "cluster edges"\n'],
  ['commented import', false, "// import { spawn } from 'node:child_process'\nexport const ok = 1\n"],
  ['string that mentions require', false, "export const sample = \"require('child_process')\"\n"],
  ['import.meta', false, 'export const url = import.meta.url\n'],
  ['node:fs', false, "import fs from 'node:fs'\n"],
  ['relative ./cluster', false, "import cluster from './cluster'\n"],
  ['require node:fs', false, "const fs = require('node:fs')\n"],
  ['block comment', false, "/* import('node:net') */\nexport const ok = 1\n"],
  ['dynamic node:fs', false, "await import('node:fs')\n"],
  ['require.resolve node:fs', false, "require.resolve('node:fs')\n"],
  ['regex containing import', false, "const pattern = /import\\('node:child_process'\\)/\nexport const ok = pattern\n"]
]

for (const [name, expectFail, source, filename] of sources) {
  check(name, expectFail, dir => write(dir, filename ?? 'probe.ts', source))
}

check('vue script import', true, dir => {
  write(dir, 'View.vue', '<template><p>cluster</p></template>\n<script setup>\nimport { spawn } from "node:child_process"\n</script>\n')
})

check('vue cluster word', false, dir => {
  write(dir, 'View.vue', '<template><p>cluster edges</p></template>\n<script setup>\nexport const note = "cluster"\n</script>\n')
})

check('telemetry dependency', true, dir => {
  write(dir, 'ok.ts', 'export const value = 1\n')
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ dependencies: { 'update-notifier': '1.0.0' } }))
})

check('telemetry devDependency', true, dir => {
  write(dir, 'ok.ts', 'export const value = 1\n')
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ devDependencies: { '@sentry/node': '1.0.0' } }))
})

check('ordinary dependency', false, dir => {
  write(dir, 'ok.ts', 'export const value = 1\n')
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ dependencies: { typescript: '5.0.0' } }))
})

const repoRun = spawnSync(process.execPath, [guard], { encoding: 'utf8', cwd: repo })
if (repoRun.status !== 0) {
  failed++
  console.error('FAIL repository scan')
  console.error(repoRun.stdout)
  console.error(repoRun.stderr)
} else {
  console.log('allowed: repository scan with engine and cli absent')
}

fs.rmSync(root, { recursive: true, force: true })

if (failed > 0) {
  console.error(`import guard self-test failed (${failed})`)
  process.exit(1)
}
console.log('import guard self-test passed')
