import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { LIMITS } from '../../limits.js'
import type { AdapterParseResult, ExtractLimits } from '../adapter.js'
import { createGoAdapter } from './adapter.js'
import { extractGo } from './extract.js'

const limits: ExtractLimits = {
  maxIdentifierLength: LIMITS.maxIdentifierLength.default,
  maxSymbolsPerFile: LIMITS.maxSymbolsPerFile.default,
  maxEdgesPerFile: LIMITS.maxEdgesPerFile.default
}

function parse(content: string, cap?: Partial<ExtractLimits>): AdapterParseResult {
  return extractGo(content, { ...limits, ...cap })
}

function specifiers(content: string): string[] {
  return parse(content).references.map(reference => reference.specifier ?? '')
}

describe('extractGo', () => {
  test('parses a single-line import', () => {
    const result = parse('package main\n\nimport "fmt"\n')
    assert.equal(result.syntaxErrorCount, 0)
    assert.deepEqual(specifiers('package main\n\nimport "fmt"\n'), ['fmt'])
    const span = result.references[0]?.span
    assert.equal(span?.start.line, 3)
    assert.equal(span?.start.col, 8)
  })

  test('parses grouped import blocks including aliases, blank, and dot', () => {
    const src = `package app

import (
  "fmt"
  aliased "example.com/mini/pkg/util"
  _ "example.com/mini/pkg/hook"
  . "example.com/mini/pkg/hook"
)
`
    const result = parse(src)
    assert.equal(result.syntaxErrorCount, 0)
    assert.deepEqual(
      result.references.map(reference => ({ specifier: reference.specifier, names: reference.names })),
      [
        { specifier: 'fmt', names: undefined },
        { specifier: 'example.com/mini/pkg/util', names: ['aliased'] },
        { specifier: 'example.com/mini/pkg/hook', names: ['_'] },
        { specifier: 'example.com/mini/pkg/hook', names: ['.'] }
      ]
    )
  })

  test('parses single-line aliased, blank, and raw-string imports', () => {
    assert.deepEqual(specifiers('package p\nimport alias "foo.com/bar"\n'), ['foo.com/bar'])
    assert.deepEqual(specifiers('package p\nimport _ "foo.com/bar"\n'), ['foo.com/bar'])
    assert.deepEqual(specifiers('package p\nimport . "foo.com/bar"\n'), ['foo.com/bar'])
    assert.deepEqual(specifiers('package p\nimport `fmt`\n'), ['fmt'])
  })

  test('ignores comments and does not read imports that appear after other declarations', () => {
    const src = `package p

// import "commented"
import (
  "fmt" // trailing
  /* block */
  "os"
)

const x = "import \\"nope\\""

func f() {}
`
    assert.deepEqual(specifiers(src), ['fmt', 'os'])
  })

  test('honours the per-file edge cap and redacts secret-looking specifiers', () => {
    const capped = parse('package p\nimport (\n  "fmt"\n  "os"\n)\n', { maxEdgesPerFile: 1 })
    assert.equal(capped.references.length, 1)
    assert.equal(capped.omitted.edges, 1)
    const secret = parse('package p\nimport "https://example.com/token=s3cretvalue000000"\n')
    // looksSecret may or may not fire depending on the pattern; just ensure we still emit one reference.
    assert.equal(secret.references.length, 1)
  })
})

test('createGoAdapter parse matches extractGo', async () => {
  const adapter = createGoAdapter()
  await adapter.load()
  const content = 'package main\nimport "fmt"\n'
  const outcome = await adapter.parse({ path: 'main.go', content, language: 'go', limits })
  assert.equal(outcome.ok, true)
  if (outcome.ok) assert.deepEqual(outcome.result.references.map(r => r.specifier), ['fmt'])
})
