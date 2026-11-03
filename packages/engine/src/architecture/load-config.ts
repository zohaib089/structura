import { parse as parseYaml } from 'yaml'
import { ArchitectureConfigError } from './errors.js'
import { resolveArchitectureConfig } from './validate-config.js'
import type { ResolvedArchitecture } from './types.js'

/** Parses repo architecture config text. Returns `undefined` when no architecture section is present. */
export function loadArchitectureFromYaml(text: string, configPath: string): ResolvedArchitecture | undefined {
  let document: unknown
  try {
    document = parseYaml(text, { prettyErrors: false })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new ArchitectureConfigError(`invalid YAML in architecture config: ${message}`, [{ path: '', message: 'YAML parse error' }])
  }
  if (document === null || document === undefined) return undefined
  return resolveArchitectureConfig(document, configPath)
}
