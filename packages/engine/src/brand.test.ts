import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  BRAND,
  CACHE_DIR,
  CLI_BIN,
  CLI_PACKAGE_NAME,
  CONFIG_FILE,
  ENGINE_PACKAGE_NAME,
  ENV_PREFIX,
  GRAPH_FILE,
  IGNORE_FILE,
  OUT_DIR
} from './brand.js'

function readJson(relative: string): Record<string, any> {
  return JSON.parse(readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8'))
}

test('derives every name from the brand slug', () => {
  assert.equal(CLI_BIN, BRAND.PRODUCT_SLUG)
  assert.equal(CONFIG_FILE, `${BRAND.PRODUCT_SLUG}.yml`)
  assert.equal(IGNORE_FILE, `.${BRAND.PRODUCT_SLUG}ignore`)
  assert.equal(OUT_DIR, `.${BRAND.PRODUCT_SLUG}`)
  assert.equal(CACHE_DIR, `${OUT_DIR}/cache`)
  assert.equal(ENV_PREFIX, `${BRAND.PRODUCT_SLUG.toUpperCase()}_`)
  assert.equal(BRAND.PRODUCT_NAME, 'Atlasmith')
  assert.equal(GRAPH_FILE, 'graph.json')
})

test('package.json names and bin match the brand config (rename guard)', () => {
  const engine = readJson('../package.json')
  const cli = readJson('../../cli/package.json')
  assert.equal(engine.name, ENGINE_PACKAGE_NAME)
  assert.equal(cli.name, CLI_PACKAGE_NAME)
  assert.deepEqual(Object.keys(cli.bin), [CLI_BIN])
  assert.equal(Object.keys(cli.dependencies)[0], ENGINE_PACKAGE_NAME)
})
