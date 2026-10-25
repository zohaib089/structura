/**
 * A tiny, CSP-safe (no eval / new Function) interpreter for the JSON Schema keyword
 * subset used by `buildGraphJsonSchema()`. The viewer and `readGraph` use it so there is
 * exactly one schema source; Ajv (`validateStrict`) is the independent cross-check.
 *
 * Supported: $ref (#/$defs/x), const, enum, type (name or list), properties, required,
 * additionalProperties:false, propertyNames.pattern, items, oneOf, minimum,
 * exclusiveMinimum, maximum, pattern, minLength.
 */

export interface SchemaIssue {
  /** JSON-pointer-like location, e.g. `/nodes/3/span/start/line`. */
  path: string
  message: string
}

export interface CheckOptions {
  /** `strict`: unknown properties are errors. `tolerant`: they are stripped. */
  mode: 'strict' | 'tolerant'
  /** Accept unknown enum values and unknown node/edge variants (document of a newer minor version). */
  lenient?: boolean
}

type Schema = Record<string, unknown>
interface Outcome {
  value: unknown
  issues: SchemaIssue[]
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function typeMatches(type: string, value: unknown): boolean {
  switch (type) {
    case 'object': return isPlainObject(value)
    case 'array': return Array.isArray(value)
    case 'string': return typeof value === 'string'
    case 'integer': return typeof value === 'number' && Number.isSafeInteger(value)
    case 'number': return typeof value === 'number' && Number.isFinite(value)
    case 'boolean': return typeof value === 'boolean'
    case 'null': return value === null
    default: return false
  }
}

const describe = (value: unknown): string => (value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value)

export function checkAgainstSchema(root: Schema, value: unknown, options: CheckOptions): Outcome {
  const defs = (root.$defs ?? {}) as Record<string, Schema>
  const regexCache = new Map<string, RegExp>()
  const regex = (pattern: string): RegExp => {
    let compiled = regexCache.get(pattern)
    if (!compiled) {
      compiled = new RegExp(pattern, 'u')
      regexCache.set(pattern, compiled)
    }
    return compiled
  }
  const resolve = (schema: Schema): { schema: Schema; name?: string } => {
    const target = schema.$ref
    if (typeof target !== 'string') return { schema }
    const name = target.replace('#/$defs/', '')
    const found = defs[name]
    if (!found) throw new Error(`Unsupported $ref ${target}`)
    return { schema: found, name }
  }

  /** Cheap branch pre-filter: skip a oneOf branch whose `const` discriminator cannot match. */
  const discriminatorMismatch = (branch: Schema, value: unknown): boolean => {
    if (!isPlainObject(value)) return false
    const properties = branch.properties
    if (!isPlainObject(properties)) return false
    for (const [key, sub] of Object.entries(properties)) {
      if (isPlainObject(sub) && 'const' in sub && key in value && value[key] !== sub.const) return true
    }
    return false
  }

  function check(input: Schema, data: unknown, path: string): Outcome {
    const { schema, name } = resolve(input)
    const issues: SchemaIssue[] = []
    const fail = (message: string): Outcome => ({ value: data, issues: [...issues, { path, message }] })

    if ('const' in schema && data !== schema.const) return fail(`must be ${JSON.stringify(schema.const)}`)
    if (Array.isArray(schema.enum) && !schema.enum.includes(data)) {
      if (!(options.lenient && typeof data === 'string')) return fail(`must be one of ${schema.enum.map(item => JSON.stringify(item)).join(', ')}`)
    }
    if (schema.type !== undefined) {
      const types = Array.isArray(schema.type) ? (schema.type as string[]) : [schema.type as string]
      if (!types.some(type => typeMatches(type, data))) return fail(`must be ${types.join(' or ')} (got ${describe(data)})`)
    }
    if (typeof data === 'number') {
      if (typeof schema.minimum === 'number' && data < schema.minimum) return fail(`must be >= ${schema.minimum}`)
      if (typeof schema.exclusiveMinimum === 'number' && data <= schema.exclusiveMinimum) return fail(`must be > ${schema.exclusiveMinimum}`)
      if (typeof schema.maximum === 'number' && data > schema.maximum) return fail(`must be <= ${schema.maximum}`)
    }
    if (typeof data === 'string') {
      if (typeof schema.minLength === 'number' && data.length < schema.minLength) return fail(`must not be shorter than ${schema.minLength}`)
      if (typeof schema.pattern === 'string' && !regex(schema.pattern).test(data)) return fail(`must match ${schema.pattern}`)
    }

    if (Array.isArray(schema.oneOf)) {
      const branches = (schema.oneOf as Schema[]).filter(branch => !discriminatorMismatch(resolve(branch).schema, data))
      const results = branches.map(branch => check(branch, data, path))
      const matches = results.filter(result => result.issues.length === 0)
      if (matches.length === 1) return matches[0] as Outcome
      if (matches.length > 1) return fail('matches more than one allowed shape')
      if (options.lenient && (name === 'node' || name === 'edge') && isPlainObject(data)) {
        const generic = name === 'node' ? ['id', 'kind'] : ['source', 'type', 'target']
        if (generic.every(key => typeof data[key] === 'string')) return { value: data, issues: [] }
      }
      if (results.length === 0) return fail('does not match any allowed shape')
      const best = results.reduce((a, b) => (b.issues.length < a.issues.length ? b : a))
      return { value: data, issues: best.issues }
    }

    if (isPlainObject(data) && (schema.properties || schema.propertyNames || schema.required)) {
      const properties = (schema.properties ?? {}) as Record<string, Schema>
      const out: Record<string, unknown> = {}
      for (const key of Object.keys(data)) {
        const sub = properties[key]
        if (sub) {
          const result = check(sub, data[key], `${path}/${key}`)
          issues.push(...result.issues)
          out[key] = result.value
        } else if (schema.additionalProperties === false) {
          if (options.mode === 'strict') issues.push({ path: `${path}/${key}`, message: 'unknown property' })
        } else {
          out[key] = data[key]
        }
      }
      for (const key of (schema.required ?? []) as string[]) {
        if (!(key in data)) issues.push({ path, message: `missing required property "${key}"` })
      }
      const names = schema.propertyNames as Schema | undefined
      if (names && typeof names.pattern === 'string') {
        const pattern = regex(names.pattern)
        for (const key of Object.keys(data)) {
          if (!pattern.test(key)) issues.push({ path: `${path}/${key}`, message: `property name must match ${names.pattern}` })
        }
      }
      return { value: out, issues }
    }

    if (Array.isArray(data) && schema.items) {
      const out: unknown[] = []
      for (let index = 0; index < data.length; index += 1) {
        const result = check(schema.items as Schema, data[index], `${path}/${index}`)
        issues.push(...result.issues)
        out.push(result.value)
        if (issues.length > 200) break
      }
      return { value: out, issues }
    }
    return { value: data, issues }
  }

  return check(root, value, '')
}
