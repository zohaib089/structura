import type { MessageParams, MessageParamValue } from './graph-types'

/** Matches packages/engine graph.json 1.7.0 `messageCode`. */
export const MESSAGE_CODE_PATTERN = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9-]*)+$/

/** Matches packages/engine graph.json 1.7.0 `messageParams` property names. */
const PARAM_NAME = /^[A-Za-z][A-Za-z0-9]*$/

const CODE_MAX = 64
const PARAM_STRING_MAX = 4096
const PARAM_ARRAY_MAX = 64

export type MessageFields = {
  code?: string
  params?: MessageParams
}

/**
 * Read optional `code` / `params` from a graph or ask payload.
 * Returns `null` when the fields are absent, `invalid` when the shape is wrong.
 */
export function readMessageFields(value: Record<string, unknown>): MessageFields | 'invalid' | null {
  const hasCode = Object.hasOwn(value, 'code')
  const hasParams = Object.hasOwn(value, 'params')
  if (!hasCode && !hasParams) return null
  const out: MessageFields = {}
  if (hasCode) {
    const code = value.code
    if (typeof code !== 'string' || code.length < 1 || code.length > CODE_MAX || !MESSAGE_CODE_PATTERN.test(code)) {
      return 'invalid'
    }
    out.code = code
  }
  if (hasParams) {
    const params = readMessageParams(value.params)
    if (params === 'invalid') return 'invalid'
    if (params) out.params = params
  }
  return out
}

export function readMessageParams(value: unknown): MessageParams | 'invalid' | null {
  if (value === undefined) return null
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'invalid'
  const entries = Object.entries(value as Record<string, unknown>)
  if (entries.length === 0) return 'invalid'
  const params: MessageParams = {}
  for (const [key, raw] of entries) {
    if (!PARAM_NAME.test(key)) return 'invalid'
    const parsed = readParamValue(raw)
    if (parsed === 'invalid') return 'invalid'
    params[key] = parsed
  }
  return params
}

function readParamValue(value: unknown): MessageParamValue | 'invalid' {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') {
    if (!Number.isInteger(value) || !Number.isFinite(value) || Object.is(value, -0)) return 'invalid'
    return value
  }
  if (typeof value === 'string') {
    if (value.length > PARAM_STRING_MAX) return 'invalid'
    return value
  }
  if (Array.isArray(value)) {
    if (value.length > PARAM_ARRAY_MAX) return 'invalid'
    const items: string[] = []
    for (const item of value) {
      if (typeof item !== 'string' || item.length < 1 || item.length > PARAM_STRING_MAX) return 'invalid'
      items.push(item)
    }
    return items
  }
  return 'invalid'
}
