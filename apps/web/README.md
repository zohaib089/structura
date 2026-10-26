# Web app and static graph viewer

`apps/web` hosts two front ends:

- The existing hosted UI (`npm run dev`, `npm run build`) keeps landing, auth, and workspace routes. Those screens are unchanged in this pass.
- A separate static graph viewer (`npm run dev:viewer`, `npm run build:viewer`) opens a local `graph.json` in the browser. It does not call `/api` or `/health`, does not read `?graph=`, and does not persist anything.

## Graph viewer

```sh
npm --prefix apps/web run dev:viewer
npm --prefix apps/web run build:viewer
```

The production viewer is one file, `apps/web/dist-viewer/index.html`. Open that file with a `file://` URL. Load a graph with the file picker or by dropping a file on the window. A non-JSON extension is still parsed. `?graph=` and automatic `./graph.json` loading are unsupported: the shipped page sets `connect-src 'none'`.

The viewer entry is `viewer/index.html` and `src/viewer/`. The product name, wordmark, and config filename live only in `packages/brand/src/brand.ts` (`atlasmith.yml`; the older `structura.yml` name is superseded). The hosted app migrates legacy `structura-*` localStorage keys when it reads theme, locale, or the auth session. The viewer never touches storage.

Render caps live in `src/viewer/caps.ts`: 300 nodes on the first view, 50 per expansion, 1000 visible nodes and edges. `COMFORT_NODE_BUDGET` (150) and `COMFORT_EDGE_BUDGET` (300) are a recommended comfort setting, not the limit. The overview still uses a "+N more" node and a budget meter.

Synthetic graphs:

```sh
node apps/web/tools/make-fixture.mjs 5000 /tmp/graph-5k.json
node apps/web/tools/make-fixture.mjs 50000 /tmp/graph-50k.json
```

Do not commit those files. A small sample is `apps/web/fixtures/sample-graph.json`.

## Tests

```sh
npm --prefix apps/web run test:typecheck
npm --prefix apps/web run test:unit
npm --prefix apps/web run test:e2e
```

Playwright starts the hosted dev server for the existing UI tests and also opens the built viewer over `file://`. Install Chromium once with `npm --prefix apps/web exec playwright install chromium` when the browser binary is missing.
