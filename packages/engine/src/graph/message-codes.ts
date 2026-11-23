import { compareStrings } from './ids.js'

/** First graph.json minor that writes `code` / `params` on quality, hotspot, and duplicate text. */
export const MESSAGE_CODES_MINOR = 7

/**
 * Every structured message code the engine may emit, next to an existing English
 * string. Keep this list in lockstep with `docs/message-codes.md`.
 */
export const MESSAGE_CODES = [
  'quality.architecture',
  'quality.cycles',
  'quality.hotspots',
  'quality.imports',
  'quality.size',
  'quality.tip.forbidden-import',
  'quality.tip.undeclared-import',
  'quality.tip.cycle',
  'quality.tip.large-file',
  'quality.tip.large-function',
  'quality.tip.unresolved-imports',
  'quality.tip.hotspot',
  'quality.tip.architecture',
  'quality.tip.cycles',
  'quality.tip.hotspots',
  'quality.tip.imports',
  'quality.tip.size',
  'hotspot.why',
  'duplicate.same-file',
  'duplicate.pair',
  'duplicate.many-files',
  'qa.resolve.missing',
  'qa.resolve.ambiguous',
  'qa.impact.need-target',
  'qa.impact.no-files',
  'qa.impact.none',
  'qa.impact.dependents',
  'qa.explain.need-target',
  'qa.explain.file',
  'qa.explain.folder',
  'qa.explain.folder-empty',
  'qa.explain.symbol',
  'qa.hotspots.none',
  'qa.hotspots.list',
  'qa.quality.none',
  'qa.quality.score',
  'qa.quality.folder-missing',
  'qa.duplicates.none',
  'qa.duplicates.list',
  'qa.architecture',
  'qa.overview',
  'qa.fallback.empty',
  'qa.fallback.unknown'
] as const

export type MessageCodeId = (typeof MESSAGE_CODES)[number]

const MESSAGE_CODE_SET = new Set<string>(MESSAGE_CODES)

export function isMessageCode(value: string): value is MessageCodeId {
  return MESSAGE_CODE_SET.has(value)
}

/** JSON-serialisable parameter values for a message code. */
export type MessageParamValue = string | number | boolean | readonly string[]

export type MessageParams = Record<string, MessageParamValue>

export interface MessageFields {
  code: MessageCodeId
  params?: MessageParams
}

/** True when this graph.json version should carry `code` / `params` on graph text fields. */
export function graphEmitsMessageCodes(schemaVersion: string): boolean {
  const match = /^(\d+)\.(\d+)\./.exec(schemaVersion)
  if (!match) return false
  const major = Number(match[1])
  const minor = Number(match[2])
  return major > 1 || (major === 1 && minor >= MESSAGE_CODES_MINOR)
}

function isEmptyParams(params: MessageParams | undefined): params is undefined {
  return params === undefined || Object.keys(params).length === 0
}

/** Deterministic `code` / `params` fields; `params` is omitted when empty and keys are sorted. */
export function messageFields(code: MessageCodeId, params?: MessageParams): MessageFields {
  if (isEmptyParams(params)) return { code }
  const sorted: MessageParams = {}
  for (const key of Object.keys(params).sort(compareStrings)) {
    const value = params[key]
    if (value === undefined) continue
    sorted[key] = Array.isArray(value) ? [...value] : value
  }
  return Object.keys(sorted).length > 0 ? { code, params: sorted } : { code }
}
