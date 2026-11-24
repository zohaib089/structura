import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { LIMITS } from '../../limits.js'
import type { AdapterParseResult, ExtractLimits } from '../adapter.js'
import { createRustAdapter } from './adapter.js'
import { extractRust } from './extract.js'

const limits: ExtractLimits = {
  maxIdentifierLength: LIMITS.maxIdentifierLength.default,
  maxSymbolsPerFile: LIMITS.maxSymbolsPerFile.default,
  maxEdgesPerFile: LIMITS.maxEdgesPerFile.default
}

function parse(content: string, cap?: Partial<ExtractLimits>): AdapterParseResult {
  return extractRust(content, { ...limits, ...cap })
}

function specifiers(content: string): string[] {
  return parse(content).references.map(reference => reference.specifier ?? '')
}

describe('extractRust', () => {
  test('parses a single-line use', () => {
    const result = parse('use std::collections::HashMap;\n')
    assert.equal(result.syntaxErrorCount, 0)
    assert.deepEqual(specifiers('use std::collections::HashMap;\n'), ['std::collections::HashMap'])
    const span = result.references[0]?.span
    assert.equal(span?.start.line, 1)
    assert.equal(span?.start.col, 5)
  })

  test('parses grouped and nested use trees, globs, aliases, and pub use', () => {
    const src = `use std::io::{self, Read, Write as W};
use crate::util::{helper, nested::{a, b as B, *}};
pub use crate::util::helper as help;
use crate::*;
`
    const result = parse(src)
    assert.equal(result.syntaxErrorCount, 0)
    assert.deepEqual(
      result.references.map(reference => ({ specifier: reference.specifier, names: reference.names })),
      [
        { specifier: 'std::io', names: undefined },
        { specifier: 'std::io::Read', names: undefined },
        { specifier: 'std::io::Write', names: ['W'] },
        { specifier: 'crate::util::helper', names: undefined },
        { specifier: 'crate::util::nested::a', names: undefined },
        { specifier: 'crate::util::nested::b', names: ['B'] },
        { specifier: 'crate::util::nested::*', names: undefined },
        { specifier: 'crate::util::helper', names: ['help'] },
        { specifier: 'crate::*', names: undefined }
      ]
    )
  })

  test('parses mod declarations and extern crate, including aliases', () => {
    const src = `extern crate alloc;
extern crate serde as de;
mod util;
pub mod hook;
mod inline { use crate::util::helper; }
`
    const result = parse(src)
    assert.equal(result.syntaxErrorCount, 0)
    assert.deepEqual(
      result.references.map(reference => ({ specifier: reference.specifier, names: reference.names })),
      [
        { specifier: 'alloc', names: undefined },
        { specifier: 'serde', names: ['de'] },
        { specifier: 'mod util', names: undefined },
        { specifier: 'mod hook', names: undefined },
        { specifier: 'crate::util::helper', names: undefined }
      ]
    )
  })

  test('ignores comments and does not read uses inside strings', () => {
    const src = `// use crate::commented;
use std::fmt; // trailing
/* use crate::blocked; */
use crate::util;

const X: &str = "use crate::nope";
const Y: &str = r#"use crate::raw"#;

fn main() {}
`
    assert.deepEqual(specifiers(src), ['std::fmt', 'crate::util'])
  })

  test('honours the per-file edge cap and redacts secret-looking specifiers', () => {
    const capped = parse('use crate::a;\nuse crate::b;\n', { maxEdgesPerFile: 1 })
    assert.equal(capped.references.length, 1)
    assert.equal(capped.omitted.edges, 1)
    const secret = parse('use crate::token_s3cretvalue000000;\n')
    assert.equal(secret.references.length, 1)
  })
})

test('createRustAdapter parse matches extractRust', async () => {
  const adapter = createRustAdapter()
  await adapter.load()
  const content = 'use std::io;\nmod util;\n'
  const outcome = await adapter.parse({ path: 'src/main.rs', content, language: 'rust', limits })
  assert.equal(outcome.ok, true)
  if (outcome.ok) {
    assert.deepEqual(outcome.result.references.map(reference => reference.specifier), ['std::io', 'mod util'])
  }
})
