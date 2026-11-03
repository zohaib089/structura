import assert from 'node:assert/strict'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { CANARY_GRAPH_PATH } from '@atlasmith/engine'

const here = dirname(fileURLToPath(import.meta.url))
const bin = join(here, '../dist/bin.js')

test('stdio initialize, tools/list, and tools/call list_modules', async () => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [bin, 'mcp', '--graph', CANARY_GRAPH_PATH],
    cwd: process.cwd(),
    stderr: 'pipe'
  })
  const client = new Client({ name: 'atlasmith-mcp-test', version: '0.0.0' })
  await client.connect(transport)
  try {
    const tools = await client.listTools()
    const names = tools.tools.map(tool => tool.name).sort()
    assert.deepEqual(names, [
      'architecture_findings',
      'file_deps',
      'impact_lite',
      'list_modules',
      'symbol_lookup'
    ])
    const result = await client.callTool({ name: 'list_modules', arguments: {} })
    assert.equal(result.isError, undefined)
    const text = result.content[0]
    assert.equal(text?.type, 'text')
    const parsed = JSON.parse(text.type === 'text' ? text.text : '') as { modules: unknown[] }
    assert.ok(Array.isArray(parsed.modules))
    assert.equal(parsed.modules.length, 0)
  } finally {
    await client.close()
  }
})
