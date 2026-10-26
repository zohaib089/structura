# Static graph viewer (V-01 / V-02)

**Date:** 2026-10-26

## Delivered

- Added `packages/brand` as the only product-name constant (`BRAND`). Viewer copy interpolates `{name}` and related tokens. The hosted app migrates `structura-theme`, `structura-locale`, and `structura-auth-session-v2` through `readMigrated`. The viewer persists nothing.
- Added a separate Vue 3 + Vue Flow viewer entry. It loads `graph.json` v1 from a file picker or a drop, parses in a worker, and draws an aggregated overview. Click selects a node. Enter or double-click expands or collapses it. A chevron button does the same.
- The reader keeps node kinds `directory`, `file`, `symbol`, `external`, and `unresolved` (unknown kinds stay generic). Edge types are `contains`, `imports`, and `reexports` (unknown types stay generic). The published engine schema omits `importKind` when it would be `static` and omits `typeOnly` unless it is `true`. The reader applies those defaults in memory and keeps `entryCandidate` on file nodes. Tool version, timestamps, and brand strings are not graph fields and are dropped. The viewer does not open sidecar run metadata.
- Viewer types are local to `apps/web` (TypeScript ~6). They are not imported from `packages/engine` (TypeScript ^7). Compared with the engine types, the viewer does not enforce the closed enums for language, symbolKind, parse reason, unresolved reason, or inferred reason. It does check `entryCandidate.reason`. It accepts unsorted nodes and edges. The engine canary `apps/web/fixtures/v1.0.0.graph.json` is copied from `packages/engine/schema-fixtures/v1.0.0.graph.json` and covered by a unit test.
- Shipped a single-file `dist-viewer/index.html` with a build-time CSP: hashed inline script and style, `worker-src blob:`, `connect-src 'none'`. No `?graph=` loading.
- Render caps: initial 300, 50 per expansion, hard cap 1000, with a "+N more" node. 150 nodes / 300 edges is the comfort setting (`COMFORT_NODE_BUDGET` / `COMFORT_EDGE_BUDGET`), not a hard rule. The product name and `atlasmith.yml` are confirmed; `structura.yml` is superseded.

## Not in this change

Design-token adoption, `BrandMark`, search, filters, focus, coverage, drift, and the landing-page rebuild are separate changes. The viewer does not upload or execute customer source.

## Run

```sh
npm --prefix apps/web run dev:viewer
npm --prefix apps/web run build:viewer
```

Open `apps/web/dist-viewer/index.html` via `file://`. Use the picker or drop a file. `?graph=` is unsupported.
