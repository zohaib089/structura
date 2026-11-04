# Dashboard redesign PR4 — report graph tab, severity chips, URL state

**Status:** Implemented on branch `cursor/redesign-pr4-report-graph-5cb7`.

- Graph tab on the scan report embeds `ScanGraphView` (same scan, `?node=` focus).
- Scan graph route merged into `scan-report` with `:tab=graph` (removed standalone `scan-graph` route).
- Report filters and active tab sync to URL query (`sev`, `sec`, `path`, `node`); filter changes use `router.replace`.
- Tree rows use shared `SeverityChip` (icon + count); file rows show up to two severities plus overflow.
- Graph tab nodes (`OverviewNode`) show the same chips via `buildReportPathSeverityMap` / `lookupPathSeverityCounts`.
- Helpers: `scan-report-url-state.ts`, `scan-report-tree-display.ts`; Vitest coverage added.
