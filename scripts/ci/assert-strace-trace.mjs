#!/usr/bin/env node
/**
 * Accept a strace log only when it shows no AF_INET/AF_INET6 connect
 * and exactly one successful execve (the node process itself).
 */
import fs from 'node:fs'

const file = process.argv[2]
if (!file) {
  console.error('usage: scripts/ci/assert-strace-trace.mjs <trace-file>')
  process.exit(2)
}

const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(line => line.length > 0)
const connects = []
const execs = []

for (const line of lines) {
  if (/connect\s*\(/.test(line) && /AF_INET/.test(line)) connects.push(line)
  const unfinished = line.includes('<unfinished')
  const isExec = /execve\s*\(/.test(line) || /execve resumed/.test(line)
  if (isExec && !unfinished && /=\s*0\s*$/.test(line.trim())) execs.push(line)
}

const problems = []
if (connects.length > 0) {
  problems.push(`found ${connects.length} AF_INET/AF_INET6 connect call(s)`)
}
if (execs.length !== 1) {
  problems.push(`expected exactly 1 successful execve (node), found ${execs.length}`)
}

if (problems.length > 0) {
  console.error(problems.join('\n'))
  for (const line of [...connects, ...execs]) console.error(line)
  process.exit(1)
}

console.log('strace trace accepted: no AF_INET/AF_INET6 connect, one successful execve')
