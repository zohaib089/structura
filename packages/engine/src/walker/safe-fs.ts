import { constants as fsConstants } from 'node:fs'
import { open, type FileHandle } from 'node:fs/promises'
import type { FailReason, SkipReason } from '../graph/types.js'

/** `O_NOFOLLOW` does not exist on Windows (value 0 there): TOCTOU protection is best effort on that platform. */
export const O_NOFOLLOW = fsConstants.O_NOFOLLOW ?? 0
const O_NONBLOCK = fsConstants.O_NONBLOCK ?? 0

export interface FileIdentity {
  dev: number
  ino: number
}

export type SafeReadResult =
  | { ok: true; content: Buffer }
  | { ok: false; status: 'skipped'; reason: SkipReason }
  | { ok: false; status: 'failed'; reason: FailReason }

const failure = (reason: FailReason): SafeReadResult => ({ ok: false, status: 'failed', reason })

/**
 * Reads a regular file without following a final-component symlink.
 *  1. `open(O_RDONLY | O_NOFOLLOW | O_NONBLOCK)`: a symlink swapped in after the walker's lstat fails with ELOOP.
 *  2. `fstat(fd)`: must be a regular file whose (dev, ino) equal the walker's lstat (else `changed-during-scan`).
 *  3. Reads from the descriptor only, never more than `maxBytes` (a file can grow after the stat).
 */
export async function readRegularFileSafely(absPath: string, expected: FileIdentity | undefined, maxBytes: number): Promise<SafeReadResult> {
  let handle: FileHandle | undefined
  try {
    handle = await open(absPath, fsConstants.O_RDONLY | O_NOFOLLOW | O_NONBLOCK)
    const stats = await handle.stat()
    if (!stats.isFile()) return { ok: false, status: 'skipped', reason: 'not-regular-file' }
    if (expected && (stats.dev !== expected.dev || stats.ino !== expected.ino)) return failure('changed-during-scan')
    if (stats.size > maxBytes) return { ok: false, status: 'skipped', reason: 'too-large' }
    const chunks: Buffer[] = []
    let total = 0
    for (;;) {
      const buffer = Buffer.allocUnsafe(Math.min(64 * 1024, maxBytes + 1 - total))
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, null)
      if (bytesRead === 0) break
      total += bytesRead
      if (total > maxBytes) return { ok: false, status: 'skipped', reason: 'too-large' }
      chunks.push(buffer.subarray(0, bytesRead))
    }
    return { ok: true, content: Buffer.concat(chunks, total) }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'ELOOP' || code === 'EMLINK') return failure('changed-during-scan')
    if (code === 'ENOENT' || code === 'ENOTDIR') return failure('vanished')
    if (code === 'EACCES' || code === 'EPERM') return failure('permission-denied')
    if (code === 'EBUSY' || code === 'ETXTBSY') return { ok: false, status: 'skipped', reason: 'locked' }
    return failure('read-error')
  } finally {
    await handle?.close().catch(() => undefined)
  }
}

/** Reads a small config/ignore file as text, or `undefined` when absent, a symlink, not regular, oversized or unreadable. */
export async function readConfigText(absPath: string, maxBytes: number): Promise<string | undefined> {
  const result = await readRegularFileSafely(absPath, undefined, maxBytes)
  return result.ok ? result.content.toString('utf8') : undefined
}
