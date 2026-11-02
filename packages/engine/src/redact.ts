/**
 * Detects secret-shaped strings (used on import specifiers before anything is cached, logged or
 * persisted). Every pattern is linear-time (no nested quantifiers, bounded repeats) so a hostile
 * specifier cannot cause catastrophic backtracking; input length is capped before matching.
 */
export const REDACTED = '[redacted]'
const MAX_SCANNED_LENGTH = 4_096

const PATTERNS: readonly RegExp[] = [
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bASIA[0-9A-Z]{16}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{36,255}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{22,255}\b/,
  /\bxox[abprs]-[A-Za-z0-9-]{10,200}/,
  /-----BEGIN [A-Z ]{0,40}PRIVATE KEY-----/,
  /\beyJ[A-Za-z0-9_-]{10,2000}\.eyJ[A-Za-z0-9_-]{10,2000}\.[A-Za-z0-9_-]{0,2000}/,
  /\bsk-[A-Za-z0-9]{32,200}\b/,
  /\b[a-z][a-z0-9+.-]{1,20}:\/\/[^/\s:@]{1,100}:[^/\s@]{1,200}@/i
]

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
  // Long unbroken high-entropy token (API keys, base64 blobs). Real specifiers contain `/`, `.` or `@` structure.
  const token = /[A-Za-z0-9_-]{40,512}/.exec(scanned)
  return token !== null && shannonEntropy(token[0]) > 4.2
}
