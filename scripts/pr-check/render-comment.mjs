#!/usr/bin/env node
/**
 * Render the sticky PR comment from two graph.json files and a git diff.
 *
 *   node scripts/pr-check/render-comment.mjs \
 *     --head-graph <graph.json> [--base-graph <graph.json>] \
 *     --changed <git diff --name-status -z --no-renames output file> \
 *     [--sha <head sha>] --out <comment.md>
 *
 * Reads local files and writes one local file. No network, no child processes.
 * Needs packages/cli built (dist/pr-comment.js).
 */
import fs from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const { values } = parseArgs({
  options: {
    'head-graph': { type: 'string' },
    'base-graph': { type: 'string' },
    changed: { type: 'string' },
    sha: { type: 'string' },
    out: { type: 'string' }
  },
  strict: true
})
if (!values['head-graph'] || !values.changed || !values.out) {
  console.error('usage: render-comment.mjs --head-graph <file> [--base-graph <file>] --changed <file> [--sha <sha>] --out <file>')
  process.exit(2)
}

const cli = await import(pathToFileURL(path.join(repoRoot, 'packages/cli/dist/pr-comment.js')).href)

const loadGraph = file => cli.parseGraphJson(fs.readFileSync(file, 'utf8'))
const headGraph = loadGraph(values['head-graph'])
const baseGraph = values['base-graph'] && fs.existsSync(values['base-graph']) ? loadGraph(values['base-graph']) : undefined
const changed = cli.parseNameStatusZ(fs.readFileSync(values.changed, 'utf8'))

const report = cli.buildPrReport({ headGraph, baseGraph, changed })
const body = cli.renderPrComment(report, { headSha: values.sha })
fs.writeFileSync(values.out, body)
console.log(`rendered ${body.length} characters: ${report.findings.length} rule break(s), ${report.changed.length} changed, ${report.affected.length} affected`)
