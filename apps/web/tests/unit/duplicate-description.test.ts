import { describe, expect, it } from 'vitest'
import { scanReportMessages } from '../../src/services/scan-report-messages'
import { duplicateGroupDescription } from '../../src/viewer/duplicates'

const en = scanReportMessages('en')
const fr = scanReportMessages('fr')

describe('duplicateGroupDescription', () => {
  it('renders two-file, one-file and many-file cases from structured counts', () => {
    const two = duplicateGroupDescription(
      {
        lineCount: 64,
        occurrences: [
          { path: 'a.ts', startLine: 1, endLine: 64 },
          { path: 'b.ts', startLine: 1, endLine: 64 }
        ],
        description: '64 identical lines in a.ts and b.ts'
      },
      fr
    )
    expect(two).toBe('64 lignes identiques dans a.ts et b.ts')

    const one = duplicateGroupDescription(
      {
        lineCount: 48,
        occurrences: Array.from({ length: 8 }, (_, i) => ({
          path: 'msg.ts',
          startLine: i * 10 + 1,
          endLine: i * 10 + 48
        })),
        description: '48 identical lines appear 8 times in msg.ts'
      },
      fr
    )
    expect(one).toBe('48 lignes identiques apparaissent 8 fois dans msg.ts')

    const many = duplicateGroupDescription(
      {
        lineCount: 12,
        occurrences: [
          { path: 'a.ts', startLine: 1, endLine: 12 },
          { path: 'b.ts', startLine: 1, endLine: 12 },
          { path: 'c.ts', startLine: 1, endLine: 12 }
        ],
        description: '12 identical lines in 3 files'
      },
      en
    )
    expect(many).toBe('12 identical lines in 3 files')
  })
})
