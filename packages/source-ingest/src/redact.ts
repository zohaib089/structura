const TOKEN_PATTERNS: RegExp[] = [
  /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}\b/g,
  /\bglpat-[A-Za-z0-9_-]{10,}\b/g,
  /\bAuthorization:\s*(?:Bearer|Basic)\s+[A-Za-z0-9+/=_-]+\b/gi,
  /\b(?:x-access-token|oauth2):[A-Za-z0-9+/=_-]+@/gi,
  /https:\/\/(?:[^@\s/]+)@github\.com/gi,
  /https:\/\/(?:[^@\s/]+)@gitlab\.com/gi
]

export function redactSecrets(text: string): string {
  let output = text
  for (const pattern of TOKEN_PATTERNS) {
    output = output.replace(pattern, '[REDACTED]')
  }
  return output
}

export function redactKnownToken(text: string, token: string | undefined): string {
  if (!token || token.length < 4) return redactSecrets(text)
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return redactSecrets(text.replace(new RegExp(escaped, 'g'), '[REDACTED]'))
}
