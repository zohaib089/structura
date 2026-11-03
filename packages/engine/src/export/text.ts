/** Escape text for Mermaid quoted labels. */
export function mermaidLabel(text: string): string {
  return `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

/** Stable Mermaid node id from a logical key. */
export function mermaidId(key: string): string {
  const safe = key.replace(/[^a-zA-Z0-9_]/g, '_')
  return /^[a-zA-Z]/.test(safe) ? safe : `n_${safe}`
}

/** Escape for XML text nodes and attributes. */
export function xmlEscape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Structurizr / LikeC4 identifier from a module or file key. */
export function dslIdentifier(key: string): string {
  const safe = key.replace(/[^a-zA-Z0-9_]/g, '_')
  return /^[a-zA-Z]/.test(safe) ? safe : `id_${safe}`
}

/** Obsidian note slug (no extension). */
export function obsidianSlug(key: string): string {
  return key.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'note'
}

/** Obsidian wikilink target without extension. */
export function obsidianLink(slug: string): string {
  return `[[${slug}]]`
}
