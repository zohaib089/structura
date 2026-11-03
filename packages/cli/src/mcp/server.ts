import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CLI_BIN, GRAPH_FILE, PRODUCT_NAME, type Graph } from '@atlasmith/engine'
import { z } from 'zod'
import {
  architectureFindings,
  fileDeps,
  impactLite,
  listModules,
  McpToolError,
  symbolLookup,
  toolErrorFromUnknown
} from './tools.js'

function jsonText(value: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }]
  }
}

function toolError(message: string) {
  return {
    content: [{ type: 'text' as const, text: message }],
    isError: true as const
  }
}

const readOnly = { readOnlyHint: true as const, destructiveHint: false as const, openWorldHint: false as const }

export function createGraphMcpServer(graph: Graph): McpServer {
  const server = new McpServer(
    { name: `${CLI_BIN}-graph`, version: '0.1.0' },
    {
      instructions:
        `Read-only access to a ${PRODUCT_NAME} scan (${GRAPH_FILE} v1). ` +
        `Use these tools to inspect modules, imports, symbols, architecture drift, and lightweight impact. ` +
        `Edge provenance is EXTRACTED (from source) or INFERRED (heuristic).`
    }
  )

  server.registerTool(
    'list_modules',
    {
      description: 'List declared architecture modules and file counts from the loaded graph.',
      annotations: readOnly,
      inputSchema: {}
    },
    async () => jsonText(listModules(graph))
  )

  server.registerTool(
    'file_deps',
    {
      description: 'List import and reexport edges for a file (imports outbound, importers inbound) with provenance.',
      annotations: readOnly,
      inputSchema: {
        file: z.string().describe('Repo-relative file path or graph node id')
      }
    },
    async ({ file }) => {
      try {
        return jsonText(fileDeps(graph, file))
      } catch (error) {
        return toolError(toolErrorFromUnknown(error).message)
      }
    }
  )

  server.registerTool(
    'symbol_lookup',
    {
      description: 'Find symbol nodes by exact label match.',
      annotations: readOnly,
      inputSchema: {
        name: z.string().min(1).describe('Symbol label to match exactly'),
        limit: z.number().int().positive().optional().describe('Max matches (default 50)')
      }
    },
    async ({ name, limit }) => {
      try {
        return jsonText(symbolLookup(graph, name, limit))
      } catch (error) {
        return toolError(toolErrorFromUnknown(error).message)
      }
    }
  )

  server.registerTool(
    'architecture_findings',
    {
      description: 'Return architecture drift findings from graph.architecture.findings (empty when none).',
      annotations: readOnly,
      inputSchema: {}
    },
    async () => jsonText(architectureFindings(graph))
  )

  server.registerTool(
    'impact_lite',
    {
      description:
        'List file nodes that transitively import the given file (reverse import chain among files only), bounded by depth and limit.',
      annotations: readOnly,
      inputSchema: {
        file: z.string().describe('Repo-relative file path or graph node id'),
        depth: z.number().int().positive().optional().describe('Max import hops (default 3)'),
        limit: z.number().int().positive().optional().describe('Max dependent files returned (default 50)')
      }
    },
    async ({ file, depth, limit }) => {
      try {
        return jsonText(impactLite(graph, file, depth, limit))
      } catch (error) {
        return toolError(toolErrorFromUnknown(error).message)
      }
    }
  )

  return server
}

export async function runMcpStdioServer(graph: Graph): Promise<void> {
  const server = createGraphMcpServer(graph)
  const transport = new StdioServerTransport()
  await server.connect(transport)
}
