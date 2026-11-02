/** Keep the start and the end of a path. The full string stays in the title. */
export function truncateMiddle(value: string, max = 28): string {
  const text = value.trim()
  if (text.length <= max) return text
  const mark = '…'
  const room = max - mark.length
  const head = Math.ceil(room / 2)
  const tail = Math.floor(room / 2)
  return `${text.slice(0, head)}${mark}${text.slice(text.length - tail)}`
}

export function highlightParts(label: string, query: string): { text: string; match: boolean }[] {
  const needle = query.trim()
  if (!needle) return [{ text: label, match: false }]
  const lower = label.toLowerCase()
  const target = needle.toLowerCase()
  const parts: { text: string; match: boolean }[] = []
  let cursor = 0
  let found = lower.indexOf(target, cursor)
  while (found !== -1) {
    if (found > cursor) parts.push({ text: label.slice(cursor, found), match: false })
    parts.push({ text: label.slice(found, found + needle.length), match: true })
    cursor = found + needle.length
    found = lower.indexOf(target, cursor)
  }
  if (cursor < label.length) parts.push({ text: label.slice(cursor), match: false })
  return parts.length > 0 ? parts : [{ text: label, match: false }]
}

export function formatByteSize(bytes: number, locale: string): string {
  const format = (value: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)
  if (bytes >= 1024 * 1024) return `${format(bytes / (1024 * 1024))} MB`
  if (bytes >= 1024) return `${format(bytes / 1024)} KB`
  return `${format(bytes)} B`
}
