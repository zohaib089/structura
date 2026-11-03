import { createHash } from 'node:crypto'

/** Stable header token when no architecture config file was read. */
export const NO_ARCHITECTURE_CONFIG_HASH = 'none'

/** SHA-256 of the raw config file bytes used for architecture (invalidates incremental cache on change). */
export function architectureConfigHash(configText: string | undefined): string {
  if (configText === undefined) return NO_ARCHITECTURE_CONFIG_HASH
  return createHash('sha256').update(configText, 'utf8').digest('hex')
}
