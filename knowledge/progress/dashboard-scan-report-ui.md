# Dashboard scan report UI

## Summary

The Architecture scan hub adds a **Project report** view (alongside graph insights) for succeeded scans:

- Typed client for `GET /api/workspaces/:id/scans/:scanId/report` with the same bearer envelope as scans/graph, including 409 not-ready handling.
- Interactive folder/file tree with aggregated severity badges, optional hierarchy graph preview, detail panel, category tabs mapped to `report.json` v1, filters, client-side JSON/Markdown export of the filtered view, and a compact **Analysers** table (`ran` / `failed` / `timeout` / `skipped` with duration and reason).

Canonical JSON Schema: `packages/scan-analysis/schema/report.v1.schema.json` on main. Web types re-export `packages/scan-analysis/src/types.ts`; runtime parsing uses Ajv against the schema file.

## Gaps / notes

- History tab renders `history` payload tables; history-section **findings** render below when present.
- `report.json` v1 does not include per-analyser package versions; the UI shows run duration from `durationMs` instead.
