import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { LIMITS } from '../../limits.js'
import type { AdapterParseResult, ExtractLimits } from '../adapter.js'
import { createJavaAdapter } from './adapter.js'
import { extractJava, readJavaPackage } from './extract.js'

const limits: ExtractLimits = {
  maxIdentifierLength: LIMITS.maxIdentifierLength.default,
  maxSymbolsPerFile: LIMITS.maxSymbolsPerFile.default,
  maxEdgesPerFile: LIMITS.maxEdgesPerFile.default
}

function parse(content: string, cap?: Partial<ExtractLimits>): AdapterParseResult {
  return extractJava(content, { ...limits, ...cap })
}

function specifiers(content: string): Array<{ specifier: string | null; names?: string[] }> {
  return parse(content).references.map(reference => ({
    specifier: reference.specifier,
    ...(reference.names ? { names: reference.names } : {})
  }))
}

describe('extractJava', () => {
  test('parses a package declaration and ordinary imports', () => {
    const src = `package com.example.mini;

import java.util.List;
import com.example.mini.util.Helper;
`
    assert.equal(readJavaPackage(src), 'com.example.mini')
    const result = parse(src)
    assert.equal(result.syntaxErrorCount, 0)
    assert.deepEqual(
      result.references.map(reference => reference.specifier),
      ['java.util.List', 'com.example.mini.util.Helper']
    )
    assert.equal(result.references[0]?.span.start.line, 3)
  })

  test('parses static and wildcard imports', () => {
    const src = `package com.example.mini;

import java.util.*;
import static java.lang.Math.max;
import static java.lang.Math.*;
`
    assert.deepEqual(specifiers(src), [
      { specifier: 'java.util.*' },
      { specifier: 'java.lang.Math.max', names: ['static'] },
      { specifier: 'java.lang.Math.*', names: ['static'] }
    ])
  })

  test('ignores comments and does not read imports after the type declaration', () => {
    const src = `package p;

// import java.util.Hidden;
import java.util.List; /* trailing */
/*
import java.util.Skip;
*/
import java.io.File;

public class App {
  void f() {
    // import java.util.Nope;
  }
}
`
    assert.deepEqual(
      parse(src).references.map(reference => reference.specifier),
      ['java.util.List', 'java.io.File']
    )
    assert.equal(readJavaPackage('class Only {}'), undefined)
  })

  test('honours the per-file edge cap', () => {
    const capped = parse('import java.util.List;\nimport java.io.File;\n', { maxEdgesPerFile: 1 })
    assert.equal(capped.references.length, 1)
    assert.equal(capped.omitted.edges, 1)
  })
})

test('createJavaAdapter parse matches extractJava', async () => {
  const adapter = createJavaAdapter()
  await adapter.load()
  const content = 'package p;\nimport java.util.List;\n'
  const outcome = await adapter.parse({ path: 'p/A.java', content, language: 'java', limits })
  assert.equal(outcome.ok, true)
  if (outcome.ok) assert.deepEqual(outcome.result.references.map(r => r.specifier), ['java.util.List'])
})
