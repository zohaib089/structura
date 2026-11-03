/** Brand-free schema id for declared architecture config. */
export const ARCHITECTURE_CONFIG_SCHEMA_ID = 'urn:repo-graph:schema:architecture:1'

const moduleName = { type: 'string', pattern: '^[a-z][a-z0-9-]*$' } as const
const pathGlob = { type: 'string', minLength: 1, maxLength: 512 } as const

const moduleEntry = {
  type: 'object',
  properties: {
    name: moduleName,
    paths: { type: 'array', items: pathGlob, minItems: 1 },
    allow: { type: 'array', items: moduleName, uniqueItems: true },
    deny: { type: 'array', items: moduleName, uniqueItems: true },
    policy: { type: 'string', enum: ['deny-undeclared', 'allow-undeclared'] }
  },
  required: ['name', 'paths'],
  additionalProperties: false
} as const

const architectureBody = {
  type: 'object',
  properties: {
    defaultPolicy: { type: 'string', enum: ['deny-undeclared', 'allow-undeclared'] },
    modules: { type: 'array', items: moduleEntry },
    layers: { type: 'array', items: moduleEntry }
  },
  additionalProperties: false
} as const

/** JSON Schema (2020-12) for the `architecture` section of the repo config file. */
export function buildArchitectureConfigSchema(): Record<string, unknown> {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: ARCHITECTURE_CONFIG_SCHEMA_ID,
    title: 'declared architecture config',
    type: 'object',
    properties: {
      architecture: architectureBody
    },
    required: ['architecture'],
    additionalProperties: true
  }
}

/** Validates only the architecture section object (after extraction from YAML). */
export function buildArchitectureSectionSchema(): Record<string, unknown> {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: `${ARCHITECTURE_CONFIG_SCHEMA_ID}/section`,
    ...architectureBody,
    anyOf: [
      { required: ['modules'], properties: { modules: { minItems: 1 } } },
      { required: ['layers'], properties: { layers: { minItems: 1 } } }
    ]
  }
}
