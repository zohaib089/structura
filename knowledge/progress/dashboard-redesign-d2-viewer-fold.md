# Dashboard redesign D2 — fold viewer into Graph tab

**Status:** Done (PR D2)  
**Scope:** `fe-pr-plan.md` D2 only (overview layout retained; radial is D3).

## Already on main before D2 PR

- Scan report **Graph** tab and project `…/graph` route embed `ScanGraphView` → `ViewerApp` with API `getScanGraph`.
- `SeverityChip` on overview nodes (icon + count).
- Graph parse stays in a Web Worker (`parse-client` / worker bundle).
- Compose stack has no `:8080` viewer service.
- Cross-links use in-app routes (`graphHref` / `showInGraph`), not storage handoff.

## Completed in D2 PR

- Migrated viewer UI off blue `--color-accent-primary` (search highlight, drop zone, inferred edge stroke token).
- Embedded graph follows app shell theme via `shellTheme` prop from Pinia.
- Removed unused `dashboard-graph-messages` and `openInViewer` scan copy.
- README clarifies in-dashboard graph vs static `/viewer` build.
- Unit guard: viewer sources must not reference legacy accent/glow tokens.

## Deferred

- D3 radial layout, filter drawer defaults, full-screen chrome per mock `#graph`.
- D1 follow-up: global `--accent` blue still used outside graph surfaces.
