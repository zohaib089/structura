import { looksSecret } from '../redact.js'
import { stripControls, truncateCodePoints } from '../text/unicode.js'

export const DOC_SUMMARY_MAX_CODE_POINTS = 160

/** First sentence only, then strip controls, cap at 160 code points, omit if secret-shaped. */
export function sanitizeDocSummary(raw: string | null | undefined): string | undefined {
  if (raw === null || raw === undefined) return undefined
  const description = stripExampleBlocks(raw).trim()
  if (description.length === 0) return undefined
  const sentence = firstSentence(description)
  const cleaned = stripControls(sentence).replace(/[ \t]+/g, ' ').trim()
  if (cleaned.length === 0) return undefined
  const capped = truncateCodePoints(cleaned, DOC_SUMMARY_MAX_CODE_POINTS)
  if (capped.length === 0 || looksSecret(capped)) return undefined
  return capped
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
