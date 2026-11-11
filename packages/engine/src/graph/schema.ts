import {
  EDGE_TYPES,
  ENTRY_REASONS,
  EXTENSION_KEY_PATTERN,
  FAIL_REASONS,
  GRAPH_SCHEMA_ID,
  IGNORE_RULE_PATTERN,
  INFERRED_REASONS,
  LANGUAGES,
  PARTIAL_REASONS,
  IMPORT_KINDS,
  PROVENANCES,
  SKIP_REASONS,
  SYMBOL_KINDS,
  UNRESOLVED_REASONS,
  ARCHITECTURE_DRIFT_RULES,
  ARCHITECTURE_EDGE_KINDS,
  ARCHITECTURE_POLICIES
} from './types.js'

type Schema = Record<string, unknown>

const ref = (name: string): Schema => ({ $ref: `#/$defs/${name}` })
const count: Schema = { type: 'integer', minimum: 0 }
const labelStr = (): Schema => ({ type: 'string', minLength: 1, maxLength: 4096 })
const str = (extra: Schema = {}): Schema => ({ type: 'string', ...extra })
const closed = (properties: Record<string, Schema>, required: string[]): Schema => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false
})
/** `typescript` | `javascript` | `python` | `vue` | null. Anything else is stored as null. */
const languageValue: Schema = { type: ['string', 'null'], enum: [...LANGUAGES, null] }
const withExt = (properties: Record<string, Schema>): Record<string, Schema> => ({ ...properties, extensions: ref('extensions') })

/**
 * Builds the JSON Schema (draft 2020-12) of graph.json v1. This is the single source of
 * truth: `schema/graph.v1.schema.json` is generated from it, `validateStrict` compiles it
 * with Ajv, and `readGraph` interprets the very same document in the viewer.
 * Keep to the keyword subset `schema-check.ts` implements.
 */
