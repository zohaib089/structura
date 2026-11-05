import { BRAND } from '../../../packages/brand/src/brand'

/**
 * Landing link targets, in one place (design: landing-advanced.md §4).
 *
 * PLACEHOLDERS until the Designer confirms the real URLs:
 *  - viewer      -> the existing in-app sample viewer route (`/:locale/viewer`)
 *  - docs        -> the repository README
 *  - selfHost    -> the repository README (a dedicated self-host page is not published yet)
 * Components read these values and never hard-code a URL, so changing one is a one-line edit.
 * The GitHub repository has not been renamed yet; its URL comes from the brand module.
 */
export const LANDING_LINKS = {
  /** Locale-relative path, resolved with localizedPath(). */
  viewerPath: '/viewer',
  /** Locale-relative paths into the hosted app. */
  scanPath: '/w/pending/new',
  projectsPath: '/w/pending',
  docsUrl: `${BRAND.repoUrl}#readme`,
  selfHostDocsUrl: `${BRAND.repoUrl}#readme`,
  repoUrl: BRAND.repoUrl
} as const

export type LandingLinks = typeof LANDING_LINKS
