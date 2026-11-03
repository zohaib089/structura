import { Ajv2020 } from 'ajv/dist/2020.js'
import type { SchemaIssue } from '../graph/schema-check.js'
import { buildArchitectureConfigSchema, buildArchitectureSectionSchema } from './config-schema.js'
import { ArchitectureConfigError } from './errors.js'
import type { ArchitectureModuleDecl, ArchitecturePolicy, ResolvedArchitecture } from './types.js'

let documentValidator: ReturnType<Ajv2020['compile']> | undefined

function ajv(): Ajv2020 {
  return new Ajv2020({ strict: true, allErrors: true, allowUnionTypes: true })
}

function compileDocument(): ReturnType<Ajv2020['compile']> {
  if (!documentValidator) documentValidator = ajv().compile(buildArchitectureConfigSchema())
  return documentValidator
}

function ajvIssues(validator: ReturnType<Ajv2020['compile']>): SchemaIssue[] {
  return (validator.errors ?? []).map(error => ({
    path: error.instancePath || '/',
    message: error.message ?? 'invalid'
  }))
}

function duplicateModuleName(modules: readonly ArchitectureModuleDecl[]): string | undefined {
  const seen = new Set<string>()
  for (const mod of modules) {
    if (seen.has(mod.name)) return mod.name
    seen.add(mod.name)
  }
  return undefined
}

function normalizeModules(raw: unknown): ArchitectureModuleDecl[] {
  if (!raw || typeof raw !== 'object') return []
  const doc = raw as Record<string, unknown>
  const layers = Array.isArray(doc.layers) ? doc.layers : []
  const modules = Array.isArray(doc.modules) ? doc.modules : []
  const combined = [...layers, ...modules]
  const out: ArchitectureModuleDecl[] = []
  for (const entry of combined) {
    if (!entry || typeof entry !== 'object') continue
    const item = entry as Record<string, unknown>
    if (typeof item.name !== 'string' || !Array.isArray(item.paths)) continue
    out.push({
      name: item.name,
      paths: item.paths.filter((path): path is string => typeof path === 'string'),
      ...(Array.isArray(item.allow) ? { allow: item.allow.filter((name): name is string => typeof name === 'string') } : {}),
      ...(Array.isArray(item.deny) ? { deny: item.deny.filter((name): name is string => typeof name === 'string') } : {}),
      ...(item.policy === 'deny-undeclared' || item.policy === 'allow-undeclared' ? { policy: item.policy } : {})
    })
  }
  return out
}

function assertKnownDependencies(modules: readonly ArchitectureModuleDecl[]): SchemaIssue[] {
  const names = new Set(modules.map(mod => mod.name))
  const issues: SchemaIssue[] = []
  for (const mod of modules) {
    for (const dep of mod.allow ?? []) {
      if (!names.has(dep)) issues.push({ path: `/architecture/modules/${mod.name}/allow`, message: `unknown module "${dep}"` })
    }
    for (const dep of mod.deny ?? []) {
      if (!names.has(dep)) issues.push({ path: `/architecture/modules/${mod.name}/deny`, message: `unknown module "${dep}"` })
    }
  }
  return issues
}

/**
 * Parses and validates architecture config embedded in the repo config file (YAML already parsed to a plain object).
 * Returns `undefined` when the document has no architecture section.
 */
export function resolveArchitectureConfig(
  yamlDocument: unknown,
  configPath: string
): ResolvedArchitecture | undefined {
  if (yamlDocument === null || yamlDocument === undefined) return undefined
  if (typeof yamlDocument !== 'object' || Array.isArray(yamlDocument)) {
    throw new ArchitectureConfigError('architecture config must be a YAML mapping', [{ path: '', message: 'expected mapping' }])
  }
  const doc = yamlDocument as Record<string, unknown>
  if (doc.architecture === undefined) {
    // Support illustrative top-level `layers` / `modules` without an `architecture` wrapper.
    if (doc.layers === undefined && doc.modules === undefined) return undefined
    const wrapped = { architecture: { ...(doc.layers ? { layers: doc.layers } : {}), ...(doc.modules ? { modules: doc.modules } : {}), ...(doc.defaultPolicy ? { defaultPolicy: doc.defaultPolicy } : {}) } }
    return resolveArchitectureConfig(wrapped, configPath)
  }

  const validator = compileDocument()
  if (!validator(doc)) {
    const issues = ajvIssues(validator)
    throw new ArchitectureConfigError(formatIssues(issues), issues)
  }

  const section = doc.architecture as Record<string, unknown>
  const modules = normalizeModules(section)
  if (modules.length === 0) {
    throw new ArchitectureConfigError('architecture must declare at least one module or layer', [{ path: '/architecture/modules', message: 'empty' }])
  }
  const duplicate = duplicateModuleName(modules)
  if (duplicate) {
    throw new ArchitectureConfigError(`duplicate module name "${duplicate}"`, [{ path: '/architecture/modules', message: 'duplicate name' }])
  }
  const dependencyIssues = assertKnownDependencies(modules)
  if (dependencyIssues.length > 0) throw new ArchitectureConfigError(formatIssues(dependencyIssues), dependencyIssues)

  const defaultPolicy = section.defaultPolicy === 'deny-undeclared' || section.defaultPolicy === 'allow-undeclared'
    ? section.defaultPolicy as ArchitecturePolicy
    : undefined

  return { configPath, defaultPolicy, modules }
}

export function formatIssues(issues: readonly SchemaIssue[]): string {
  return issues.slice(0, 8).map(issue => `${issue.path || '/'} ${issue.message}`).join('; ')
}
