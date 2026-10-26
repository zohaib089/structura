/**
 * brand.ts - THE single source of truth for the product name.
 *
 * Confirmed name: "Atlasmith". Config file: atlasmith.yml.
 * The plan's structura.yml is superseded. To rename, change the values below and run
 * `grep -rniE "structura|atlasmith" apps packages docs` to catch anything that bypassed this file.
 * Copy that needs the name must use `{name}` interpolation from messages files; never hard-code it.
 *
 * Zero dependencies on purpose, so vite.config.ts, the CLI package and docs tooling can import it too.
 * Suggested location: packages/brand/src/brand.ts (shared by apps/web + packages/cli) or apps/web/src/brand.ts for now.
 */
export const BRAND = {
  /** Display name used in nav, titles, hero, footer. */
  name: 'Atlasmith',
  /** Lowercase wordmark as drawn in the logo (derived, do not hand-edit). */
  wordmark: 'atlasmith',
  /** Filesystem/URL/storage-key safe identifier. */
  slug: 'atlasmith',
  /** npm package + binary name that `npx` runs. Unverified on the registry at time of writing (plan says free). */
  cliName: 'atlasmith',
  /** Declared-architecture file. Confirmed; the plan's structura.yml is superseded. */
  configFile: 'atlasmith.yml',
  /** Engine output the viewer opens. Brand-neutral on purpose. */
  graphFile: 'graph.json',
  /** One-liner under the logo / meta description. Positioning is a hypothesis to test in interviews. */
  tagline: 'Your architecture, owned and verified.',
  /** Repository URL. The GitHub repo has not been renamed yet. */
  repoUrl: 'https://github.com/zohaib089/structura',
  domain: 'atlasmith.example',
  /** Previous name, used only for one-time migration of localStorage keys. */
  legacySlug: 'structura',
} as const

export type Brand = typeof BRAND

/** e.g. `npx atlasmith scan .` : hero CTA, README, docs. */
export const quickstartCommand = (sub = 'scan .') => `npx ${BRAND.cliName} ${sub}`

/** localStorage key helper: storageKey('theme') -> 'atlasmith-theme'. */
export const storageKey = (suffix: string) => `${BRAND.slug}-${suffix}`
/** Reads the new key, falls back to (and migrates) the legacy `structura-*` key so users keep theme/locale. */
export function readMigrated(suffix: string, storage: Storage = localStorage): string | null {
  const next = storage.getItem(storageKey(suffix))
  if (next !== null) return next
  const legacy = storage.getItem(`${BRAND.legacySlug}-${suffix}`)
  if (legacy !== null) { storage.setItem(storageKey(suffix), legacy); storage.removeItem(`${BRAND.legacySlug}-${suffix}`) }
  return legacy
}
/** document.title helper: pageTitle('Graph viewer') -> 'Graph viewer · Atlasmith'. */
export const pageTitle = (page?: string) => (page ? `${page} \u00b7 ${BRAND.name}` : `${BRAND.name} \u2013 ${BRAND.tagline}`)
