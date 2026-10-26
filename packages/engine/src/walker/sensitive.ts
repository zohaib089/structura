/**
 * Names of files that commonly hold secrets. Matched on the base name before any open:
 * such files are never read, hashed, cached or parsed (`skipped: sensitive-file`).
 */
const EXACT = new Set(['.env', '.npmrc', '.pypirc', '.netrc', '.htpasswd', '.git-credentials', 'credentials', 'credentials.json', 'secrets.json', 'service-account.json'])
const PREFIXES = ['.env.', 'id_rsa', 'id_dsa', 'id_ecdsa', 'id_ed25519']
const SUFFIXES = ['.pem', '.key', '.p12', '.pfx', '.keystore', '.jks', '.ppk', '.kdbx']

export function isSensitiveFileName(name: string): boolean {
  const lower = name.toLowerCase()
  return EXACT.has(lower) || PREFIXES.some(prefix => lower.startsWith(prefix)) || SUFFIXES.some(suffix => lower.endsWith(suffix))
}