export function buildGraphJsonSchema(): Schema {
  const position = closed({ line: { type: 'integer', minimum: 1 }, col: { type: 'integer', minimum: 1 } }, ['line', 'col'])
  const edgeCommon = {
    source: str({ minLength: 1 }),
    target: str({ minLength: 1 })
  }

  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: GRAPH_SCHEMA_ID,
    title: 'graph.json v1',
    description: 'Deterministic, closed, source-text-free repository graph. See docs/graph-json-v1.md.',
    type: 'object',
    properties: {
      schemaVersion: str({ pattern: '^1\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)$' }),
      summary: closed({
        nodes: count,
        edges: count,
        files: count,
        entryCandidates: closed({ files: count, candidates: count }, ['files', 'candidates'])
      }, ['nodes', 'edges', 'files']),
      coverage: ref('coverage'),
      nodes: { type: 'array', items: ref('node') },
      edges: { type: 'array', items: ref('edge') },
      architecture: ref('architecture'),
      extensions: ref('extensions')
    },
    required: ['schemaVersion', 'summary', 'coverage', 'nodes', 'edges'],
    additionalProperties: false,
    $defs: {
      extensions: {
        type: 'object',
        propertyNames: { pattern: EXTENSION_KEY_PATTERN }
      },
      position,
      span: closed({ start: ref('position'), end: ref('position') }, ['start', 'end']),
      provenance: { type: 'string', enum: [...PROVENANCES] },
      node: {
        oneOf: [ref('directoryNode'), ref('fileNode'), ref('symbolNode'), ref('externalNode'), ref('unresolvedNode')]
      },
      directoryNode: closed(
        withExt({ id: str({ minLength: 1 }), kind: { const: 'directory' }, path: str({ minLength: 1 }), label: labelStr() }),
        ['id', 'kind', 'path', 'label']
      ),
      parseInfo: {
        oneOf: [
          closed({ status: { const: 'parsed' } }, ['status']),
          closed({ status: { const: 'partial' }, reason: { type: 'string', enum: [...PARTIAL_REASONS] } }, ['status', 'reason']),
          closed({ status: { const: 'skipped' }, reason: { type: 'string', enum: [...SKIP_REASONS] } }, ['status', 'reason']),
          closed({ status: { const: 'failed' }, reason: { type: 'string', enum: [...FAIL_REASONS] } }, ['status', 'reason'])
        ]
      },
      entryCandidate: closed({ reason: { type: 'string', enum: [...ENTRY_REASONS] }, provenance: ref('provenance') }, ['reason', 'provenance']),
      entryEvidence: closed({ source: str({ minLength: 1 }), pointer: str(), span: ref('span') }, ['source']),
      entryCandidateDetail: closed(
        { reason: { type: 'string', enum: [...ENTRY_REASONS] }, evidence: ref('entryEvidence'), confidence: { type: 'number', exclusiveMinimum: 0, maximum: 1 } },
        ['reason', 'evidence', 'confidence']
      ),
      fileNode: closed(
        withExt({
          id: str({ minLength: 1 }),
          kind: { const: 'file' },
          path: str({ minLength: 1 }),
          label: labelStr(),
          language: languageValue,
          lineCount: { type: ['integer', 'null'], minimum: 1 },
          parse: ref('parseInfo'),
          decoding: { const: 'lossy' },
          entryCandidate: ref('entryCandidate'),
          entryCandidates: { type: 'array', items: ref('entryCandidateDetail') },
          module: { type: 'string', pattern: '^[a-z][a-z0-9-]*$' }
        }),
        ['id', 'kind', 'path', 'label', 'language', 'lineCount', 'parse']
      ),
      symbolNode: closed(
        withExt({
          id: str({ minLength: 1 }),
          kind: { const: 'symbol' },
          file: str({ minLength: 1 }),
          label: labelStr(),
          symbolKind: { type: 'string', enum: [...SYMBOL_KINDS] },
          exported: { type: 'boolean' },
          span: ref('span')
        }),
        ['id', 'kind', 'file', 'label', 'symbolKind', 'exported', 'span']
      ),
      externalNode: closed(
        withExt({
          id: str({ minLength: 1 }),
          kind: { const: 'external' },
          ecosystem: str({ pattern: '^[a-z][a-z0-9-]*$' }),
          label: labelStr()
        }),
        ['id', 'kind', 'ecosystem', 'label']
      ),
      unresolvedNode: closed(
        withExt({
          id: str({ minLength: 1 }),
          kind: { const: 'unresolved' },
          label: labelStr(),
          reason: { type: 'string', enum: [...UNRESOLVED_REASONS] }
        }),
        ['id', 'kind', 'label', 'reason']
      ),
      edge: {
        // EXTRACTED edges (contains, imports, reexports) forbid confidence and reason.
        // INFERRED edges require both. oneOf below is what the CSP-safe reader enforces;
        // Ajv (validateStrict) also enforces this if/then.
        if: { type: 'object', properties: { provenance: { const: 'EXTRACTED' } }, required: ['provenance'] },
        then: {
          allOf: [
            { not: { type: 'object', properties: { confidence: true }, required: ['confidence'] } },
            { not: { type: 'object', properties: { reason: true }, required: ['reason'] } }
          ]
        },
        else: { type: 'object', required: ['confidence', 'reason'] },
        oneOf: [ref('containsEdge'), ref('extractedRefEdge'), ref('inferredRefEdge')]
      },
      containsEdge: closed(
        withExt({ ...edgeCommon, type: { const: 'contains' }, provenance: { const: 'EXTRACTED' } }),
        ['source', 'type', 'target', 'provenance']
      ),
      extractedRefEdge: closed(
        withExt({
          ...edgeCommon,
          type: { type: 'string', enum: EDGE_TYPES.filter(type => type !== 'contains') },
          provenance: { const: 'EXTRACTED' },
          span: ref('span'),
          specifier: str({
            description: 'Module specifier text. A non-literal import() or require() is still this EXTRACTED edge, with specifier "<non-literal>" and importKind "dynamic" or "require". It has no confidence and no reason.'
          }),
          importKind: { type: 'string', enum: IMPORT_KINDS.filter(kind => kind !== 'static') },
          typeOnly: { const: true }
        }),
        ['source', 'type', 'target', 'provenance', 'span', 'specifier']
      ),
      inferredRefEdge: closed(
        withExt({
          ...edgeCommon,
          type: { type: 'string', enum: EDGE_TYPES.filter(type => type !== 'contains') },
          provenance: { const: 'INFERRED' },
          confidence: { type: 'number', exclusiveMinimum: 0, maximum: 1 },
          reason: { type: 'string', enum: [...INFERRED_REASONS] },
          span: ref('span'),
          specifier: str(),
          importKind: { type: 'string', enum: IMPORT_KINDS.filter(kind => kind !== 'static') },
          typeOnly: { const: true }
        }),
        ['source', 'type', 'target', 'provenance', 'confidence', 'reason', 'span', 'specifier']
      ),
      coverage: closed(
        {
          files: closed(
            { discovered: count, parsed: count, partial: count, failed: count, skipped: count, ignored: count },
            ['discovered', 'parsed', 'partial', 'failed', 'skipped', 'ignored']
          ),
          byLanguage: {
            type: 'array',
            items: closed(
              { language: languageValue, parsed: count, partial: count, failed: count, skipped: count },
              ['language', 'parsed', 'partial', 'failed', 'skipped']
            )
          },
          skipped: { type: 'array', items: reasonCount(SKIP_REASONS) },
          failed: { type: 'array', items: reasonCount(FAIL_REASONS) },
          ignored: { type: 'array', items: closed({ rule: str({ pattern: IGNORE_RULE_PATTERN }), count }, ['rule', 'count']) },
          unresolved: { type: 'array', items: reasonCount(UNRESOLVED_REASONS) },
          accounting: closed({ discovered: count, accounted: count }, ['discovered', 'accounted'])
        },
        ['files', 'byLanguage', 'skipped', 'failed', 'ignored', 'unresolved', 'accounting']
      ),
      architectureModule: closed(
        {
          name: { type: 'string', pattern: '^[a-z][a-z0-9-]*$' },
          paths: { type: 'array', items: str({ minLength: 1, maxLength: 512 }), minItems: 1 },
          allow: { type: 'array', items: { type: 'string', pattern: '^[a-z][a-z0-9-]*$' } },
          deny: { type: 'array', items: { type: 'string', pattern: '^[a-z][a-z0-9-]*$' } },
          policy: { type: 'string', enum: [...ARCHITECTURE_POLICIES] }
        },
        ['name', 'paths']
      ),
      architectureFinding: closed(
        {
          from: str({ minLength: 1 }),
          to: str({ minLength: 1 }),
          edgeKind: { type: 'string', enum: [...ARCHITECTURE_EDGE_KINDS] },
          file: str({ minLength: 1 }),
          line: { type: 'integer', minimum: 1 },
          rule: str({ minLength: 1 }),
          provenance: { const: 'EXTRACTED' }
        },
        ['from', 'to', 'edgeKind', 'file', 'line', 'rule', 'provenance']
      ),
      architecture: closed(
        {
          config: str({ minLength: 1 }),
          defaultPolicy: { type: 'string', enum: [...ARCHITECTURE_POLICIES] },
          modules: { type: 'array', items: ref('architectureModule'), minItems: 1 },
          unassigned: { type: 'array', items: str({ minLength: 1 }) },
          findings: { type: 'array', items: ref('architectureFinding') },
          summary: closed({ violations: count, unassignedFiles: count }, ['violations', 'unassignedFiles'])
        },
        ['config', 'modules', 'unassigned', 'summary']
      )
    }
  }

  function reasonCount(reasons: readonly string[]): Schema {
    return closed({ reason: { type: 'string', enum: [...reasons] }, count }, ['reason', 'count'])
  }
}
