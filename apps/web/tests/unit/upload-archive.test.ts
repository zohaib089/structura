import { describe, expect, it } from 'vitest'
import {
  DEFAULT_UPLOAD_ARCHIVE_MAX_BYTES,
  validateZipUpload
} from '../../src/services/upload-archive'

describe('validateZipUpload', () => {
  it('accepts a .zip within the size limit', () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'project.zip', {
      type: 'application/zip'
    })
    expect(validateZipUpload(file)).toBeNull()
  })

  it('rejects non-zip names, wrong mime types, and oversize archives', () => {
    expect(
      validateZipUpload(new File([new Uint8Array([1])], 'project.tar.gz', { type: 'application/gzip' }))
    ).toBe('invalid')
    expect(
      validateZipUpload(new File([new Uint8Array([1])], 'project.zip', { type: 'application/gzip' }))
    ).toBe('invalid')
    const big = new File([new Uint8Array(1)], 'big.zip', { type: 'application/zip' })
    Object.defineProperty(big, 'size', { value: DEFAULT_UPLOAD_ARCHIVE_MAX_BYTES + 1 })
    expect(validateZipUpload(big)).toBe('too-large')
  })
})
