/**
 * Detects secret-shaped strings (used on import specifiers before anything is cached, logged or
 * persisted, and on sanitised doc summaries). Every pattern is linear-time (no nested quantifiers,
 * bounded repeats) so a hostile specifier cannot cause catastrophic backtracking; input length is
 * capped before matching.
 */
export const REDACTED = '[redacted]'
const MAX_SCANNED_LENGTH = 4_096

const PATTERNS: readonly RegExp[] = [
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bASIA[0-9A-Z]{16}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{36,255}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{22,255}\b/,
  /\bgl(?:pat|dt|rt|oas|soat|ptt)-[A-Za-z0-9_-]{20,255}\b/,
  /\bxox[abprs]-[A-Za-z0-9-]{10,200}/,
  /-----BEGIN [A-Z ]{0,40}PRIVATE KEY-----/,
  /\beyJ[A-Za-z0-9_-]{10,2000}\.eyJ[A-Za-z0-9_-]{10,2000}\.[A-Za-z0-9_-]{0,2000}/,
  /\bsk-[A-Za-z0-9]{32,200}\b/,
  /\b[a-z][a-z0-9+.-]{1,20}:\/\/[^/\s:@]{1,100}:[^/\s@]{1,200}@/i
]

const CREDENTIAL_LABEL = /\b(?:password|passwd|pwd|secret|api[\s_-]?key|access[\s_-]?key|secret[\s_-]?key)\b\s*(?:is|:|=)\s*/gi
const TOKEN_LABEL = /\btoken\s*(?::|=)\s*/gi
const HIGH_ENTROPY_TOKEN = /[A-Za-z0-9_-]{40,512}/g
const BASE64ISH_RUN = /[A-Za-z0-9+/=]{40,512}/g

function shannonEntropy(text: string): number {
  const counts = new Map<string, number>()
  for (const char of text) counts.set(char, (counts.get(char) ?? 0) + 1)
  let entropy = 0
  for (const count of counts.values()) {
    const p = count / text.length
    entropy -= p * Math.log2(p)
  }
  return entropy
}

/** True when `text` looks like a credential. Deliberately conservative: package names and paths must not match. */
export function looksSecret(text: string): boolean {
  const scanned = text.length > MAX_SCANNED_LENGTH ? text.slice(0, MAX_SCANNED_LENGTH) : text
  if (PATTERNS.some(pattern => pattern.test(scanned))) return true
  // Long unbroken high-entropy token (API keys). Real specifiers contain `/`, `.` or `@` structure.
  HIGH_ENTROPY_TOKEN.lastIndex = 0
  const token = HIGH_ENTROPY_TOKEN.exec(scanned)
  if (token !== null && shannonEntropy(token[0]) > 4.2) return true
  if (looksLikeAwsOrBase64Blob(scanned)) return true
  return hasCredentialProse(scanned)
}

function looksLikeAwsOrBase64Blob(text: string): boolean {
  BASE64ISH_RUN.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = BASE64ISH_RUN.exec(text)) !== null) {
    const raw = match[0]
    const token = raw.replace(/=+$/, '')
    if (token.length < 40) {
      if (BASE64ISH_RUN.lastIndex === match.index) BASE64ISH_RUN.lastIndex += 1
      continue
    }
    const hasPlus = token.includes('+')
    const hasSlash = token.includes('/')
    if (!hasPlus && !hasSlash) {
      if (BASE64ISH_RUN.lastIndex === match.index) BASE64ISH_RUN.lastIndex += 1
      continue
    }
    // Paths have many slashes and no `+`. Allow at most two slashes unless `+` is present (base64).
    if (hasSlash && !hasPlus) {
      let slashes = 0
      for (const ch of token) if (ch === '/') slashes += 1
      if (slashes >= 3) {
        if (BASE64ISH_RUN.lastIndex === match.index) BASE64ISH_RUN.lastIndex += 1
        continue
      }
    }
    if (token.startsWith('/') || token.includes('@')) {
      if (BASE64ISH_RUN.lastIndex === match.index) BASE64ISH_RUN.lastIndex += 1
      continue
    }
    if (shannonEntropy(token) > 4.2) return true
    if (BASE64ISH_RUN.lastIndex === match.index) BASE64ISH_RUN.lastIndex += 1
  }
  return false
}

function hasCredentialProse(text: string): boolean {
  return matchLabelThenValue(CREDENTIAL_LABEL, text, 6) || matchLabelThenValue(TOKEN_LABEL, text, 12)
}

function matchLabelThenValue(pattern: RegExp, text: string, minUnquoted: number): boolean {
  pattern.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) !== null) {
    const rest = text.slice(match.index + match[0].length)
    if (valueLooksLikeCredential(rest, minUnquoted)) return true
    if (pattern.lastIndex === match.index) pattern.lastIndex += 1
  }
  return false
}

function valueLooksLikeCredential(rest: string, minUnquoted: number): boolean {
  const trimmed = rest.trimStart()
  if (trimmed.length === 0) return false
  const quote = trimmed[0]
  if (quote === '"' || quote === "'" || quote === '`') {
    const end = trimmed.indexOf(quote, 1)
    if (end === -1) return false
    return credentialValue(trimmed.slice(1, end), 8)
  }
  const unquoted = /^[A-Za-z0-9/_+=.-]{1,256}/.exec(trimmed)
  if (!unquoted) return false
  return credentialValue(unquoted[0], minUnquoted)
}

function credentialValue(value: string, minLength: number): boolean {
  if (value.length < minLength) return false
  if (/[0-9/_+=]/.test(value)) return true
  return value.length >= 16
}
