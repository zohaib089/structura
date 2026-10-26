#!/usr/bin/env node
/**
 * Print the packages/cli JavaScript entry (bin or main) so a scan can be
 * `node <entry> scan <fixture>` — one execve, no npm script.
 */
import fs from 'node:fs'
import path from 'node:path'
import { repoRoot } from './corpus-paths.mjs'

const manifestPath = path.join(repoRoot, 'packages/cli/package.json')
if (!fs.existsSync(manifestPath)) {
  console.error('packages/cli/package.json does not exist')
  process.exit(1)
}

const pkg = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
let rel
if (typeof pkg.bin === 'string') rel = pkg.bin
else if (pkg.bin && typeof pkg.bin === 'object') rel = Object.values(pkg.bin)[0]
else if (typeof pkg.main === 'string') rel = pkg.main

if (typeof rel !== 'string' || rel.length === 0) {
  console.error('packages/cli has no bin or main entry to scan with')
  process.exit(1)
}

const abs = path.resolve(path.dirname(manifestPath), rel)
if (!fs.existsSync(abs)) {
  console.error(`CLI entry does not exist: ${abs}`)
  process.exit(1)
}

process.stdout.write(abs)
