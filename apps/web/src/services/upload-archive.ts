/** Matches `DEFAULT_SOURCE_INGEST_LIMITS.maxRepoBytes` / API `SCAN_MAX_REPO_BYTES` default. */
export const DEFAULT_UPLOAD_ARCHIVE_MAX_BYTES = 200 * 1024 * 1024

const ALLOWED_ZIP_MIME_TYPES = new Set([
  'application/zip',
  'application/x-zip-compressed',
  'application/x-zip'
])

export type ZipUploadValidationIssue = 'invalid' | 'too-large'

export function validateZipUpload(
  file: File,
  maxBytes = DEFAULT_UPLOAD_ARCHIVE_MAX_BYTES
): ZipUploadValidationIssue | null {
  const name = file.name.trim()
  if (!/\.zip$/i.test(name) || file.size < 1) return 'invalid'

  const mime = file.type.trim().toLowerCase()
  if (mime.length > 0 && !ALLOWED_ZIP_MIME_TYPES.has(mime)) return 'invalid'

  if (file.size > maxBytes) return 'too-large'
  return null
}
