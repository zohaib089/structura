# Landing and Authentication UI Update

**Date:** 2026-10-20

## Delivered

- Renamed `apps/web/src/components/sections/` to `apps/web/src/components/landing/` and updated the landing view imports to reflect the components' purpose.
- Migrated icon components to the maintained `@lucide/vue` package and replaced landing/auth decorative emoji and dots with consistent Lucide icons.
- Added viewport-triggered section/card entrance motion on the landing page, keeping the hero's existing animated system map and honoring `prefers-reduced-motion`.
- Refined the auth card with an animated glass surface, atmospheric background, icon-led feature list, clearer verification copy, and improved small-screen spacing.
- Added accessible per-password-field show/hide controls with Lucide icons; non-password fields do not show the control.
- Added a Vitest + Vue Test Utils suite for auth presentation and API client/session behavior.
- Added a Playwright Chromium suite for the landing anchor flow, signup card, password-reset form, and mobile horizontal overflow.
- Added strict type-checking for test sources and ignored generated Playwright output.

## Run the tests

```sh
npm --prefix apps/web run test:typecheck
npm --prefix apps/web run test:unit
npm --prefix apps/web run test:e2e
```

The Playwright E2E suite starts Vite on `http://127.0.0.1:4173`. Install the browser once with `npm --prefix apps/web exec playwright install chromium` when the Playwright Chromium binary is not present.

## Validation results

- Production build and strict test type-check passed.
- Unit suite: 7 tests passed across 3 test files.
- Chromium E2E suite: 4 scenarios passed.
- Frontend production dependency audit reported 0 vulnerabilities.
