# Decision 011: Product Localization and Language Support

**Date:** 2026-10-21  
**Status:** Product scope approved; translations and language-analysis capability are not yet implemented

## Decisions

1. Build Structura to support the following initial product locales using BCP 47 tags:
   - English (`en`)
   - Portuguese (`pt`)
   - Italian (`it`)
   - French (`fr`)
   - Dutch (`nl`)
   - Spanish (`es`)
   - Japanese (`ja`)
   - Simplified Chinese / Mandarin (`zh-Hans`)
   - Hindi (`hi`)
   - Urdu (`ur`, right-to-left)
2. Keep the locale catalog extensible. “All major languages” is a continuing product goal, not a finite or currently satisfied list; additions require explicit coverage and validation.
3. Localization scope includes the entire web UI, auth and product emails, errors/notifications, reports, findings/recommendations, exports, and applicable legal/privacy content.
4. Natural-language text in repository comments and documentation is in scope as a distinct capability with declared language-detection and analysis coverage. It does not imply programming-language parser support.
5. Preserve report evidence, severity, and confidence across locales. Localize presentation without changing the underlying finding.
6. Use human-reviewed translations. Legal, privacy, consent, retention, deletion, and jurisdiction-specific disclosures require qualified legal review; machine translation alone is not approval.
7. Test right-to-left layout for Urdu and CJK layout/wrapping for Japanese and Chinese. Keep source identifiers/code unchanged.

## Current implementation status

- Added versioned locale/content-surface metadata and explicit locale fallback behavior to the API contracts.
- Added tests for locale resolution, Simplified Chinese regional mapping, empty/unavailable fallback cases, and RTL metadata.
- Added web locale metadata, browser-language preference negotiation, locale-prefixed routes for landing/auth/dashboard, redirects from existing unprefixed URLs, and document `lang`/`dir` updates. Added a shared-navbar locale selector with native-language names and localized navigation labels in all ten initial locales; locale changes preserve the current route, query, and hash. Auth-flow navigation now uses the active locale directly instead of relying on a redirect from an unlocalized path.
- Added implementation guidance in the Product Localization skill and general coding principles.
- Added a typed dashboard catalog for all ten target locales covering workspace/project navigation, loading, empty, retry, forms, and fallback copy, with catalog-shape and Portuguese E2E tests. These tests establish structural/rendering coverage, not translation quality; catalog content still requires human review.
- Added typed catalogs for all ten target locales covering shared auth-shell promotional copy and login, signup, recovery/reset, email verification, OTP, and account-deletion screens, including local validation and accessible password-toggle labels. Catalog-shape tests plus Portuguese, Spanish, and Japanese browser checks verify rendering coverage, not linguistic quality.
- Locale-prefixed routes, direction metadata, the locale selector, and shared-navbar/dashboard/auth UI labels are implemented. Server-provided error messages, emails, reports, and repository prose remain mostly English or unlocalized. Catalog translations have not undergone qualified human review; no locale is yet a completed translated product experience.

## Consequences

- Add structured catalogs, completeness/review tracking, locale selection, formatting, and translation tests before claiming any locale is available.
- Track localization coverage per content surface and locale; a complete UI translation does not imply emails, reports, legal content, or repository prose are covered.
- Add languages beyond this initial set through catalog and quality gates rather than ad hoc strings.

## References

- [Product Localization skill](../skills/product-localization.md)
- [Product Vision and Implementation Roadmap](../strategy/product-vision-and-implementation-roadmap.md)
- [Phase 2 Analysis Platform Kickoff](../progress/phase-2-analysis-platform-kickoff.md)
- [Decision 010 — Source Retention and Global Residency Direction](./010-source-retention-and-global-residency.md)
