export function jsonPointerToken(segment: string): string {
  return segment.replace(/~/g, '~0').replace(/\//g, '~1')
}

export function pointer(parts: (string | number)[]): string {
  return `/${parts.map((part) => jsonPointerToken(String(part))).join('/')}`
}
