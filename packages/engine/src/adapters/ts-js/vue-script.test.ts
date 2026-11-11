import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { LIMITS } from '../../limits.js'
import type { ExtractedReference } from '../adapter.js'
import { createTypeScriptJavaScriptAdapter, shutdownParsePool } from './adapter.js'
import { extractVueScripts, shiftSpan } from './vue-script.js'

const adapter = createTypeScriptJavaScriptAdapter()
const limits = {
  maxIdentifierLength: LIMITS.maxIdentifierLength.default,
  maxSymbolsPerFile: LIMITS.maxSymbolsPerFile.default,
  maxEdgesPerFile: LIMITS.maxEdgesPerFile.default
}

before(async () => {
  await adapter.load()
})

after(async () => {
  await shutdownParsePool()
})

function slice(content: string, ref: ExtractedReference): string {
  const lines = content.split('\n')
  const { start, end } = ref.span
  if (start.line === end.line) return (lines[start.line - 1] as string).slice(start.col - 1, end.col - 1)
  const parts = [(lines[start.line - 1] as string).slice(start.col - 1)]
  for (let line = start.line + 1; line < end.line; line += 1) parts.push(lines[line - 1] as string)
  parts.push((lines[end.line - 1] as string).slice(0, end.col - 1))
  return parts.join('\n')
}

describe('extractVueScripts', () => {
  test('reads script setup and skips JSON blocks', () => {
    const source = [
      '<template><p>{{ n }}</p></template>',
      '<script type="application/json">{ "a": 1 }</script>',
      '<script setup lang="ts">',
      "import Foo from './Foo.vue'",
      'const n = 1',
      '</script>',
      '<style scoped>p { color: red }</style>'
    ].join('\n')
    const blocks = extractVueScripts(source)
    assert.equal(blocks.length, 1)
    assert.equal(blocks[0]?.language, 'typescript')
    assert.match(blocks[0]?.content ?? '', /import Foo from '\.\/Foo\.vue'/)
    assert.equal(blocks[0]?.startLine, 3)
  })

  test('keeps a second classic script and defaults lang-less setup to javascript', () => {
    const source = [
      '<script setup>',
      "import A from './a.js'",
      '</script>',
      '<script>',
      "export default { name: 'X' }",
      '</script>'
    ].join('\n')
    const blocks = extractVueScripts(source)
    assert.equal(blocks.length, 2)
    assert.equal(blocks[0]?.language, 'javascript')
    assert.equal(blocks[1]?.language, 'javascript')
  })

  test('shiftSpan maps the first line by column and later lines by row', () => {
    assert.deepEqual(
      shiftSpan(
        { start: { line: 1, col: 1 }, end: { line: 1, col: 5 } },
        10,
        3
      ),
      { start: { line: 10, col: 3 }, end: { line: 10, col: 7 } }
    )
    assert.deepEqual(
      shiftSpan(
        { start: { line: 2, col: 4 }, end: { line: 3, col: 2 } },
        10,
        3
      ),
      { start: { line: 11, col: 4 }, end: { line: 12, col: 2 } }
    )
  })
})

describe('vue SFC imports', () => {
  test('parses script setup imports with spans in the original file', async () => {
    const content = [
      '<template><Foo /></template>',
      '<script setup lang="ts">',
      "import Foo from './Foo.vue'",
      "import { ref } from 'vue'",
      '</script>'
    ].join('\n')
    const outcome = await adapter.parse({ path: 'src/Widget.vue', content, language: 'vue', limits })
    assert.equal(outcome.ok, true)
    if (!outcome.ok) return
    const specs = outcome.result.references.map((item) => item.specifier)
    assert.deepEqual(specs, ['./Foo.vue', 'vue'])
    const first = outcome.result.references[0]
    assert.ok(first)
    assert.equal(slice(content, first), "import Foo from './Foo.vue'")
  })

  test('a template-only SFC parses as an empty script, not a skip', async () => {
    const outcome = await adapter.parse({
      path: 'src/Empty.vue',
      content: '<template><p>hi</p></template>\n',
      language: 'vue',
      limits
    })
    assert.equal(outcome.ok, true)
    if (!outcome.ok) return
    assert.equal(outcome.result.references.length, 0)
    assert.equal(outcome.result.syntaxErrorCount, 0)
  })
})
