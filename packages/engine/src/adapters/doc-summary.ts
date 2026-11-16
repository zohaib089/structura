import { looksSecret } from '../redact.js'
import { stripControls, truncateCodePoints } from '../text/unicode.js'

export const DOC_SUMMARY_MAX_CODE_POINTS = 160
/** Cap raw comment text before @example stripping so a hostile comment cannot dominate parse time. */
export const DOC_SUMMARY_MAX_RAW_CHARS = 8_192

const ZERO_WIDTH_AND_SOFT_HYPHEN = /[\u200B\u200C\u200D\u2060\uFEFF\u00AD]/g
const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/
/** Conservative phone patterns: +cc and grouped national numbers, not dates or versions. */
const PHONE = /(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}|\d{3}[\s.-]\d{3}[\s.-]\d{4})/

/**
 * First sentence only, then strip controls / zero-width / soft hyphens, NFKC-normalise,
 * omit if secret-shaped or truncated mid-token, and cap at 160 code points.
 */
export function sanitizeDocSummary(raw: string | null | undefined): string | undefined {
  if (raw === null || raw === undefined) return undefined
  const limited = raw.length > DOC_SUMMARY_MAX_RAW_CHARS ? raw.slice(0, DOC_SUMMARY_MAX_RAW_CHARS) : raw
  const description = stripExampleBlocks(limited).trim()
  if (description.length === 0) return undefined
  const sentence = firstSentence(description)
  const cleaned = normalizeDocText(sentence)
  if (cleaned.length === 0) return undefined
  if (looksSecret(cleaned) || containsContactInfo(cleaned)) return undefined
  const capped = truncateCodePoints(cleaned, DOC_SUMMARY_MAX_CODE_POINTS)
  if (capped.length === 0 || wouldCutToken(cleaned, capped)) return undefined
  const output = normalizeDocText(capped)
  if (output.length === 0 || looksSecret(output) || containsContactInfo(output)) return undefined
  return output
}

/** Strip bidi/C0/C1, zero-width and soft-hyphen characters, then NFKC-normalise. Applied before detection and to the output. */
export function normalizeDocText(text: string): string {
  const once = stripInvisible(stripControls(text)).normalize('NFKC')
  return stripInvisible(stripControls(once)).replace(/[<>]/g, '').replace(/\s+/g, ' ').trim()
}

function stripInvisible(text: string): string {
  return text.replace(ZERO_WIDTH_AND_SOFT_HYPHEN, '')
}

function containsContactInfo(text: string): boolean {
  if (EMAIL.test(text)) return true
  return PHONE.test(text)
}

function wouldCutToken(full: string, capped: string): boolean {
  if (capped === full) return false
  const remainder = full.slice(capped.length)
  if (remainder.length === 0) return false
  const last = lastCodePoint(capped)
  const next = firstCodePoint(remainder)
  if (last === undefined || next === undefined) return false
  return !isWhitespace(last) && !isWhitespace(next)
}

function lastCodePoint(text: string): string | undefined {
  const points = Array.from(text)
  return points[points.length - 1]
}

function firstCodePoint(text: string): string | undefined {
  return Array.from(text)[0]
}

function isWhitespace(char: string): boolean {
  return /\s/u.test(char)
}

function stripExampleBlocks(text: string): string {
  return text.replace(/(^|\n)\s*@example\b[\s\S]*?(?=(?:\n\s*@\w|$))/gi, '$1')
}

function firstSentence(text: string): string {
  for (let index = 0; index < text.length; index += 1) {
    const ch = text[index]
    if (ch === '\n' || ch === '\r') return text.slice(0, index)
    if ((ch === '.' || ch === '?' || ch === '!') && (index + 1 >= text.length || isSentenceSpace(text[index + 1] as string))) {
      return text.slice(0, index + 1)
    }
  }
  return text
}

function isSentenceSpace(ch: string): boolean {
  return ch === ' ' || ch === '\n' || ch === '\r' || ch === '\t'
}

/** Strip JSDoc/TSDoc or // decorations from a raw comment node text. */
export function unwrapComment(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed.startsWith('<!--') && trimmed.endsWith('-->')) {
    return trimmed.slice(4, trimmed.length - 3).trim()
  }
  if (trimmed.startsWith('/*')) {
    const body = trimmed.replace(/^\/\*\*?/, '').replace(/\*\/$/, '')
    return body.replace(/^\s*\*\s?/gm, '').trim()
  }
  if (trimmed.startsWith('//')) {
    return trimmed
      .split('\n')
      .map(line => line.replace(/^\s*\/\/\s?/, ''))
      .join('\n')
      .trim()
  }
  return trimmed
}
