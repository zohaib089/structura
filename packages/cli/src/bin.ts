#!/usr/bin/env node
import { pathToFileURL } from 'node:url'
import { run } from './run.js'

const invoked = process.argv[1] ? pathToFileURL(process.argv[1]).href : ''
if (import.meta.url === invoked) {
  process.on('SIGINT', () => {
    process.exitCode = 130
    process.exit(130)
  })
  run(process.argv.slice(2)).then(code => {
    process.exitCode = code
  }).catch(error => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
