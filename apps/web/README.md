# Web app and static graph viewer

`apps/web` hosts two front ends:

- The existing hosted UI (`npm run dev`, `npm run build`) keeps landing, auth, and workspace routes.
- A separate static graph viewer (`npm run dev:viewer`, `npm run build:viewer`) opens a local `graph.json` in the browser. It does not call `/api` or `/health`, does not read `?graph=`, and does not persist anything.

## Graph viewer

```sh
npm --prefix apps/web run dev:viewer
npm --prefix apps/web run build:viewer
```

The production viewer is one file, `apps/web/dist-viewer/index.html`. Open that file with a `file://` URL. Load a graph with the file picker or by dropping a file on the window. The picker does not filter by extension, and a dropped file is parsed either way. `?graph=` and automatic `./graph.json` loading are unsupported: the shipped page sets `connect-src 'none'`.

The viewer entry is `viewer/index.html` and `src/viewer/`. The product name, wordmark, and config filename live only in `packages/brand/src/brand.ts` (`atlasmith.yml`; the older `structura.yml` name is superseded). The hosted app migrates legacy `structura-*` localStorage keys when it reads theme, locale, or the auth session. The viewer never touches storage.

Click a node to select it. Enter or a double-click expands or collapses a cluster. The shell follows the viewer spec: search, filters, focus, a coverage panel, a drift panel that stays "not configured" when the file has no findings, a legend, and a budget meter. Tokens live at the end of `src/styles/variables.css`. The shell shows `BrandMark` plus the live wordmark. Logo files are in `public/brand/`. Render caps live in `src/viewer/caps.ts`: 300 nodes on the first view, 50 per expansion, 1000 visible nodes and edges. `COMFORT_NODE_BUDGET` (150) and `COMFORT_EDGE_BUDGET` (300) are a recommended comfort setting, not the limit. The overview uses a "+N more" node and the budget meter uses the hard cap, warning at 80%.

`graph.json` is schema v1, checked against the engine canary `fixtures/v1.0.0.graph.json`. Import and reexport edges omit `importKind` when it is static and omit `typeOnly` unless it is true. The reader fills those defaults in memory. A file node may include `entryCandidate`. The file has no tool version, timestamps, or brand strings. The viewer does not read sidecar run metadata. Viewer types stay in `apps/web` (TypeScript 6) and are not imported from `packages/engine` (TypeScript 7).

Synthetic graphs:

```sh
node apps/web/tools/make-fixture.mjs 5000 /tmp/graph-5k.json
node apps/web/tools/make-fixture.mjs 50000 /tmp/graph-50k.json
```

Do not commit those files. A small sample is `apps/web/fixtures/sample-graph.json`.

## Hosted auth and dashboard

Login, signup, and the dashboard stay available by default so the current routes keep working. Set `VITE_HOSTED_APP=false` to hide those links and send `/auth` and `/dashboard` back to the landing page. That flag does not redesign either screen.

## Tests

```sh
npm --prefix apps/web run test:typecheck
npm --prefix apps/web run test:unit
npm --prefix apps/web run test:e2e
```

Playwright starts the hosted dev server for the existing UI tests and also opens the built viewer over `file://`. Install Chromium once with `npm --prefix apps/web exec playwright install chromium` when the browser binary is missing.
