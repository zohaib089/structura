# Static graph viewer

**Date:** 2026-10-25

## Delivered

- Added `packages/brand` as the only product-name constant (`BRAND`). Viewer copy interpolates `{name}`. The hosted app migrates `structura-theme`, `structura-locale`, and `structura-auth-session-v2` through `readMigrated`. The viewer persists nothing.
- Appended the design tokens in `apps/web/src/styles/variables.css` without renaming the tokens that were already there. Added `BrandMark` and logo files under `apps/web/public/brand/`. The viewer shell uses the mark plus the live wordmark. Navbar, footer, and dashboard visuals are unchanged.
- Added a separate Vue 3 + Vue Flow viewer entry. It loads `graph.json` v1 from a file picker or a drop, parses in a worker, and draws an aggregated overview with expand, search, filters, focus, coverage, and a drift panel that stays "not configured" when the file has no drift findings.
- Shipped a single-file `dist-viewer/index.html` with a build-time CSP: hashed inline script and style, `worker-src blob:`, `connect-src 'none'`. No `?graph=` loading.
- Render caps default to the Tech Lead / QA numbers (initial 300, 50 per expansion, hard 1000). The designer's 150 / 300 budgets are named constants beside them and are not the runtime default. The budget meter uses the hard cap and warns at 80%.

## Not in this change

Landing-page rebuild and auth/dashboard visual changes (design adoption steps 5–7) are not started. The viewer does not upload or execute customer source.

## Validation

- `vue-tsc -b`, test typecheck, and the web unit suite passed (52 tests).
- Playwright Chromium passed the existing hosted UI suite and the `file://` viewer suite (sample expand, hostile label as text, CSP hashes).
- A 50,000-node fixture (98,993 edges, about 22 MB, not committed) reached `data-ready` in Chromium in about 2.1s with 300 visible nodes and 602 visible edges, matching the DOM counts. Node-side read plus overview was about 1.1s. This is not the 200,000-edge shape from the QA note.

## Run

```sh
npm --prefix apps/web run dev:viewer
npm --prefix apps/web run build:viewer
```

Open `apps/web/dist-viewer/index.html` via `file://`. Use the picker or drop a file. `?graph=` is unsupported.
